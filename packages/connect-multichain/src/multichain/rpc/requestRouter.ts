/* eslint-disable no-restricted-syntax -- Private class properties use established patterns */
/* eslint-disable @typescript-eslint/parameter-properties -- Constructor shorthand is intentional */
/* eslint-disable jsdoc/require-param-description -- Auto-generated JSDoc */
/* eslint-disable jsdoc/require-returns -- Auto-generated JSDoc */
/* eslint-disable @typescript-eslint/no-misused-promises -- setTimeout callback is async intentionally */
import { analytics } from '@metamask/analytics';
import type { Json } from '@metamask/utils';

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
} from '../../domain';
import { openDeeplink } from '../utils';
import {
  getWalletActionAnalyticsProperties,
  isRejectionError,
} from '../utils/analytics';
import type { RpcClient } from './handlers/rpcClient';
import { MissingRpcEndpointErr } from './handlers/rpcClient';

let rpcId = 1;

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
        const { error } = response;
        throw new RPCInvokeMethodErr(
          `RPC Request failed with code ${error.code}: ${error.message}`,
        );
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
    await this.#trackWalletActionRequested(options);

    try {
      const result = await execute();

      await this.#trackWalletActionSucceeded(options);

      return result;
    } catch (error) {
      const isRejection = isRejectionError(error);

      if (isRejection) {
        await this.#trackWalletActionRejected(options);
      } else {
        await this.#trackWalletActionFailed(options);
      }
      if (error instanceof RPCInvokeMethodErr) {
        throw error;
      }
      throw new RPCInvokeMethodErr(error.message);
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
    );
    analytics.track('mmconnect_wallet_action_succeeded', props);
  }

  /**
   * Tracks wallet action failed event.
   *
   * @param options
   */
  async #trackWalletActionFailed(options: InvokeMethodOptions): Promise<void> {
    const props = await getWalletActionAnalyticsProperties(
      this.config,
      this.config.storage,
      options,
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
    );
    analytics.track('mmconnect_wallet_action_rejected', props);
  }

  /**
   * Routes the request to a configured RPC node.
   *
   * @param options
   */
  private async handleWithRpcNode(options: InvokeMethodOptions): Promise<Json> {
    return this.#withAnalyticsTracking(options, async () => {
      try {
        return await this.rpcClient.request(options);
      } catch (error) {
        if (error instanceof MissingRpcEndpointErr) {
          return this.handleWithWallet(options);
        }
        throw error;
      }
    });
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
