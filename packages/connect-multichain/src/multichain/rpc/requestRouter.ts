/* eslint-disable no-restricted-syntax -- Private class properties use established patterns */
/* eslint-disable @typescript-eslint/parameter-properties -- Constructor shorthand is intentional */
/* eslint-disable jsdoc/require-param-description -- Auto-generated JSDoc */
/* eslint-disable jsdoc/require-returns -- Auto-generated JSDoc */
/* eslint-disable @typescript-eslint/no-misused-promises -- setTimeout callback is async intentionally */
import { analytics } from '@metamask/analytics';
import type { SessionData } from '@metamask/multichain-api-client';
import type { Json } from '@metamask/utils';

import {
  METAMASK_CONNECT_BASE_URL,
  METAMASK_DEEPLINK_BASE,
} from '../../config';
import {
  EIP155_CAPABILITIES_SESSION_PROPERTY,
  type Eip155Capabilities,
  type Eip155ChainCapabilities,
  EIP1193_PASSTHROUGH_METHODS,
  type ExtendedTransport,
  type InvokeMethodOptions,
  isSecure,
  type MultichainOptions,
  RPC_HANDLED_METHODS,
  SDK_HANDLED_METHODS,
  TransportType,
} from '../../domain';
import { openDeeplink } from '../utils';
import {
  extractErrorDiagnostics,
  getWalletActionAnalyticsProperties,
  isRejectionError,
} from '../utils/analytics';
import type { RpcClient } from './handlers/rpcClient';
import { MissingRpcEndpointErr } from './handlers/rpcClient';
import { toRPCInvokeMethodErr } from './invocationError';

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
    // On the MWP (mobile deeplink) transport, try to resolve
    // `wallet_getCapabilities` from the cached session's `eip155Capabilities`
    // so we avoid an extra deeplink round-trip to the wallet. Falls back to the
    // wallet on any miss (older wallet, unknown address/chain, cache error).
    if (
      method === 'wallet_getCapabilities' &&
      this.transportType === TransportType.MWP
    ) {
      const localCapabilities = await this.#tryLocalCapabilities(options);
      if (localCapabilities !== undefined) {
        return localCapabilities;
      }
    }
    if (EIP1193_PASSTHROUGH_METHODS.has(method)) {
      return this.handleWithEip1193Passthrough(options);
    }
    if (RPC_HANDLED_METHODS.has(method)) {
      return this.handleWithRpcNode(options);
    }
    if (SDK_HANDLED_METHODS.has(method)) {
      return this.handleWithSdkState(options);
    }
    return this.handleWithWallet(options);
  }

  /**
   * Attempts to resolve `wallet_getCapabilities` from the cached session's
   * `eip155Capabilities` (published by the wallet in `sessionProperties`).
   *
   * The read uses the transport's cache-only `getCachedSession` accessor, so
   * a cache miss falls back to the wallet immediately instead of waiting on a
   * relay request that a backgrounded wallet may never answer. Returns
   * `undefined` (so the caller falls back to the wallet) when the data isn't
   * available for the requested address/chains, e.g. against a wallet that
   * predates capability publishing.
   *
   * @param options - The invoke method options for `wallet_getCapabilities`.
   * The `request.params` are `[address]` or `[address, chainIds]`.
   * @returns The resolved capabilities, or `undefined` on a cache miss.
   */
  async #tryLocalCapabilities(
    options: InvokeMethodOptions,
  ): Promise<Json | undefined> {
    const { params } = options.request;
    if (!Array.isArray(params)) {
      return undefined;
    }
    const [address, rawChainIds] = params as [unknown, unknown?];
    if (typeof address !== 'string' || address.length === 0) {
      return undefined;
    }
    // Malformed chain ids (non-array, or non-string entries): fall back so
    // the wallet answers with a proper invalid-params error instead of the
    // cache guessing (a non-array second param must NOT resolve to the full
    // cached capability map).
    if (
      rawChainIds !== undefined &&
      (!Array.isArray(rawChainIds) ||
        rawChainIds.some((chainId) => typeof chainId !== 'string'))
    ) {
      return undefined;
    }
    const requestedChainIds = rawChainIds as string[] | undefined;

    if (!this.transport.getCachedSession) {
      return undefined;
    }
    let sessionResult: SessionData | undefined;
    try {
      sessionResult = await this.transport.getCachedSession();
    } catch {
      return undefined;
    }

    const capabilitiesByAddress = sessionResult?.sessionProperties?.[
      EIP155_CAPABILITIES_SESSION_PROPERTY
    ] as Eip155Capabilities | undefined;
    if (!capabilitiesByAddress) {
      return undefined;
    }

    // The wallet keys `eip155Capabilities` by the caveat's address casing
    // (typically checksummed) while callers may pass any casing, so match
    // case-insensitively.
    const addressCapabilities = Object.entries(capabilitiesByAddress).find(
      ([cachedAddress]) =>
        cachedAddress.toLowerCase() === address.toLowerCase(),
    )?.[1];
    if (!addressCapabilities) {
      return undefined;
    }

    if (!requestedChainIds || requestedChainIds.length === 0) {
      return addressCapabilities as Json;
    }

    // If any requested chain isn't cached, fall back to the wallet rather than
    // returning a partial result. Key the result with the wallet's cached chain
    // ID casing (lowercase hex, as `wallet_getCapabilities` normalizes) rather
    // than the caller-supplied casing, so a local hit and the wallet-fallback
    // path return the same key shape.
    const filtered: Record<string, Eip155ChainCapabilities> = {};
    for (const chainId of requestedChainIds) {
      const chainEntry = Object.entries(addressCapabilities).find(
        ([cachedChainId]) =>
          cachedChainId.toLowerCase() === chainId.toLowerCase(),
      );
      if (!chainEntry) {
        return undefined;
      }
      filtered[chainEntry[0]] = chainEntry[1];
    }
    return filtered as Json;
  }

  /**
   * Forwards EIP-1193 / legacy provider methods (e.g. `wallet_addEthereumChain`,
   * `wallet_switchEthereumChain`, `eth_accounts`) directly to the underlying
   * transport's `sendEip1193Message`, bypassing the multichain
   * `wallet_invokeMethod` envelope. These methods are wallet-side concerns the
   * Multichain API does not model, so we forward the raw `{ method, params }`
   * payload and return the wallet's full JSON-RPC response envelope unchanged.
   *
   * Analytics tracking is intentionally skipped here: ecosystem clients
   * (e.g. `connect-evm`) emit their own `wallet_action_*` events around these
   * passthrough calls, and adding router-level tracking would double-count.
   *
   * @param options
   */
  private async handleWithEip1193Passthrough(
    options: InvokeMethodOptions,
  ): Promise<Json> {
    const response = await this.transport.sendEip1193Message({
      method: options.request.method,
      params: options.request.params,
    });
    // Note that this result object will not be in the same shape as the wallet's wallet_invokeMethod response envelope.
    // This is a purposeful deviation. EIP1193_PASSTHROUGH_METHODS are only meant to be called via the MultichainClient.invokeMethod()
    // by our connect-evm package. No other external callers should be calling these methods through this entry point. These methods should not be
    // documented as part of the MultichainClient.invokeMethod().
    return response.result as Json;
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
