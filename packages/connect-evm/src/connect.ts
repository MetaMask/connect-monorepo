import type {
  MultichainCore,
  MultichainOptions,
  Scope,
  SessionData,
} from '@metamask/connect-multichain';
import { createMetamaskConnect } from '@metamask/connect-multichain';
// Use local helper to avoid pulling heavy controller packages into browser builds

import { IGNORED_METHODS, MAINNET_CHAIN_ID } from './constants';
import { EIP1193Provider } from './provider';
import type {
  AddEthereumChainParameter,
  Address,
  CaipAccountId,
  EventHandlers,
  Hex,
  MetamaskConnectEVMOptions,
  MinimalEventEmitter,
  ProviderRequest,
  ProviderRequestInterceptor,
} from './types';
import { getPermittedEthChainIds } from './utils/caip';
import { toHex, fromHex } from './utils/to-hex';
import {
  isAccountsRequest,
  isAddChainRequest,
  isConnectRequest,
  isSwitchChainRequest,
} from './utils/type-guards';

export class MetamaskConnectEVM {
  /** The core instance of the Multichain SDK */
  readonly #core: MultichainCore;

  /** An instance of the EIP-1193 provider interface */
  readonly #provider: EIP1193Provider;

  /** The session scopes currently permitted */
  #sessionScopes: SessionData['sessionScopes'] = {};

  /** Optional event handlers for the EIP-1193 provider events. */
  readonly #eventHandlers?: EventHandlers | undefined;

  /** The latest chain configuration received from a switchEthereumChain request */
  #latestChainConfiguration: AddEthereumChainParameter | undefined;

  /** The handler for the metamask-provider events */
  readonly #metamaskProviderHandler: (event: MessageEvent) => void;

  /** The handler for the wallet_sessionChanged event */
  readonly #sessionChangedHandler: (session?: SessionData) => void;

  constructor({ core, eventHandlers }: MetamaskConnectEVMOptions) {
    this.#core = core;
    this.#provider = new EIP1193Provider(
      core,
      this.#requestInterceptor.bind(this),
    );

    this.#eventHandlers = eventHandlers;

    /**
     * Sets up the handler for the wallet's internal EIP-1193 provider events.
     * Also handles switch chain failures.
     *
     * @param event - The event object
     */
    this.#metamaskProviderHandler = (event): void => {
      if (
        event?.data?.data?.name === 'metamask-provider' &&
        // TODO: (@wenfix): remove no-restricted-globals once we have a better way to do this
        // eslint-disable-next-line no-restricted-globals
        event.origin === location.origin
      ) {
        const data = event?.data?.data?.data;

        if (data?.method === 'metamask_accountsChanged') {
          const accounts = data?.params;
          this.#onAccountsChanged(accounts);
        }

        if (data?.method === 'metamask_chainChanged') {
          const chainId = Number(data?.params.chainId);
          this.#onChainChanged(chainId);
        }

        // This error occurs when a chain switch failed because
        // the target chain is not configured on the wallet.
        if (data?.error?.code === 4902) {
          this.#addEthereumChain();
        }
      }
    };

    /**
     * Handles the wallet_sessionChanged event.
     * Updates the internal connection state with the new session data.
     *
     * @param session - The session data
     */
    this.#sessionChangedHandler = (session): void => {
      this.#sessionScopes = session?.sessionScopes ?? {};
    };

    // eslint-disable-next-line no-restricted-globals
    window.addEventListener('message', this.#metamaskProviderHandler);

    this.#core.on(
      'wallet_sessionChanged',
      this.#sessionChangedHandler.bind(this),
    );
  }

  async connect(
    {
      chainId,
      account,
    }: {
      chainId?: number | undefined;
      account?: string | undefined;
    } = {}, // Default to mainnet if no chain ID is provided
  ): Promise<{ accounts: Address[]; chainId?: number }> {
    const caipChainId: Scope[] = chainId ? [`eip155:${chainId}`] : [];

    const caipAccountId: CaipAccountId[] =
      chainId && account ? [`eip155:${chainId}:${account}`] : [];

    await this.#core.connect(caipChainId, caipAccountId);

    this.#provider.selectedChainId = toHex(chainId ?? MAINNET_CHAIN_ID);

    this.#onConnect({ chainId: this.#provider.selectedChainId });

    return {
      accounts: this.accounts,
      chainId: fromHex(this.#provider.selectedChainId),
    };
  }

  async disconnect(): Promise<void> {
    await this.#core.disconnect();

    this.#onDisconnect();

    this.#clearConnectionState();

    // eslint-disable-next-line no-restricted-globals
    window.removeEventListener('message', this.#metamaskProviderHandler);

    this.#core.off('wallet_sessionChanged', this.#sessionChangedHandler);
  }

  /**
   * Switches the Ethereum chain. Will track state internally whenever possible.
   *
   * @param options - The options for the switch chain request
   * @param options.chainId - The chain ID to switch to
   * @param options.chainConfiguration - The chain configuration to use in case the chain is not present by the wallet
   */
  switchChain({
    chainId,
    chainConfiguration,
  }: {
    chainId: number | Hex;
    chainConfiguration?: AddEthereumChainParameter;
  }): void {
    const hexChainId = toHex(chainId);

    if (this.selectedChainId === hexChainId) {
      return;
    }

    // TODO: Check if approved scopes have the chain and early return
    const permittedChainIds = getPermittedEthChainIds(this.#sessionScopes);

    if (permittedChainIds.includes(hexChainId)) {
      this.#onChainChanged(hexChainId);
      return;
    }

    // Save the chain configuration for adding in case
    // the chain is not configured in the wallet.
    this.#latestChainConfiguration = chainConfiguration;

    this.#request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: toHex(chainId) }],
    });
  }

  /**
   * Terminates the connection to the wallet
   *
   * @deprecated Use disconnect() instead
   */
  async terminate(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Handles several EIP-1193 requests that require special handling
   * due the nature of the Multichain SDK.
   *
   * @param request - The request object containing the method and params
   * @returns The result of the request or undefined if the request is ignored
   */
  async #requestInterceptor(
    request: ProviderRequest,
  ): ReturnType<ProviderRequestInterceptor> {
    if (IGNORED_METHODS.includes(request.method)) {
      return Promise.reject(
        new Error(
          `Method: ${request.method} is not supported by Metamask Connect/EVM`,
        ),
      );
    }

    if (request.method === 'wallet_revokePermissions') {
      return this.disconnect();
    }

    if (isConnectRequest(request)) {
      return this.connect({
        chainId: request.params[0] ?? 1,
        account: request.params[1],
      });
    }

    if (isSwitchChainRequest(request)) {
      return this.switchChain({
        chainId: parseInt(request.params[0].chainId, 16),
      });
    }

    if (isAddChainRequest(request)) {
      return this.#addEthereumChain(request.params[0]);
    }

    if (isAccountsRequest(request)) {
      return this.accounts;
    }

    return Promise.resolve();
  }

  /**
   * Clears the internal connection state: accounts and chainId
   */
  #clearConnectionState(): void {
    this.#provider.accounts = [];
    this.#provider.selectedChainId = undefined as unknown as number;
  }

  /**
   * Adds an Ethereum chain using the latest chain configuration received from
   * a switchEthereumChain request
   *
   * @param chainConfiguration - The chain configuration to use in case the chain is not present by the wallet
   */
  #addEthereumChain(chainConfiguration?: AddEthereumChainParameter): void {
    const config = chainConfiguration ?? this.#latestChainConfiguration;

    if (!config) {
      throw new Error('No chain configuration found.');
    }

    this.#request({
      method: 'wallet_addEthereumChain',
      params: [config],
    });
  }

  /**
   * Submits a request to the EIP-1193 provider
   *
   * @param request - The request object containing the method and params
   * @param request.method - The method to request
   * @param request.params - The parameters to pass to the method
   */
  #request(request: { method: string; params: unknown[] }): void {
    // TODO: (@wenfix): use dedicated transports?
    // eslint-disable-next-line no-restricted-globals
    window.postMessage(
      {
        target: 'metamask-contentscript',
        data: {
          name: 'metamask-provider',
          data: request,
        },
      },
      // eslint-disable-next-line no-restricted-globals
      location.origin,
    );
  }

  #onChainChanged(chainId: Hex | number): void {
    const hexChainId = toHex(chainId);
    this.#provider.selectedChainId = chainId;
    this.#eventHandlers?.chainChanged?.(hexChainId);
    this.#provider.emit('chainChanged', hexChainId);
  }

  #onAccountsChanged(accounts: Address[]): void {
    this.#provider.accounts = accounts;
    this.#provider.emit('accountsChanged', accounts);
    this.#eventHandlers?.accountsChanged?.(accounts);
  }

  #onConnect({ chainId }: { chainId: Hex | number }): void {
    const data = {
      chainId: toHex(chainId),
    };

    this.#provider.emit('connect', data);
    this.#eventHandlers?.connect?.(data);

    this.#onChainChanged(chainId);
  }

  #onDisconnect(): void {
    this.#provider.emit('disconnect');
    this.#eventHandlers?.disconnect?.();

    this.#onAccountsChanged([]);
  }

  /**
   * Gets the EIP-1193 provider instance
   *
   * @returns The EIP-1193 provider instance
   */
  async getProvider(): Promise<EIP1193Provider> {
    return this.#provider;
  }

  /**
   * Gets the currently selected chain ID on the wallet
   *
   * @returns The currently selected chain ID or undefined if no chain is selected
   */
  getChainId(): Hex | undefined {
    return this.selectedChainId;
  }

  /**
   * Gets the currently selected account on the wallet
   *
   * @returns The currently selected account or undefined if no account is selected
   */
  getAccount(): Address | undefined {
    return this.#provider.selectedAccount;
  }

  // Convenience getters for the EIP-1193 provider
  /**
   * Gets the currently permitted accounts
   *
   * @returns The currently permitted accounts
   */
  get accounts(): Address[] {
    return this.#provider.accounts;
  }

  /**
   * Gets the currently selected account on the wallet
   *
   * @returns The currently selected account or undefined if no account is selected
   */
  get selectedAccount(): Address | undefined {
    return this.#provider.selectedAccount;
  }

  /**
   * Gets the currently selected chain ID on the wallet
   *
   * @returns The currently selected chain ID or undefined if no chain is selected
   */
  get selectedChainId(): Hex | undefined {
    return this.#provider.selectedChainId;
  }
}

/**
 *
 * @param options - The options for the Metamask Connect/EVM layer
 * @param options.eventEmitter - The event emitter to use for the Metamask Connect/EVM layer
 * @param options.eventHandlers - The event handlers to use for the Metamask Connect/EVM layer
 * @returns The Metamask Connect/EVM layer instance
 */
export async function createMetamaskConnectEVM(
  options: Pick<MultichainOptions, 'dapp'> & {
    eventEmitter?: MinimalEventEmitter;
    eventHandlers?: EventHandlers;
  },
): Promise<MetamaskConnectEVM> {
  try {
    const core = await createMetamaskConnect(options);
    return new MetamaskConnectEVM({
      core,
      eventHandlers: options.eventHandlers,
    });
  } catch (error) {
    console.error('Error creating Metamask Connect/EVM', error);
    throw error;
  }
}
