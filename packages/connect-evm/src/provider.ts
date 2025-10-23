import type { MultichainCore } from '@metamask/connect-multichain';
import { EventEmitter } from '@metamask/connect-multichain';

import { INTERCEPTABLE_METHODS } from './constants';
import type {
  EIP1193ProviderEvents,
  ProviderRequest,
  ProviderRequestInterceptor,
} from './types';

export const EIP155 = 'eip155';

/**
 * EIP-1193 Provider wrapper around the Multichain SDK.
 */
export class EIP1193Provider extends EventEmitter<EIP1193ProviderEvents> {
  /** The core instance of the Multichain SDK */
  readonly #core: MultichainCore;

  /** The currently selected chain ID on the wallet */
  public currentChainId?: number;

  /** Interceptor function to handle specific methods */
  readonly #requestInterceptor: ProviderRequestInterceptor;

  constructor(core: MultichainCore, interceptor: ProviderRequestInterceptor) {
    super();
    this.#core = core;
    this.#requestInterceptor = interceptor;
  }

  /**
   * Performs a EIP-1193 request.
   *
   * @param request - The request object containing the method and params
   * @returns The result of the request
   */
  async request(request: ProviderRequest): Promise<unknown> {
    /* Some methods require special handling, so we intercept them here
     * and handle them in MetamaskConnectEVM.requestInterceptor method.  */
    if (INTERCEPTABLE_METHODS.includes(request.method)) {
      return this.#requestInterceptor?.(request);
    }

    const _chainId = request.chainId ?? this.currentChainId;

    return this.#core.invokeMethod({
      scope: `${EIP155}:${_chainId}`,
      request: {
        method: request.method,
        params: request.params,
      },
    });
  }
}
