/* eslint-disable no-restricted-syntax -- Private class properties use established patterns */
/* eslint-disable @typescript-eslint/parameter-properties -- Constructor shorthand is intentional */
/* eslint-disable jsdoc/require-jsdoc -- Internal helpers are self-descriptive */
/* eslint-disable jsdoc/require-param-description -- Auto-generated JSDoc */
/* eslint-disable jsdoc/require-returns -- Auto-generated JSDoc */
/* eslint-disable @typescript-eslint/no-misused-promises -- setTimeout callback is async intentionally */
import { analytics } from '@metamask/analytics';
import { isValidJson, type Json } from '@metamask/utils';

import {
  METAMASK_CONNECT_BASE_URL,
  METAMASK_DEEPLINK_BASE,
} from '../../config';
import {
  type ExtendedTransport,
  type InvokeMethodOptions,
  isSecure,
  type MultichainOptions,
  RPC_HANDLED_METHODS,
  RPCInvokeMethodErr,
  SDK_HANDLED_METHODS,
  type TransportType,
} from '../../domain';
import { openDeeplink } from '../utils';
import {
  extractErrorDiagnostics,
  getWalletActionAnalyticsProperties,
  isRejectionError,
} from '../utils/analytics';
import type { RpcClient } from './handlers/rpcClient';
import { MissingRpcEndpointErr } from './handlers/rpcClient';

let rpcId = 1;
const MAX_ERROR_CAUSE_DEPTH = 5;

type InvocationErrorDetails = {
  reason: string;
  rpcCode?: number;
  rpcMessage?: string;
  rpcData?: Json;
};

type CodedErrorDetails = {
  code: number;
  message?: string;
  data?: Json;
};

function getErrorObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function getNumericCode(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function getNonEmptyMessage(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getJsonData(value: unknown): Json | undefined {
  return value !== undefined && isValidJson(value) ? value : undefined;
}

function getFirstNonEmptyMessage(values: unknown[]): string | undefined {
  for (const value of values) {
    const message = getNonEmptyMessage(value);
    if (message !== undefined) {
      return message;
    }
  }
  return undefined;
}

function getFirstJsonData(values: unknown[]): Json | undefined {
  for (const value of values) {
    const data = getJsonData(value);
    if (data !== undefined) {
      return data;
    }
  }
  return undefined;
}

function getErrorObjectChain(
  errorObject: Record<string, unknown> | undefined,
): Record<string, unknown>[] {
  const chain: Record<string, unknown>[] = [];
  let currentObject = errorObject;

  for (
    let depth = 0;
    currentObject !== undefined && depth < MAX_ERROR_CAUSE_DEPTH;
    depth += 1
  ) {
    chain.push(currentObject);
    currentObject = getErrorObject(currentObject.cause);
  }

  return chain;
}

function getCodedErrorDetails(
  value: Record<string, unknown> | undefined,
): CodedErrorDetails | undefined {
  const code = getNumericCode(value?.code);
  if (code === undefined) {
    return undefined;
  }

  const message = getNonEmptyMessage(value?.message);
  const data = getJsonData(value?.data);
  return {
    code,
    ...(message === undefined ? {} : { message }),
    ...(data === undefined ? {} : { data }),
  };
}

/**
 * Extracts the public invocation error fields from either a JSON-RPC error
 * payload or a rejected Error-like value.
 *
 * @param error - Unknown error thrown or returned during method execution.
 * @returns Canonical fields for RPCInvokeMethodErr.
 */
function getInvocationErrorDetails(error: unknown): InvocationErrorDetails {
  const errorObject = getErrorObject(error);
  const errorObjectChain = getErrorObjectChain(errorObject);
  const primitiveMessage = getNonEmptyMessage(error);
  for (const [index, currentObject] of errorObjectChain.entries()) {
    const codedDetails = getCodedErrorDetails(currentObject);
    if (codedDetails) {
      const descendantObjects = errorObjectChain.slice(index + 1);
      const ancestorObjects = errorObjectChain.slice(0, index);
      const descendantMessage = getFirstNonEmptyMessage(
        descendantObjects.map((object) => object.message),
      );
      const ancestorMessage = getFirstNonEmptyMessage([
        primitiveMessage,
        ...ancestorObjects.map((object) => object.message),
      ]);
      const descendantData = getFirstJsonData(
        descendantObjects.map((object) => object.data),
      );
      const reason =
        codedDetails.message ??
        descendantMessage ??
        ancestorMessage ??
        'Unknown error';
      return {
        reason,
        rpcCode: codedDetails.code,
        rpcMessage: reason,
        ...(codedDetails.data === undefined && descendantData === undefined
          ? {}
          : { rpcData: codedDetails.data ?? descendantData }),
      };
    }
  }

  const reason =
    primitiveMessage ??
    getFirstNonEmptyMessage(errorObjectChain.map((object) => object.message)) ??
    'Unknown error';

  return {
    reason,
  };
}

/**
 * Normalizes unknown invocation errors to the router error type.
 *
 * @param error - Unknown error thrown or returned during method execution.
 * @returns Error instance surfaced by invokeMethod.
 */
function toRPCInvokeMethodErr(error: unknown): RPCInvokeMethodErr {
  if (error instanceof RPCInvokeMethodErr) {
    return error;
  }

  const { reason, rpcCode, rpcMessage, rpcData } =
    getInvocationErrorDetails(error);
  return new RPCInvokeMethodErr(reason, rpcCode, rpcMessage, rpcData);
}

/**
 * Gets the next RPC ID for request tracking.
 *
 * @returns The next unique RPC ID.
 */
export function getNextRpcId(): number {
  rpcId += 1;
  return rpcId;
}

export class RequestRouter {
  constructor(
    private readonly transport: ExtendedTransport,
    private readonly rpcClient: RpcClient,
    private readonly config: MultichainOptions,
    private readonly transportType: TransportType,
  ) {}

  /**
   * The main entry point for invoking an RPC method.
   * This method acts as a router, determining the correct handling strategy
   * for the request and delegating to the appropriate private handler.
   *
   * @param options
   */
  async invokeMethod(options: InvokeMethodOptions): Promise<Json> {
    const { method } = options.request;
    if (RPC_HANDLED_METHODS.has(method)) {
      return this.handleWithRpcNode(options);
    }
    if (SDK_HANDLED_METHODS.has(method)) {
      return this.handleWithSdkState(options);
    }
    return this.handleWithWallet(options);
  }

  /**
   * Forwards the request directly to the wallet via the transport.
   *
   * @param options
   */
  private async handleWithWallet(options: InvokeMethodOptions): Promise<Json> {
    return this.#withAnalyticsTracking(options, async () => {
      const request = this.transport.request({
        method: 'wallet_invokeMethod',
        params: options,
      });

      const { ui, mobile } = this.config;
      const { showInstallModal = false } = ui ?? {};
      const secure = isSecure();
      const shouldOpenDeeplink = secure && !showInstallModal;

      if (shouldOpenDeeplink) {
        setTimeout(async () => {
          const session = await this.transport.getActiveSession();
          if (!session) {
            throw new Error('No active session found');
          }

          const url = `${METAMASK_DEEPLINK_BASE}/mwp?id=${encodeURIComponent(session.id)}`;
          if (mobile?.preferredOpenLink) {
            mobile.preferredOpenLink(url, '_self');
          } else {
            openDeeplink(this.config, url, METAMASK_CONNECT_BASE_URL);
          }
        }, 10); // small delay to ensure the message encryption and dispatch completes
      }

      const response = await request;
      if (response.error) {
        throw toRPCInvokeMethodErr(response.error);
      }

      return response.result as Json;
    });
  }

  /**
   * Wraps execution with analytics tracking.
   *
   * @param options - The invoke method options
   * @param execute - The function to execute
   * @returns The result of the execution
   */
  async #withAnalyticsTracking(
    options: InvokeMethodOptions,
    execute: () => Promise<Json>,
  ): Promise<Json> {
    if (this.config.analytics?.enabled === false) {
      try {
        return await execute();
      } catch (error) {
        throw toRPCInvokeMethodErr(error);
      }
    }

    await this.#trackWalletActionRequested(options);

    try {
      const result = await execute();

      await this.#trackWalletActionSucceeded(options);

      return result;
    } catch (error) {
      const normalizedError = toRPCInvokeMethodErr(error);
      const analyticsError =
        normalizedError.rpcCode === undefined ? error : normalizedError;
      const isRejection = isRejectionError(analyticsError);

      if (isRejection) {
        await this.#trackWalletActionRejected(options);
      } else {
        await this.#trackWalletActionFailed(options, analyticsError);
      }
      throw normalizedError;
    }
  }

  /**
   * Tracks wallet action requested event.
   *
   * @param options
   */
  async #trackWalletActionRequested(
    options: InvokeMethodOptions,
  ): Promise<void> {
    const props = await getWalletActionAnalyticsProperties(
      this.config,
      this.config.storage,
      options,
      this.transportType,
    );
    analytics.track('mmconnect_wallet_action_requested', props);
  }

  /**
   * Tracks wallet action succeeded event.
   *
   * @param options
   */
  async #trackWalletActionSucceeded(
    options: InvokeMethodOptions,
  ): Promise<void> {
    const props = await getWalletActionAnalyticsProperties(
      this.config,
      this.config.storage,
      options,
      this.transportType,
    );
    analytics.track('mmconnect_wallet_action_succeeded', props);
  }

  /**
   * Tracks wallet action failed event.
   *
   * @param options - The invoke method options.
   * @param error - The error that caused the failure (used to classify the
   * `failure_reason` property on the event).
   */
  async #trackWalletActionFailed(
    options: InvokeMethodOptions,
    error: unknown,
  ): Promise<void> {
    const props = await getWalletActionAnalyticsProperties(
      this.config,
      this.config.storage,
      options,
      this.transportType,
      extractErrorDiagnostics(error),
    );
    analytics.track('mmconnect_wallet_action_failed', props);
  }

  /**
   * Tracks wallet action rejected event.
   *
   * @param options
   */
  async #trackWalletActionRejected(
    options: InvokeMethodOptions,
  ): Promise<void> {
    const props = await getWalletActionAnalyticsProperties(
      this.config,
      this.config.storage,
      options,
      this.transportType,
    );
    analytics.track('mmconnect_wallet_action_rejected', props);
  }

  /**
   * Routes the request to a configured RPC node.
   *
   * @param options
   */
  private async handleWithRpcNode(options: InvokeMethodOptions): Promise<Json> {
    try {
      return await this.rpcClient.request(options);
    } catch (error) {
      if (error instanceof MissingRpcEndpointErr) {
        return this.handleWithWallet(options);
      }
      throw error;
    }
  }

  /**
   * Responds directly from the SDK's session state.
   *
   * @param options
   */
  private async handleWithSdkState(
    options: InvokeMethodOptions,
  ): Promise<Json> {
    // TODO: to be implemented
    console.warn(
      `Method "${options.request.method}" is configured for SDK state handling, but this is not yet implemented. Falling back to wallet passthrough.`,
    );
    // Fallback to wallet
    return this.handleWithWallet(options);
  }
}
