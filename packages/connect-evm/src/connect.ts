/* eslint-disable no-restricted-syntax -- Private class properties use established patterns */
import { analytics } from '@metamask/analytics';
import { parseScopeString } from '@metamask/chain-agnostic-permission';
import type {
  ConnectionStatus,
  MultichainCore,
  MultichainOptions,
  Scope,
  SessionData,
} from '@metamask/connect-multichain';
import {
  createMultichainClient,
  getWalletActionAnalyticsProperties,
  isRejectionError,
  TransportType,
} from '@metamask/connect-multichain';
import { hexToNumber } from '@metamask/utils';

import { IGNORED_METHODS } from './constants';
import { enableDebug, logger } from './logger';
import { EIP1193Provider } from './provider';
import type {
  AddEthereumChainParameter,
  Address,
  CaipAccountId,
  EventHandlers,
  Hex,
  MetamaskConnectEVMOptions,
  ProviderRequest,
  ProviderRequestInterceptor,
} from './types';
import { getEthAccounts, getPermittedEthChainIds } from './utils/caip';
import {
  isAccountsRequest,
  isAddChainRequest,
  isChainIdRequest,
  isConnectRequest,
  isSwitchChainRequest,
  validSupportedChainsUrls,
} from './utils/type-guards';

const DEFAULT_CHAIN_ID = '0x1';
const CHAIN_STORE_KEY = 'cache_eth_chainId';

/** The options for the connect method */
type ConnectOptions = {
  /** The account to connect to */
  account?: string | undefined;
  /** Whether to force a request regardless of an existing session */
  forceRequest?: boolean;
  /** All available chain IDs in the dapp in hex format */
  chainIds?: Hex[];
};

export type ConnectEvmStatus = 'disconnected' | 'connected' | 'connecting';

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
 * const client = await createEVMClient({
 *   dapp: { name: 'My DApp', url: 'https://mydapp.com' }
 * });
 *
 * const { accounts, chainId } = await client.connect({ chainIds: [1, 137] }); // Connect to Ethereum Mainnet, and Polygon
 *
 * const provider = client.getProvider();
 * const signedMessage = await provider.request({ method: 'personal_sign', params: ['0x0', accounts[0]] });
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
  readonly #eventHandlers?: Partial<EventHandlers> | undefined;

  /** The handler for the wallet_sessionChanged event */
  readonly #sessionChangedHandler: (session?: SessionData) => void;

  /** The handler for the display_uri event */
  readonly #displayUriHandler: (uri: string) => void;

  /** The clean-up function for the notification handler */
  #removeNotificationHandler?: () => void;

  /** The current connection status */
  #status: ConnectEvmStatus = 'disconnected';

  /**
   * Creates a new MetamaskConnectEVM instance.
   * Use the static `create()` method instead to ensure proper async initialization.
   *
   * @param options - The options for the MetamaskConnectEVM instance
   * @param options.core - The core instance of the Multichain SDK
   * @param options.eventHandlers - Optional event handlers for EIP-1193 provider events
   */
  private constructor({ core, eventHandlers }: MetamaskConnectEVMOptions) {
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
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.#sessionChangedHandler = this.#onSessionChanged.bind(this);
    this.#core.on('wallet_sessionChanged', this.#sessionChangedHandler);

    /**
     * Handles the display_uri event.
     * Forwards the QR code URI to the provider for custom UI implementations.
     */
    this.#displayUriHandler = this.#onDisplayUri.bind(this);
    this.#core.on('display_uri', this.#displayUriHandler);

    logger('Connect/EVM constructor completed');
  }

  /**
   * Creates a fully initialized MetamaskConnectEVM instance.
   * This is the recommended way to instantiate the class, as it ensures
   * all async initialization (like session recovery) completes before
   * the instance is returned.
   *
   * @param options - The options for the MetamaskConnectEVM instance
   * @param options.core - The core instance of the Multichain SDK
   * @param options.eventHandlers - Optional event handlers for EIP-1193 provider events
   * @returns A promise that resolves with a fully initialized MetamaskConnectEVM instance
   */
  static async create(
    options: MetamaskConnectEVMOptions,
  ): Promise<MetamaskConnectEVM> {
    const instance = new MetamaskConnectEVM(options);
    await instance.#core.emitSessionChanged();
    return instance;
  }

  /**
   * Gets the core options for analytics checks.
   *
   * @returns The multichain options from the core instance
   */
  #getCoreOptions(): MultichainOptions {
    return (this.#core as any).options as MultichainOptions;
  }

  /**
   * Creates invoke options for analytics tracking.
   *
   * @param method - The RPC method name
   * @param scope - The CAIP chain ID scope
   * @param params - The method parameters
   * @returns Invoke options object for analytics
   */
  #createInvokeOptions(
    method: string,
    scope: Scope,
    params: unknown[],
  ): {
    scope: Scope;
    request: { method: string; params: unknown[] };
  } {
    return {
      scope,
      request: { method, params },
    };
  }

  /**
   * Tracks a wallet action requested event.
   *
   * @param method - The RPC method name
   * @param scope - The CAIP chain ID scope
   * @param params - The method parameters
   */
  async #trackWalletActionRequested(
    method: string,
    scope: Scope,
    params: unknown[],
  ): Promise<void> {
    const coreOptions = this.#getCoreOptions();
    try {
      const invokeOptions = this.#createInvokeOptions(method, scope, params);
      const props = await getWalletActionAnalyticsProperties(
        coreOptions,
        this.#core.storage,
        invokeOptions,
      );
      analytics.track('mmconnect_wallet_action_requested', props);
    } catch (error) {
      logger('Error tracking mmconnect_wallet_action_requested event', error);
    }
  }

  /**
   * Tracks a wallet action succeeded event.
   *
   * @param method - The RPC method name
   * @param scope - The CAIP chain ID scope
   * @param params - The method parameters
   */
  async #trackWalletActionSucceeded(
    method: string,
    scope: Scope,
    params: unknown[],
  ): Promise<void> {
    const coreOptions = this.#getCoreOptions();
    try {
      const invokeOptions = this.#createInvokeOptions(method, scope, params);
      const props = await getWalletActionAnalyticsProperties(
        coreOptions,
        this.#core.storage,
        invokeOptions,
      );
      analytics.track('mmconnect_wallet_action_succeeded', props);
    } catch (error) {
      logger('Error tracking mmconnect_wallet_action_succeeded event', error);
    }
  }

  /**
   * Tracks a wallet action failed or rejected event based on the error.
   *
   * @param method - The RPC method name
   * @param scope - The CAIP chain ID scope
   * @param params - The method parameters
   * @param error - The error that occurred
   */
  async #trackWalletActionFailed(
    method: string,
    scope: Scope,
    params: unknown[],
    error: unknown,
  ): Promise<void> {
    const coreOptions = this.#getCoreOptions();
    try {
      const invokeOptions = this.#createInvokeOptions(method, scope, params);
      const props = await getWalletActionAnalyticsProperties(
        coreOptions,
        this.#core.storage,
        invokeOptions,
      );
      const isRejection = isRejectionError(error);
      if (isRejection) {
        analytics.track('mmconnect_wallet_action_rejected', props);
      } else {
        analytics.track('mmconnect_wallet_action_failed', props);
      }
    } catch {
      logger('Error tracking wallet action rejected or failed event', error);
    }
  }

  /**
   * Gets the currently selected chainId from cache, or falls back to the first permitted chain.
   *
   * @param permittedChainIds - Array of permitted chain IDs in hex format
   * @returns The selected chainId (hex string)
   */
  async #getSelectedChainId(permittedChainIds: Hex[]): Promise<Hex> {
    try {
      const cachedChainId =
        await this.#core.storage.adapter.get(CHAIN_STORE_KEY);
      if (cachedChainId) {
        const chainId: Hex = JSON.parse(cachedChainId);

        // Validate that the cached chainId is in the permitted chains list
        if (permittedChainIds.includes(chainId)) {
          return chainId;
        }
      }
    } catch (error) {
      logger('Error retrieving cached chainId', error);
    }

    // Fallback to the first permitted chain if cache retrieval failed or returned an invalid chain
    return permittedChainIds[0];
  }

  /**
   * Connects to the wallet with the specified chain ID and optional account.
   *
   * @param options - The connection options
   * @param [options.account] - Optional param to specify an account to connect to
   * @param [options.forceRequest] - Optional param to force a connection request regardless of whether there is a pre-existing session
   * @param [options.chainIds] - Array of chain IDs to connect to (defaults to ethereum mainnet if not provided)
   * @returns A promise that resolves with the connected accounts and chain ID
   */
  async connect({
    account,
    forceRequest,
    chainIds = [DEFAULT_CHAIN_ID],
  }: ConnectOptions = {}): Promise<{ accounts: Address[]; chainId: Hex }> {
    logger('request: connect', { account });

    if (!chainIds || chainIds.length === 0) {
      throw new Error('chainIds must be an array of at least one chain ID');
    }

    const caipChainIds = Array.from(
      new Set(chainIds.concat(DEFAULT_CHAIN_ID) ?? [DEFAULT_CHAIN_ID]),
    ).map((id) => `eip155:${hexToNumber(id)}`);

    const caipAccountIds = account
      ? caipChainIds.map((caipChainId) => `${caipChainId}:${account}`)
      : [];

    this.#status = 'connecting';

    try {
      // Wait for the wallet_sessionChanged event to fire and set the provider properties
      const result = new Promise((resolve) => {
        this.#provider.once('connect', ({ chainId, accounts }) => {
          logger('fulfilled-request: connect', {
            chainId,
            accounts,
          });
          resolve({
            accounts,
            chainId: chainId as Hex,
          });
        });
      });

      await this.#core.connect(
        caipChainIds as Scope[],
        caipAccountIds as CaipAccountId[],
        undefined,
        forceRequest,
      );

      return result as Promise<{ accounts: Address[]; chainId: Hex }>;
    } catch (error) {
      this.#status = 'disconnected';
      logger('Error connecting to wallet', error);
      throw error;
    }
  }

  /**
   * Connects to the wallet and signs a message using personal_sign.
   *
   * @param options - The connection options
   * @param options.message - The message to sign after connecting
   * @param [options.chainIds] - Optional hex chain IDs to connect to (defaults to ethereum mainnet if not provided)
   * @returns A promise that resolves with the signature
   * @throws Error if the selected account is not available after timeout
   */
  async connectAndSign({
    message,
    chainIds,
  }: {
    message: string;
    chainIds?: Hex[];
  }): Promise<string> {
    const { accounts, chainId } = await this.connect({
      chainIds: chainIds ?? [DEFAULT_CHAIN_ID],
    });

    const result = (await this.#provider.request({
      method: 'personal_sign',
      params: [accounts[0], message],
    })) as string;

    this.#eventHandlers?.connectAndSign?.({
      accounts,
      chainId,
      signResponse: result,
    });

    return result;
  }

  /**
   * Connects to the wallet and invokes a method with specified parameters.
   *
   * @param options - The options for connecting and invoking the method
   * @param options.method - The method name to invoke
   * @param options.params - The parameters to pass to the method, or a function that receives the account and returns params
   * @param [options.chainIds] - Optional hex chain IDs to connect to (defaults to ethereum mainnet if not provided)
   * @param [options.account] - Optional specific account to connect to
   * @param [options.forceRequest] - Whether to force a request regardless of an existing session
   * @returns A promise that resolves with the result of the method invocation
   * @throws Error if the selected account is not available after timeout (for methods that require an account)
   */
  async connectWith({
    method,
    params,
    chainIds,
    account,
    forceRequest,
  }: {
    method: string;
    params: unknown[] | ((account: Address) => unknown[]);
    chainIds?: Hex[];
    account?: string | undefined;
    forceRequest?: boolean;
  }): Promise<unknown> {
    const { accounts: connectedAccounts, chainId: connectedChainId } =
      await this.connect({
        chainIds: chainIds ?? [DEFAULT_CHAIN_ID],
        account,
        forceRequest,
      });

    const resolvedParams =
      typeof params === 'function' ? params(connectedAccounts[0]) : params;

    const result = await this.#provider.request({
      method,
      params: resolvedParams,
    });

    this.#eventHandlers?.connectWith?.({
      accounts: connectedAccounts,
      chainId: connectedChainId,
      connectWithResponse: result,
    });

    return result;
  }

  /**
   * Disconnects from the wallet by revoking the session and cleaning up event listeners.
   *
   * @returns A promise that resolves when disconnection is complete
   */
  async disconnect(): Promise<void> {
    logger('request: disconnect');

    const sessionScopes = this.#sessionScopes;
    const eip155Scopes = Object.keys(sessionScopes).filter((scope) => {
      const { namespace } = parseScopeString(scope as Scope);
      return namespace === 'eip155';
    });

    await this.#core.disconnect(eip155Scopes as Scope[]);
    this.#onDisconnect();
    this.#clearConnectionState();

    // Note: We intentionally do NOT remove the display_uri and wallet_sessionChanged
    // listeners here. These are instance-scoped listeners that should remain active
    // for the lifetime of the SDK instance, allowing reconnection to work properly.
    // Session-scoped listeners (like the notification handler below) are removed.

    this.#removeNotificationHandler?.();
    this.#removeNotificationHandler = undefined;

    logger('fulfilled-request: disconnect');
  }

  /**
   * Switches the Ethereum chain. Will track state internally whenever possible.
   *
   * @param options - The options for the switch chain request
   * @param options.chainId - The chain ID to switch to
   * @param [options.chainConfiguration] - The chain configuration to use in case the chain is not present by the wallet
   * @returns A promise that resolves when the chain has been switched
   */
  async switchChain({
    chainId,
    chainConfiguration,
  }: {
    chainId: Hex;
    chainConfiguration?: AddEthereumChainParameter;
  }): Promise<void> {
    const method = 'wallet_switchEthereumChain';
    const scope: Scope = `eip155:${hexToNumber(chainId)}`;
    const params = [{ chainId }];

    await this.#trackWalletActionRequested(method, scope, params);

    // TODO (wenfix): better way to return here other than resolving.
    if (this.selectedChainId === chainId) {
      return Promise.resolve();
    }

    const permittedChainIds = getPermittedEthChainIds(this.#sessionScopes);

    if (
      permittedChainIds.includes(chainId) &&
      this.#core.transportType === TransportType.MWP
    ) {
      await this.#cacheChainId(chainId);
      this.#onChainChanged(chainId);
      await this.#trackWalletActionSucceeded(method, scope, params);
      return Promise.resolve();
    }

    try {
      const result = await this.#request({
        method: 'wallet_switchEthereumChain',
        params,
      });

      // When using the MWP transport, the error is returned instead of thrown,
      // so we force it into the catch block here.
      const resultWithError = result as { error?: { message: string } };
      if (resultWithError?.error) {
        throw new Error(resultWithError.error.message);
      }

      await this.#trackWalletActionSucceeded(method, scope, params);
      if ((result as { result: unknown }).result === null) {
        // result is successful we eagerly call onChainChanged to update the provider's selected chain ID.
        await this.#cacheChainId(chainId);
        this.#onChainChanged(chainId);
      }
      return Promise.resolve();
    } catch (error) {
      await this.#trackWalletActionFailed(method, scope, params, error);
      // Fallback to add the chain if its not configured in the wallet.
      if ((error as Error).message.includes('Unrecognized chain ID')) {
        return this.#addEthereumChain(chainConfiguration);
      }
      throw error;
    }
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
      // When calling wallet_requestPermissions, we need to force a new session request to prompt
      // the user for accounts, because internally the Multichain SDK will check if
      // the user is already connected and skip the request if so, unless we
      // explicitly request a specific account. This is needed to workaround
      // wallet_requestPermissions not requesting specific accounts.
      const shouldForceConnectionRequest =
        request.method === 'wallet_requestPermissions';

      const { method, params } = request;
      const initiallySelectedChainId = DEFAULT_CHAIN_ID;
      const scope: Scope = `eip155:${initiallySelectedChainId}`;

      await this.#trackWalletActionRequested(method, scope, params);

      try {
        const result = await this.connect({
          chainIds: [initiallySelectedChainId],
          forceRequest: shouldForceConnectionRequest,
        });
        await this.#trackWalletActionSucceeded(method, scope, params);
        return result;
      } catch (error) {
        await this.#trackWalletActionFailed(method, scope, params, error);
        throw error;
      }
    }

    if (isSwitchChainRequest(request)) {
      return this.switchChain({
        chainId: request.params[0].chainId as Hex,
      });
    }

    if (isAddChainRequest(request)) {
      return this.#addEthereumChain(request.params[0]);
    }

    if (isAccountsRequest(request)) {
      const { method } = request;
      const decimalChainId = hexToNumber(
        this.#provider.selectedChainId ?? '0x1',
      );
      const scope: Scope = `eip155:${decimalChainId}`;
      const params: unknown[] = [];

      await this.#trackWalletActionRequested(method, scope, params);
      await this.#trackWalletActionSucceeded(method, scope, params);

      return this.#provider.accounts;
    }

    if (isChainIdRequest(request)) {
      return this.#provider.selectedChainId;
    }

    logger('Request not intercepted, forwarding to default handler', request);
    return Promise.resolve();
  }

  /**
   * Clears the internal connection state: accounts and chainId
   */
  #clearConnectionState(): void {
    this.#provider.accounts = [];
    this.#provider.selectedChainId = undefined;
  }

  /**
   * Adds an Ethereum chain using the latest chain configuration received from
   * a switchEthereumChain request
   *
   * @param chainConfiguration - The chain configuration to use in case the chain is not present by the wallet
   * @returns Nothing
   */
  async #addEthereumChain(
    chainConfiguration?: AddEthereumChainParameter,
  ): Promise<void> {
    logger('addEthereumChain called', { chainConfiguration });
    const method = 'wallet_addEthereumChain';

    if (!chainConfiguration) {
      throw new Error('No chain configuration found.');
    }

    // Get chain ID from config or use current chain
    const chainId =
      (chainConfiguration.chainId as Hex) ||
      this.#provider.selectedChainId ||
      '0x1';
    const decimalChainId = hexToNumber(chainId);
    const scope: Scope = `eip155:${decimalChainId}`;
    const params = [chainConfiguration];

    await this.#trackWalletActionRequested(method, scope, params);

    try {
      const result = await this.#request({
        method: 'wallet_addEthereumChain',
        params,
      });

      if ((result as { result: unknown }).result === null) {
        // if result is successful we eagerly call onChainChanged to update the provider's selected chain ID.
        await this.#cacheChainId(chainId);
        this.#onChainChanged(chainId);
      }
      await this.#trackWalletActionSucceeded(method, scope, params);
    } catch (error) {
      await this.#trackWalletActionFailed(method, scope, params, error);
      throw error;
    }
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
    logger('direct request to metamask-provider called', {
      method: request.method,
    });
    const result = this.#core.transport.sendEip1193Message(request);
    if (
      request.method === 'wallet_addEthereumChain' ||
      request.method === 'wallet_switchEthereumChain'
    ) {
      this.#core.openSimpleDeeplinkIfNeeded();
    }
    return result;
  }

  /**
   * Caches the chainId to storage for persistence across page refreshes.
   *
   * @param chainId - The hex chain ID
   */
  async #cacheChainId(chainId: Hex): Promise<void> {
    try {
      await this.#core.storage.adapter.set(
        CHAIN_STORE_KEY,
        JSON.stringify(chainId),
      );
    } catch (error) {
      logger('Error caching chainId', error);
    }
  }

  async #onSessionChanged(session?: SessionData): Promise<void> {
    logger('event: wallet_sessionChanged', {
      scopes: Object.keys(session?.sessionScopes ?? {}),
    });
    this.#sessionScopes = session?.sessionScopes ?? {};
    const hexPermittedChainIds = getPermittedEthChainIds(this.#sessionScopes);
    if (hexPermittedChainIds.length === 0) {
      this.#onDisconnect();
    } else {
      let initialAccounts: Address[] = [];
      if (this.#core.status === 'connected') {
        const ethAccountsResponse =
          await this.#core.transport.sendEip1193Message({
            method: 'eth_accounts',
            params: [],
          });
        initialAccounts = ethAccountsResponse.result as Address[];
      } else {
        initialAccounts = getEthAccounts(this.#sessionScopes);
      }

      const chainId = await this.#getSelectedChainId(hexPermittedChainIds);

      this.#onConnect({
        chainId,
        accounts: initialAccounts,
      });
    }
  }

  /**
   * Handles chain change events and updates the provider's selected chain ID.
   *
   * @param chainId - The new hex chain ID
   */
  #onChainChanged(chainId: Hex): void {
    if (chainId === this.#provider.selectedChainId) {
      return;
    }
    logger('handler: chainChanged', { chainId });
    this.#provider.selectedChainId = chainId;
    this.#eventHandlers?.chainChanged?.(chainId);
    this.#provider.emit('chainChanged', chainId);
  }

  /**
   * Handles accounts change events and updates the provider's accounts list.
   *
   * @param accounts - The new list of permitted accounts
   */
  #onAccountsChanged(accounts: Address[]): void {
    const accountsUnchanged =
      accounts.length === this.#provider.accounts.length &&
      accounts.every((acct, idx) => acct === this.#provider.accounts[idx]);
    if (accountsUnchanged) {
      return;
    }
    logger('handler: accountsChanged', accounts);
    this.#provider.accounts = accounts;
    this.#provider.emit('accountsChanged', accounts);
    this.#eventHandlers?.accountsChanged?.(accounts);
  }

  /**
   * Handles connection events and emits the connect event to listeners.
   *
   * @param options - The connection options
   * @param options.chainId - The hex chain ID of the connection
   * @param options.accounts - The accounts of the connection
   */
  #onConnect({
    chainId,
    accounts,
  }: {
    chainId: Hex;
    accounts: Address[];
  }): void {
    logger('handler: connect', { chainId, accounts });
    const data = {
      chainId,
      accounts,
    };

    if (this.#status !== 'connected') {
      this.#status = 'connected';
      this.#provider.emit('connect', data);
      this.#eventHandlers?.connect?.(data);

      this.#removeNotificationHandler?.();

      // TODO: Verify if #core.on('metamask_accountsChanged') and #core.on('metamask_chainChanged')
      // would work here instead
      this.#removeNotificationHandler = this.#core.transport.onNotification(
        (notification) => {
          // @ts-expect-error TODO: address this
          if (notification?.method === 'metamask_accountsChanged') {
            // @ts-expect-error TODO: address this
            const notificationAccounts = notification?.params;
            logger('transport-event: accountsChanged', notificationAccounts);
            // why are we not caching the accounts here?
            this.#onAccountsChanged(notificationAccounts);
          }

          // @ts-expect-error TODO: address this
          if (notification?.method === 'metamask_chainChanged') {
            // @ts-expect-error TODO: address this
            const notificationChainId = notification?.params?.chainId;
            logger('transport-event: chainChanged', notificationChainId);
            // Cache the chainId for persistence across page refreshes
            this.#cacheChainId(notificationChainId).catch((error) => {
              logger('Error caching chainId in notification handler', error);
            });
            this.#onChainChanged(notificationChainId);
          }
        },
      );
    }

    this.#onChainChanged(chainId);
    this.#onAccountsChanged(accounts);
  }

  /**
   * Handles disconnection events and emits the disconnect event to listeners.
   * Also clears accounts by triggering an accountsChanged event with an empty array.
   */
  #onDisconnect(): void {
    if (this.#status === 'disconnected') {
      return;
    }
    this.#status = 'disconnected';

    logger('handler: disconnect');
    this.#provider.emit('disconnect');
    this.#eventHandlers?.disconnect?.();

    this.#onAccountsChanged([]);
  }

  /**
   * Handles display_uri events and emits them to the provider.
   * This allows consumers to display their own custom QR code UI.
   *
   * @param uri - The deeplink URI to be displayed as a QR code
   */
  #onDisplayUri(uri: string): void {
    if (this.#status !== 'connecting') {
      return;
    }

    logger('handler: display_uri', uri);
    this.#provider.emit('display_uri', uri);
    this.#eventHandlers?.displayUri?.(uri);
  }

  /**
   * Gets the EIP-1193 provider instance
   *
   * @returns The EIP-1193 provider instance
   */
  getProvider(): EIP1193Provider {
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
   * Gets the current connection status
   *
   * @returns The current connection status
   */
  get status(): ConnectionStatus {
    return this.#core.status;
  }
}

/**
 * Creates a new Metamask Connect/EVM instance
 *
 * @param options - The options for the Metamask Connect/EVM layer
 * @param options.dapp - Dapp identification and branding settings
 * @param options.api - API configuration including read-only RPC map
 * @param options.api.supportedNetworks - A map of hex chain IDs to RPC URLs for read-only requests
 * @param [options.ui] - UI configuration options
 * @param [options.ui.headless] - Whether to run without UI
 * @param [options.ui.preferExtension] - Whether to prefer browser extension
 * @param [options.ui.showInstallModal] - Whether to render installation modal for desktop extension
 * @param [options.mobile] - Mobile configuration options
 * @param [options.mobile.preferredOpenLink] - Custom handler for opening deeplinks (useful for React Native, etc.)
 * @param [options.mobile.useDeeplink] - Whether to use native deeplinks instead of universal links
 * @param [options.transport] - Transport configuration (e.g., extensionId, notification handler)
 * @param [options.transport.extensionId] - Extension ID for browser extension transport
 * @param [options.transport.onNotification] - Callback for receiving transport notifications
 * @param [options.eventHandlers] - Event handlers for the Metamask Connect/EVM layer
 * @param [options.debug] - Enable debug logging
 * @returns The Metamask-Connect EVM client instance
 */
export async function createEVMClient(
  options: Pick<MultichainOptions, 'dapp' | 'mobile' | 'transport'> & {
    ui?: Omit<MultichainOptions['ui'], 'factory'>;
  } & {
    eventHandlers?: Partial<EventHandlers>;
    debug?: boolean;
    api: {
      supportedNetworks: Record<Hex, string>;
    };
  },
): Promise<MetamaskConnectEVM> {
  if (options.debug) {
    enableDebug();
  }

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

  const supportedNetworksCaipChainId = Object.entries(
    options.api.supportedNetworks,
  ).reduce<Record<string, string>>((acc, [hexChainId, url]) => {
    const decimalChainId = parseInt(hexChainId, 16);
    const caip2ChainId = `eip155:${decimalChainId}`;
    acc[caip2ChainId] = url;
    return acc;
  }, {});

  try {
    const core = await createMultichainClient({
      ...options,
      api: {
        supportedNetworks: supportedNetworksCaipChainId,
      },
    });

    return MetamaskConnectEVM.create({
      core,
      eventHandlers: options.eventHandlers,
      supportedNetworks: options.api.supportedNetworks,
    });
  } catch (error) {
    console.error('Error creating Metamask Connect/EVM', error);
    throw error;
  }
}
