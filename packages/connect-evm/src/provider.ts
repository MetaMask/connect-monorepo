import type { MultichainCore } from '@metamask/connect-multichain';
import { EventEmitter } from '@metamask/connect-multichain';

import { INTERCEPTABLE_METHODS } from './constants';
import type {
  Address,
  EIP1193ProviderEvents,
  Hex,
  ProviderRequest,
  ProviderRequestInterceptor,
} from './types';
import { toHex } from './utils/to-hex';

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

    return this.#core.invokeMethod({
      scope: `eip155:${this.selectedChainId}`,
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
      chainId && typeof chainId === 'number' ? toHex(chainId) : chainId;

    // Don't overwrite the selected chain ID with an undefined value
    if (!hexChainId) {
      return;
    }

    this.#selectedChainId = hexChainId as Hex;
  }
}
