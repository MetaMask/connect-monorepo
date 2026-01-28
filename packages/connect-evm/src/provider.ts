/* eslint-disable promise/always-return -- Legacy callback patterns */
/* eslint-disable promise/no-callback-in-promise -- Legacy sendAsync/send API */
/* eslint-disable consistent-return -- Legacy method returns void or Promise */
/* eslint-disable @typescript-eslint/no-floating-promises -- Legacy fire-and-forget pattern */
/* eslint-disable jsdoc/require-returns -- Inherited from abstract class */
import type { MultichainCore, Scope } from '@metamask/connect-multichain';
import { EventEmitter } from '@metamask/connect-multichain';
import { hexToNumber, numberToHex } from '@metamask/utils';

import { INTERCEPTABLE_METHODS } from './constants';
import { logger } from './logger';
import type {
  Address,
  EIP1193ProviderEvents,
  Hex,
  JsonRpcCallback,
  JsonRpcRequest,
  JsonRpcResponse,
  ProviderRequest,
  ProviderRequestInterceptor,
} from './types';

/**
 * EIP-1193 Provider wrapper around the Multichain SDK.
 */
export class EIP1193Provider extends EventEmitter<EIP1193ProviderEvents> {
  /** The core instance of the Multichain SDK */
  readonly #core: MultichainCore;

  /** Interceptor function to handle specific methods */
  readonly #requestInterceptor: ProviderRequestInterceptor;

  /** The currently permitted accounts */
  #accounts: Address[] = [];

  /** The currently selected chain ID on the wallet */
  #selectedChainId?: Hex | undefined;

  constructor(core: MultichainCore, interceptor: ProviderRequestInterceptor) {
    super();
    this.#core = core;
    this.#requestInterceptor = interceptor;

    // Bind all public methods to ensure `this` context is preserved
    // when methods are extracted or passed as callbacks.
    // This eliminates the need for Proxy wrappers in consumers.
    this.request = this.request.bind(this);
    this.sendAsync = this.sendAsync.bind(this);
    this.send = this.send.bind(this);

    // Bind inherited EventEmitter methods
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.emit = this.emit.bind(this);
    this.once = this.once.bind(this);
    this.removeListener = this.removeListener.bind(this);
    this.listenerCount = this.listenerCount.bind(this);
  }

  /**
   * Performs a EIP-1193 request.
   *
   * @param request - The request object containing the method and params
   * @returns The result of the request
   */
  async request(request: ProviderRequest): Promise<unknown> {
    logger(
      `request: ${request.method} - chainId: ${this.selectedChainId}`,
      request.params,
    );
    /* Some methods require special handling, so we intercept them here
     * and handle them in MetamaskConnectEVM.requestInterceptor method.  */
    if (INTERCEPTABLE_METHODS.includes(request.method)) {
      return this.#requestInterceptor?.(request);
    }

    if (!this.#selectedChainId) {
      // TODO: replace with a better error
      throw new Error('No chain ID selected');
    }

    const chainId = hexToNumber(this.#selectedChainId);
    const scope: Scope = `eip155:${chainId}`;

    // Validate that the chain is configured in supportedNetworks
    // This check is performed here to provide better error messages
    // The RpcClient will also validate, but this gives us a chance to provide
    // a clearer error message before the request is routed
    const coreOptions = (this.#core as any).options; // TODO: options is `protected readonly` property, this needs to be refactored so `any` type assertion is not necessary
    const supportedNetworks = coreOptions?.api?.supportedNetworks ?? {};
    if (!supportedNetworks[scope]) {
      throw new Error(
        `Chain ${scope} is not configured in supportedNetworks. Requests cannot be made to chains not explicitly configured in supportedNetworks.`,
      );
    }

    return this.#core.invokeMethod({
      scope,
      request: {
        method: request.method,
        params: request.params,
      },
    });
  }

  // Getters and setters
  public get selectedAccount(): Address | undefined {
    return this.accounts[0];
  }

  public set accounts(accounts: Address[]) {
    this.#accounts = accounts;
  }

  public get accounts(): Address[] {
    return this.#accounts;
  }

  public get selectedChainId(): Hex | undefined {
    return this.#selectedChainId;
  }

  public set selectedChainId(chainId: Hex | number | undefined) {
    const hexChainId =
      chainId && typeof chainId === 'number' ? numberToHex(chainId) : chainId;

    // Don't overwrite the selected chain ID with an undefined value
    if (!hexChainId) {
      return;
    }

    this.#selectedChainId = hexChainId as Hex;
  }

  // ==========================================
  // Legacy compatibility methods
  // ==========================================

  /**
   * Alias for selectedChainId for legacy compatibility.
   * Many dApps expect a `chainId` property on the provider.
   */
  public get chainId(): Hex | undefined {
    return this.selectedChainId;
  }

  /**
   * Legacy method for sending JSON-RPC requests.
   *
   * @deprecated Use `request` instead. This method is provided for backwards compatibility.
   * @param request - The JSON-RPC request object
   * @param callback - Optional callback function. If provided, the method returns void.
   * @returns A promise resolving to the JSON-RPC response, or void if a callback is provided.
   */
  async sendAsync<TParams = unknown, TResult = unknown>(
    request: JsonRpcRequest<TParams>,
    callback?: JsonRpcCallback<TResult>,
  ): Promise<JsonRpcResponse<TResult> | void> {
    const id = request.id ?? 1;

    const promise = this.request({
      method: request.method,
      params: request.params as unknown,
    })
      .then(
        (result): JsonRpcResponse<TResult> => ({
          id,
          jsonrpc: '2.0',
          result: result as TResult,
        }),
      )
      .catch(
        (error): JsonRpcResponse<TResult> => ({
          id,
          jsonrpc: '2.0',
          error: {
            code: error.code ?? -32603,
            message: error.message ?? 'Internal error',
            data: error.data,
          },
        }),
      );

    if (callback) {
      promise
        .then((response) => {
          if (response.error) {
            callback(new Error(response.error.message), response);
          } else {
            callback(null, response);
          }
        })
        .catch((error) => {
          callback(error, null);
        });
      return;
    }

    return promise;
  }

  /**
   * Legacy method for sending JSON-RPC requests synchronously (callback-based).
   *
   * @deprecated Use `request` instead. This method is provided for backwards compatibility.
   * @param request - The JSON-RPC request object
   * @param callback - The callback function to receive the response
   */
  send<TParams = unknown, TResult = unknown>(
    request: JsonRpcRequest<TParams>,
    callback: JsonRpcCallback<TResult>,
  ): void {
    this.sendAsync(request, callback);
  }
}
