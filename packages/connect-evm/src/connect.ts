import type { Caip25CaveatValue } from '@metamask/chain-agnostic-permission';
import type {
  MultichainCore,
  MultichainOptions,
  Scope,
  SessionData,
} from '@metamask/connect-multichain';
import { createMetamaskConnect } from '@metamask/connect-multichain';
import {
  numberToHex,
  hexToNumber,
  isHexString as isHex,
} from '@metamask/utils';

import { IGNORED_METHODS } from './constants';
import { logger } from './logger';
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
import {
  isAccountsRequest,
  isAddChainRequest,
  isConnectRequest,
  isSwitchChainRequest,
  validSupportedChainsUrls,
} from './utils/type-guards';

/**
 * The MetamaskConnectEVM class provides an EIP-1193 compatible interface for connecting
 * to MetaMask and interacting with Ethereum Virtual Machine (EVM) networks.
 *
 * This class serves as a modern replacement for MetaMask SDK V1, offering enhanced
 * functionality and cross-platform compatibility. It wraps the Multichain SDK to provide
 * a simplified, EIP-1193 compliant API for dapp developers.
 *
 * Key features:
 * - EIP-1193 provider interface for seamless integration with existing dapp code
 * - Automatic session recovery when reloading or opening in new tabs
 * - Chain switching with automatic chain addition if not configured
 * - Event-driven architecture with support for connect, disconnect, accountsChanged, and chainChanged events
 * - Cross-platform support for browser extensions and mobile applications
 * - Built-in handling of common Ethereum methods (eth_accounts, wallet_switchEthereumChain, etc.)
 *
 * @example
 * ```typescript
 * const sdk = await createMetamaskConnectEVM({
 *   dapp: { name: 'My DApp', url: 'https://mydapp.com' }
 * });
 *
 * await sdk.connect({ chainId: 1 });
 * const provider = await sdk.getProvider();
 * const accounts = await provider.request({ method: 'eth_accounts' });
 * ```
 */
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

  /** The handler for the wallet_sessionChanged event */
  readonly #sessionChangedHandler: (session?: SessionData) => void;

  /**
   * Creates a new MetamaskConnectEVM instance.
   *
   * @param options - The options for the MetamaskConnectEVM instance
   * @param options.core - The core instance of the Multichain SDK
   * @param options.eventHandlers - Optional event handlers for EIP-1193 provider events
   */
  constructor({ core, eventHandlers }: MetamaskConnectEVMOptions) {
    this.#core = core;

    this.#provider = new EIP1193Provider(
      core,
      this.#requestInterceptor.bind(this),
    );

    this.#eventHandlers = eventHandlers;

    /**
     * Handles the wallet_sessionChanged event.
     * Updates the internal connection state with the new session data.
     *
     * @param session - The session data
     */
    this.#sessionChangedHandler = (session): void => {
      logger('event: wallet_sessionChanged', session);
      this.#sessionScopes = session?.sessionScopes ?? {};
    };

    // eslint-disable-next-line no-restricted-globals
    // window.addEventListener('message', this.#metamaskProviderHandler);

    this.#core.on(
      'wallet_sessionChanged',
      this.#sessionChangedHandler.bind(this),
    );

    // Attempt to set the permitted accounts if there's a valid previous session.
    // TODO (wenfix): does it make sense to catch here?
    this.#attemptSessionRecovery().catch((error) => {
      console.error('Error attempting session recovery', error);
    });

    logger('Connect/EVM constructor completed');
  }

  /**
   * Connects to the wallet with the specified chain ID and optional account.
   *
   * @param options - The connection options
   * @param options.chainId - The chain ID to connect to (defaults to 1 for mainnet)
   * @param options.account - Optional specific account to connect to
   * @returns A promise that resolves with the connected accounts and chain ID
   */
  async connect(
    {
      chainId,
      account,
    }: {
      chainId: number;
      account?: string | undefined;
    } = { chainId: 1 }, // Default to mainnet if no chain ID is provided
  ): Promise<{ accounts: Address[]; chainId?: number }> {
    logger('request: connect', { chainId, account });
    const caipChainId: Scope[] = chainId ? [`eip155:${chainId}`] : [];

    const caipAccountId: CaipAccountId[] =
      chainId && account ? [`eip155:${chainId}:${account}`] : [];

    await this.#core.connect(caipChainId, caipAccountId);

    const hexPermittedChainIds = getPermittedEthChainIds(this.#sessionScopes);
    const initialChainId = hexPermittedChainIds[0];

    const initialAccounts = await this.#core.transport.sendEip1193Message<
      { method: 'eth_accounts'; params: [] },
      { result: string[]; id: number; jsonrpc: '2.0' }
    >({ method: 'eth_accounts', params: [] });

    this.#onConnect({
      chainId: initialChainId,
      accounts: initialAccounts.result as Address[],
    });

    this.#onAccountsChanged(initialAccounts.result as Address[]);

    this.#core.transport.onNotification((notification) => {
      console.log('notification in onNotification', notification);
      // @ts-expect-error TODO: address this
      if (notification?.method === 'metamask_accountsChanged') {
        // @ts-expect-error TODO: address this
        const accounts = notification?.params;
        logger('transport-event: accountsChanged', accounts);
        this.#onAccountsChanged(accounts);
      }

      // @ts-expect-error TODO: address this
      if (notification?.method === 'metamask_chainChanged') {
        // @ts-expect-error TODO: address this
        const notificationChainId = Number(notification?.params?.chainId);
        logger('transport-event: chainChanged', notificationChainId);
        this.#onChainChanged(notificationChainId);
      }

      // // This error occurs when a chain switch failed because
      //   // the target chain is not configured on the wallet.
      //   if (notification?.error?.code === 4902) {
      //     logger(
      //       'chain switch failed, adding chain',
      //       this.#latestChainConfiguration,
      //     );
      //     this.#addEthereumChain();
      //   }
    });

    logger('fulfilled-request: connect', { chainId, account });
    // TODO: update required here since accounts and chainId are now promises
    return {
      accounts: this.#provider.accounts,
      chainId: hexToNumber(initialChainId),
    };
  }

  /**
   * Connects to the wallet and signs a message using personal_sign.
   *
   * @param message - The message to sign
   * @returns A promise that resolves with the signature
   * @throws Error if the selected account is not available after timeout
   */
  async connectAndSign(message: string): Promise<string> {
    await this.connect();

    // If account is already available, proceed immediately
    if (this.#provider.selectedAccount) {
      return (await this.#provider.request({
        method: 'personal_sign',
        params: [this.#provider.selectedAccount, message],
      })) as string;
    }

    // Otherwise, wait for the accountsChanged event to be triggered
    const timeout = 5000;
    const accountPromise = new Promise<Address>((resolve, reject) => {
      // eslint-disable-next-line prefer-const
      let timeoutId: ReturnType<typeof setTimeout>;

      const handler = (accounts: Address[]): void => {
        if (accounts.length > 0) {
          clearTimeout(timeoutId);
          this.#provider.off('accountsChanged', handler);
          resolve(accounts[0]);
        }
      };

      this.#provider.on('accountsChanged', handler);

      timeoutId = setTimeout(() => {
        this.#provider.off('accountsChanged', handler);
        reject(new Error('Selected account not available after timeout'));
      }, timeout);

      if (this.#provider.selectedAccount) {
        clearTimeout(timeoutId);
        this.#provider.off('accountsChanged', handler);
        resolve(this.#provider.selectedAccount);
      }
    });

    const selectedAccount = await accountPromise;

    return (await this.#provider.request({
      method: 'personal_sign',
      params: [selectedAccount, message],
    })) as string;
  }

  /**
   * Disconnects from the wallet by revoking the session and cleaning up event listeners.
   *
   * @returns A promise that resolves when disconnection is complete
   */
  async disconnect(): Promise<void> {
    logger('request: disconnect');

    await this.#core.disconnect();
    this.#onDisconnect();
    this.#clearConnectionState();

    this.#core.off('wallet_sessionChanged', this.#sessionChangedHandler);

    // Need to disconnect chain as well?
    // onDisconnect is called twice in this method
    this.#onDisconnect();

    logger('fulfilled-request: disconnect');
  }

  /**
   * Switches the Ethereum chain. Will track state internally whenever possible.
   *
   * @param options - The options for the switch chain request
   * @param options.chainId - The chain ID to switch to
   * @param options.chainConfiguration - The chain configuration to use in case the chain is not present by the wallet
   * @returns The result of the switch chain request
   */
  async switchChain({
    chainId,
    chainConfiguration,
  }: {
    chainId: number | Hex;
    chainConfiguration?: AddEthereumChainParameter;
  }): Promise<unknown> {
    const hexChainId = isHex(chainId) ? chainId : numberToHex(chainId);

    // TODO (wenfix): better way to return here other than resolving.
    if (this.selectedChainId === hexChainId) {
      return Promise.resolve();
    }

    // TODO: Check if approved scopes have the chain and early return
    const permittedChainIds = getPermittedEthChainIds(this.#sessionScopes);

    if (permittedChainIds.includes(hexChainId)) {
      this.#onChainChanged(hexChainId);
      return Promise.resolve();
    }

    // Save the chain configuration for adding in case
    // the chain is not configured in the wallet.
    this.#latestChainConfiguration = chainConfiguration;

    return this.#request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
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
    logger(`Intercepting request for method: ${request.method}`);

    if (IGNORED_METHODS.includes(request.method)) {
      // TODO: replace with correct method unsupported provider error
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
      console.log('request in requestInterceptor', request);
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
      return this.#provider.accounts;
    }

    logger('Request not intercepted, forwarding to default handler', request);
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
    logger('addEthereumChain called', { chainConfiguration });
    const config = chainConfiguration ?? this.#latestChainConfiguration;

    if (!config) {
      throw new Error('No chain configuration found.');
    }

    this.#request({
      method: 'wallet_addEthereumChain',
      params: [config],
    }).catch((error) => {
      // TODO (wenfix): does it make sense to throw here?
      console.error('Error adding Ethereum chain', error);
      throw error;
    });
  }

  /**
   * Submits a request to the EIP-1193 provider
   *
   * @param request - The request object containing the method and params
   * @param request.method - The method to request
   * @param request.params - The parameters to pass to the method
   * @returns The result of the request
   */
  async #request(request: {
    method: string;
    params: unknown[];
  }): Promise<unknown> {
    logger('direct request to metamask-provider called', request);
    const result = this.#core.transport.sendEip1193Message(request);
    if (
      request.method === 'wallet_addEthereumChain' ||
      request.method === 'wallet_switchEthereumChain'
    ) {
      this.#core.openDeeplinkIfNeeded();
    }
    return result;
  }

  /**
   * Handles chain change events and updates the provider's selected chain ID.
   *
   * @param chainId - The new chain ID (can be hex string or number)
   */
  #onChainChanged(chainId: Hex | number): void {
    logger('handler: chainChanged', { chainId });
    const hexChainId = isHex(chainId) ? chainId : numberToHex(chainId);
    this.#provider.selectedChainId = chainId;
    this.#eventHandlers?.chainChanged?.(hexChainId);
    this.#provider.emit('chainChanged', hexChainId);
  }

  /**
   * Handles accounts change events and updates the provider's accounts list.
   *
   * @param accounts - The new list of permitted accounts
   */
  #onAccountsChanged(accounts: Address[]): void {
    logger('handler: accountsChanged', accounts);
    this.#provider.accounts = accounts;
    this.#provider.emit('accountsChanged', accounts);
    this.#eventHandlers?.accountsChanged?.(accounts);
  }

  /**
   * Handles connection events and emits the connect event to listeners.
   *
   * @param options - The connection options
   * @param options.chainId - The chain ID of the connection (can be hex string or number)
   * @param options.accounts - The accounts of the connection
   */
  #onConnect({
    chainId,
    accounts,
  }: {
    chainId: Hex | number;
    accounts: Address[];
  }): void {
    logger('handler: connect', { chainId });
    const data = {
      chainId: isHex(chainId) ? chainId : numberToHex(chainId),
      accounts,
    };

    this.#provider.emit('connect', data);
    this.#eventHandlers?.connect?.(data);

    this.#onChainChanged(chainId);
    this.#onAccountsChanged(accounts);
  }

  /**
   * Handles disconnection events and emits the disconnect event to listeners.
   * Also clears accounts by triggering an accountsChanged event with an empty array.
   */
  #onDisconnect(): void {
    logger('handler: disconnect');
    this.#provider.emit('disconnect');
    this.#eventHandlers?.disconnect?.();

    this.#onAccountsChanged([]);
  }

  /**
   * Will trigger an accountsChanged event if there's a valid previous session.
   * This is needed because the accountsChanged event is not triggered when
   * revising, reloading or opening the app in a new tab.
   *
   * This works by checking by checking events received during MultichainCore initialization,
   * and if there's a wallet_sessionChanged event, it will add a 1-time listener for eth_accounts results
   * and trigger an accountsChanged event if the results are valid accounts.
   */
  async #attemptSessionRecovery(): Promise<void> {
    try {
      const response = await this.#core.transport.request<
        { method: 'wallet_getSession' },
        {
          result: { sessionScopes: Caip25CaveatValue };
          id: number;
          jsonrpc: '2.0';
        }
      >({
        method: 'wallet_getSession',
      });

      const { sessionScopes } = response.result;

      this.#sessionScopes = sessionScopes;
      const permittedChainIds = getPermittedEthChainIds(sessionScopes);

      // Instead of using the accounts we get back from calling `wallet_getSession`
      // we get permitted accounts from `eth_accounts` to make sure we have them ordered by last selected account
      // and correctly set the currently selected account for the dapp
      const permittedAccounts = await this.#core.transport.sendEip1193Message({
        method: 'eth_accounts',
        params: [],
      });

      if (permittedChainIds.length && permittedAccounts.result) {
        this.#onConnect({
          chainId: permittedChainIds[0],
          accounts: permittedAccounts.result as Address[],
        });
      }
    } catch (error) {
      console.error('Error attempting session recovery', error);
    }
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

  /**
   * Checks if a message event is from the MetaMask provider.
   *
   * @param event - The message event to check
   * @returns True if the event is from the MetaMask provider, false otherwise
   */
  #isMetamaskProviderEvent(event: MessageEvent): boolean {
    return (
      event?.data?.data?.name === 'metamask-provider' &&
      // TODO: (@wenfix): remove no-restricted-globals once we have a better way to do this
      // eslint-disable-next-line no-restricted-globals
      event.origin === location.origin
    );
  }
}

/**
 * Creates a new Metamask Connect/EVM instance
 *
 * @param options - The options for the Metamask Connect/EVM layer
 * @param options.dapp - Dapp identification and branding settings
 * @param options.api - API configuration including read-only RPC map
 * @param options.api.supportedNetworks - A map of CAIP chain IDs to RPC URLs for read-only requests
 * @param options.eventEmitter - The event emitter to use for the Metamask Connect/EVM layer
 * @param options.eventHandlers - The event handlers to use for the Metamask Connect/EVM layer
 * @returns The Metamask Connect/EVM layer instance
 */
export async function createMetamaskConnectEVM(
  options: Pick<MultichainOptions, 'dapp' | 'api'> & {
    eventEmitter?: MinimalEventEmitter;
    eventHandlers?: EventHandlers;
  },
): Promise<MetamaskConnectEVM> {
  logger('Creating Metamask Connect/EVM with options:', options);

  // Validate that supportedNetworks is provided and not empty
  if (
    !options.api?.supportedNetworks ||
    Object.keys(options.api.supportedNetworks).length === 0
  ) {
    throw new Error(
      'supportedNetworks is required and must contain at least one chain configuration',
    );
  }

  validSupportedChainsUrls(options.api.supportedNetworks, 'supportedNetworks');

  try {
    const core = await createMetamaskConnect({
      ...options,
      api: {
        supportedNetworks: options.api.supportedNetworks,
      },
    });

    return new MetamaskConnectEVM({
      core,
      eventHandlers: options.eventHandlers,
      supportedNetworks: options.api.supportedNetworks,
    });
  } catch (error) {
    console.error('Error creating Metamask Connect/EVM', error);
    throw error;
  }
}
