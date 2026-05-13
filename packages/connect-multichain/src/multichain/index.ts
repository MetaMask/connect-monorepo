/* eslint-disable @typescript-eslint/naming-convention */
import { analytics } from '@metamask/analytics';
import type { DappClient } from '@metamask/mobile-wallet-protocol-dapp-client';
import {
  type SessionProperties,
  getMultichainClient,
  type MultichainApiClient,
  type SessionData,
} from '@metamask/multichain-api-client';
import type { CaipAccountId, Json } from '@metamask/utils';

import {
  getVersion,
  type InvokeMethodOptions,
  type MultichainOptions,
  type RPCAPI,
  type Scope,
  type StoreClient,
  TransportType,
} from '../domain';
import {
  type Connection,
  type ConnectionContext,
  DefaultConnection,
  MwpConnection,
} from './connections';
import {
  getBaseAnalyticsProperties,
  isRejectionError,
} from './utils/analytics';
import {
  createLogger,
  enableDebug,
  isEnabled as isLoggerEnabled,
} from '../domain/logger';
import {
  type ExtendedTransport,
  MultichainCore,
  type ConnectionStatus,
} from '../domain/multichain';
import {
  getPlatformType,
  hasExtension,
  isSecure,
  PlatformType,
} from '../domain/platform';
import { RpcClient } from './rpc/handlers/rpcClient';
import { RequestRouter } from './rpc/requestRouter';
import { MultichainApiClientWrapperTransport } from './transports/multichainApiClientWrapper';
import {
  getDappId,
  getGlobalObject,
  mergeRequestedSessionWithExisting,
  setupDappMetadata,
} from './utils';

export { getInfuraRpcUrls } from '../domain/multichain/api/infura';

// Value substituted by tsup at build time
declare const __PACKAGE_VERSION__: string | undefined;

// ENFORCE NAMESPACE THAT CAN BE DISABLED
const logger = createLogger('metamask-sdk:core');

const SINGLETON_KEY = '__METAMASK_CONNECT_MULTICHAIN_SINGLETON__';

export class MetaMaskConnectMultichain extends MultichainCore {
  readonly #provider: MultichainApiClient<RPCAPI>;

  readonly #providerTransportWrapper: MultichainApiClientWrapperTransport;

  #connection: Connection | undefined = undefined;

  public _status: ConnectionStatus = 'pending';

  #anonId: string | undefined;

  get status(): ConnectionStatus {
    return this._status;
  }

  set status(value: ConnectionStatus) {
    if (this._status === value) {
      return;
    }
    this._status = value;
    this.emit('stateChanged', value);
  }

  get provider(): MultichainApiClient<RPCAPI> {
    return this.#provider;
  }

  get transport(): ExtendedTransport {
    if (!this.#connection) {
      throw new Error('Transport not initialized, establish connection first');
    }
    return this.#connection.transport;
  }

  get dappClient(): DappClient {
    if (!(this.#connection instanceof MwpConnection)) {
      throw new Error('DappClient not initialized, establish connection first');
    }
    return this.#connection.dappClient;
  }

  get transportType(): TransportType {
    return this.#connection?.type ?? TransportType.UNKNOWN;
  }

  get storage(): StoreClient {
    return this.options.storage;
  }

  readonly #sdkInfo = `Sdk/Javascript SdkVersion/${getVersion()} Platform/${getPlatformType()} dApp/${this.options.dapp.url ?? this.options.dapp.name} dAppTitle/${this.options.dapp.name}`;

  constructor(options: MultichainOptions) {
    const withDappMetadata = setupDappMetadata(options);
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const integrationType = options.analytics?.integrationType || 'direct';
    const allOptions = {
      ...withDappMetadata,
      ui: {
        ...withDappMetadata.ui,
        preferExtension: withDappMetadata.ui.preferExtension ?? true,
        showInstallModal: withDappMetadata.ui.showInstallModal ?? false,
        headless: withDappMetadata.ui.headless ?? false,
      },
      analytics: {
        ...(options.analytics ?? {}),
        integrationType,
      },
      versions: {
        // typeof guard needed: Metro (React Native) bundles TS source directly,
        // bypassing the tsup build that substitutes __PACKAGE_VERSION__.
        'connect-multichain':
          typeof __PACKAGE_VERSION__ === 'undefined'
            ? 'unknown'
            : __PACKAGE_VERSION__,
        ...(options.versions ?? {}),
      },
    };

    super(allOptions);

    this.#providerTransportWrapper = new MultichainApiClientWrapperTransport(
      this,
    );
    this.#provider = getMultichainClient({
      transport: this.#providerTransportWrapper,
    });
  }

  // Creates a singleton instance of MetaMaskConnectMultichain.
  // If the singleton already exists, it merges the incoming options with the
  // existing singleton options for the following keys: `api.supportedNetworks`,
  // `versions`, `ui.*`, `mobile.*`, `transport.extensionId`, `debug`. Take note
  // that the value for `dapp` is not merged as it does not make sense for
  // subsequent calls to `createMultichainClient` to have a different `dapp` value.
  static async create(
    options: MultichainOptions,
  ): Promise<MetaMaskConnectMultichain> {
    const globalObject = getGlobalObject();
    const existing = globalObject[SINGLETON_KEY] as
      | Promise<MetaMaskConnectMultichain>
      | undefined;
    if (existing) {
      const instance = await existing;
      instance.mergeOptions(options);
      analytics.setGlobalProperty(
        'mmconnect_versions',
        instance.options.versions ?? {},
      );
      if (options.analytics?.integrationType) {
        analytics.setGlobalProperty('integration_types', [
          options.analytics.integrationType,
        ]);
      }
      if (options.debug) {
        enableDebug('metamask-sdk:*');
      }
      return instance;
    }

    const instancePromise = (async (): Promise<MetaMaskConnectMultichain> => {
      const instance = new MetaMaskConnectMultichain(options);
      const isEnabled = await isLoggerEnabled(
        'metamask-sdk:core',
        instance.options.storage,
      );
      if (isEnabled) {
        enableDebug('metamask-sdk:core');
      }
      await instance.#init();
      return instance;
    })();

    globalObject[SINGLETON_KEY] = instancePromise;

    instancePromise.catch((error) => {
      globalObject[SINGLETON_KEY] = undefined;
      console.error('Error initializing MetaMaskConnectMultichain', error);
    });

    return instancePromise;
  }

  // ── Connection orchestration ────────────────────────────────────────────────

  /**
   * Snapshot of the live context handed to every Connection. The getter
   * is fresh on each call so connections always see current options/anonId.
   *
   * @returns A fresh `ConnectionContext` referencing the current options.
   */
  #context(): ConnectionContext {
    return { options: this.options, anonId: this.#anonId };
  }

  /**
   * Subscribes to events emitted by a Connection and translates them into
   * `MultichainClient` side-effects (status updates, re-emits, provider
   * wrapper wiring).
   *
   * @param connection - The connection to attach.
   */
  #attachConnection(connection: Connection): void {
    connection.on('notification', (payload) => {
      this.#onTransportNotification(payload).catch((error) => {
        logger('Error handling transport notification', error);
      });
    });
    connection.on('display_uri', (uri) => {
      this.emit('display_uri', uri);
    });
    connection.on('status', (status) => {
      this.status = status;
    });
    this.#providerTransportWrapper.setupTransportNotificationListener();
  }

  /**
   * Replace the active connection, disposing the old one first. The
   * DefaultConnection has a special-case where it stays alive across
   * disconnects so we can keep observing `wallet_sessionChanged`; in those
   * cases the same instance may be reused and this is a no-op.
   *
   * @param next - Connection that should become active.
   */
  async #swapConnection(next: Connection): Promise<void> {
    if (this.#connection === next) {
      return;
    }
    if (this.#connection) {
      await this.#connection.dispose();
      this.#providerTransportWrapper.clearTransportNotificationListener();
    }
    this.#connection = next;
    this.#attachConnection(next);
  }

  async #setupAnalytics(): Promise<void> {
    const platform = getPlatformType();
    const isBrowser =
      platform === PlatformType.MetaMaskMobileWebview ||
      platform === PlatformType.DesktopWeb ||
      platform === PlatformType.MobileWeb;

    const isReactNative = platform === PlatformType.ReactNative;

    if (!isBrowser && !isReactNative) {
      return;
    }

    const dappId = getDappId(this.options.dapp);
    const anonId = await this.storage.getAnonId();
    this.#anonId = anonId;

    const { integrationType } = this.options.analytics ?? {
      integrationType: '',
    };
    analytics.setGlobalProperty(
      'mmconnect_versions',
      this.options.versions ?? {},
    );
    analytics.setGlobalProperty('dapp_id', dappId);
    analytics.setGlobalProperty('anon_id', anonId);
    analytics.setGlobalProperty('platform', platform);
    if (integrationType) {
      analytics.setGlobalProperty('integration_types', [integrationType]);
    }
    analytics.enable();
  }

  async #onTransportNotification(payload: any): Promise<void> {
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'method' in payload
    ) {
      if (payload.method === 'wallet_sessionChanged') {
        const sessionScopes =
          (payload.params as SessionData | undefined)?.sessionScopes ?? {};
        const hasScopes = Object.keys(sessionScopes).length > 0;
        // During passive init, status is already 'loaded' — don't downgrade to 'disconnected'
        // just because the extension has no active session yet.
        if (this.status === 'loaded' && !hasScopes) {
          return;
        }
        this.status = hasScopes ? 'connected' : 'disconnected';
      }

      this.emit(payload.method as string, payload.params ?? payload.result);
    }
  }

  /**
   * Re-hydrates a Connection from a previously persisted transport type, so
   * the SDK can pick up where it left off across page reloads.
   *
   * @returns The rehydrated connection, or `undefined` if storage was empty
   * or stale (e.g. extension was uninstalled since the last session).
   */
  async #rehydrateConnection(): Promise<Connection | undefined> {
    const transportType = await this.storage.getTransport();
    if (!transportType) {
      return undefined;
    }
    const hasExtensionInstalled = await hasExtension();

    if (transportType === TransportType.Browser) {
      if (!hasExtensionInstalled) {
        await this.storage.removeTransport();
        return undefined;
      }
      const connection = DefaultConnection.create();
      await this.#swapConnection(connection);
      return connection;
    }

    if (transportType === TransportType.MWP) {
      const connection = await MwpConnection.create(this.#context());
      await this.#swapConnection(connection);
      return connection;
    }

    await this.storage.removeTransport();
    return undefined;
  }

  async #setupTransport(): Promise<void> {
    const connection = await this.#rehydrateConnection();
    if (connection) {
      if (!connection.isConnected()) {
        this.status = 'connecting';
        await connection.transport.connect();
      }
      this.status = 'connected';
      await this.storage.setTransport(connection.type);
      return;
    }

    this.status = 'loaded';
    const hasExtensionInstalled = await hasExtension();
    const preferExtension = this.options.ui.preferExtension ?? true;
    // Setup passive listening for extension wallet_sessionChanged events
    if (hasExtensionInstalled && preferExtension) {
      const passive = DefaultConnection.create();
      await this.#swapConnection(passive);
      // Normally calling DefaultTransport.connect() ensures that the transport is initialized
      // and that wallet_sessionChanged (faked) is emitted. But because we are not
      // calling transport.connect(), we need to initialize DefaultTransport manually.
      await passive.initPassive();
    }
  }

  async #init(): Promise<void> {
    try {
      await this.#setupAnalytics();
      await this.#setupTransport();
    } catch (error) {
      await this.storage.removeTransport();
      this.status = 'pending';
      logger('MetaMaskSDK error during initialization', error);
    }
  }

  /**
   * Ensure we have a `DefaultConnection` ready (creating one if necessary)
   * and that storage records `Browser` as the active transport.
   *
   * @returns The active `DefaultConnection`.
   */
  async #useDefaultConnection(): Promise<DefaultConnection> {
    if (this.#connection instanceof DefaultConnection) {
      await this.storage.setTransport(TransportType.Browser);
      return this.#connection;
    }
    const connection = DefaultConnection.create();
    await this.#swapConnection(connection);
    await this.storage.setTransport(TransportType.Browser);
    return connection;
  }

  /**
   * Ensure we have an `MwpConnection` ready (creating one if necessary)
   * and that storage records `MWP` as the active transport.
   *
   * @returns The active `MwpConnection`.
   */
  async #useMwpConnection(): Promise<MwpConnection> {
    if (this.#connection instanceof MwpConnection) {
      await this.storage.setTransport(TransportType.MWP);
      return this.#connection;
    }
    const connection = await MwpConnection.create(this.#context());
    await this.#swapConnection(connection);
    await this.storage.setTransport(TransportType.MWP);
    return connection;
  }

  async #handleConnection(
    promise: Promise<void>,
    scopes: Scope[],
    transportType: TransportType,
  ): Promise<void> {
    this.status = 'connecting';
    return promise
      .then(async () => {
        this.status = 'connected';
        try {
          const baseProps = await getBaseAnalyticsProperties(
            this.options,
            this.storage,
          );

          analytics.track('mmconnect_connection_established', {
            ...baseProps,
            transport_type: transportType,
            user_permissioned_chains: scopes,
          });
        } catch (error) {
          logger('Error tracking connection_established event', error);
        }
        return undefined; // explicitly return `undefined` to avoid eslintpromise/always-return
      })
      .catch(async (error) => {
        this.status = 'disconnected';
        try {
          const baseProps = await getBaseAnalyticsProperties(
            this.options,
            this.storage,
          );
          const isRejection = isRejectionError(error);

          if (isRejection) {
            analytics.track('mmconnect_connection_rejected', {
              ...baseProps,
              transport_type: transportType,
            });
          } else {
            analytics.track('mmconnect_connection_failed', {
              ...baseProps,
              transport_type: transportType,
            });
          }
        } catch {
          logger('Error tracking connection failed/rejected event', error);
        }
        throw error;
      });
  }

  // TODO: make this into param object
  async connect(
    scopes: Scope[],
    caipAccountIds: CaipAccountId[],
    sessionProperties?: SessionProperties,
    forceRequest?: boolean,
  ): Promise<void> {
    if (
      this.status === 'connecting' &&
      this.#connection instanceof MwpConnection
    ) {
      await this.#connection.openConnectDeeplinkIfNeeded();
      throw new Error(
        'Existing connection is pending. Please check your MetaMask Mobile app to continue.',
      );
    }
    const { ui } = this.options;
    const platformType = getPlatformType();
    const isWeb =
      platformType === PlatformType.MetaMaskMobileWebview ||
      platformType === PlatformType.DesktopWeb;
    const { preferExtension = true, showInstallModal = false } = ui;
    const secure = isSecure();
    const hasExtensionInstalled = await hasExtension();

    let transportType;
    if (
      platformType === PlatformType.MetaMaskMobileWebview ||
      (isWeb && hasExtensionInstalled && preferExtension)
    ) {
      transportType = TransportType.Browser;
    } else {
      transportType = TransportType.MWP;
    }

    try {
      const baseProps = await getBaseAnalyticsProperties(
        this.options,
        this.storage,
      );
      const dappConfiguredChains = Object.keys(
        this.options.api.supportedNetworks,
      );

      analytics.track('mmconnect_connection_initiated', {
        ...baseProps,
        transport_type: transportType,
        dapp_configured_chains: dappConfiguredChains,
        dapp_requested_chains: scopes,
      });
    } catch (error) {
      logger('Error tracking connection_initiated event', error);
    }

    const sessionData = await this.#getCaipSession();

    const { mergedScopes, mergedCaipAccountIds, mergedSessionProperties } =
      mergeRequestedSessionWithExisting(
        sessionData,
        scopes,
        caipAccountIds,
        sessionProperties,
      );

    // Needed because empty object will cause wallet_createSession to return an error
    const nonEmptySessionProperties =
      Object.keys(mergedSessionProperties ?? {}).length > 0
        ? mergedSessionProperties
        : undefined;

    // Reuse an already-connected transport in a non-secure context. This
    // path is taken when the user calls connect() again on an existing
    // session to request additional scopes.
    if (this.#connection?.isConnected() && !secure) {
      const existing = this.#connection;
      return this.#handleConnection(
        existing.transport
          .connect({
            scopes: mergedScopes,
            caipAccountIds: mergedCaipAccountIds,
            sessionProperties: nonEmptySessionProperties,
            forceRequest,
          })
          .then(async () => {
            await this.storage.setTransport(existing.type);
            return undefined;
          }),
        scopes,
        transportType,
      );
    }

    // In MetaMask Mobile In App Browser, window.ethereum is available directly
    if (platformType === PlatformType.MetaMaskMobileWebview) {
      const connection = await this.#useDefaultConnection();
      return this.#handleConnection(
        connection.connect({
          scopes: mergedScopes,
          caipAccountIds: mergedCaipAccountIds,
          sessionProperties: nonEmptySessionProperties,
          forceRequest,
        }),
        scopes,
        transportType,
      );
    }

    if (isWeb && hasExtensionInstalled && preferExtension) {
      // If metamask extension is available, connect to it
      const connection = await this.#useDefaultConnection();
      // Web transport has no initial payload
      return this.#handleConnection(
        connection.connect({
          scopes: mergedScopes,
          caipAccountIds: mergedCaipAccountIds,
          sessionProperties: nonEmptySessionProperties,
          forceRequest,
        }),
        scopes,
        transportType,
      );
    }

    // Connection will now be InstallModal + QRCodes or Deeplinks, both require mwp
    const mwp = await this.#useMwpConnection();

    // Determine preferred option for install modal
    const shouldShowInstallModal = hasExtensionInstalled
      ? showInstallModal
      : !preferExtension || showInstallModal;

    if (secure && !shouldShowInstallModal) {
      // Desktop is not preferred option, so we use deeplinks (mobile web)
      return this.#handleConnection(
        mwp.connect({
          flow: 'deeplink',
          scopes: mergedScopes,
          caipAccountIds: mergedCaipAccountIds,
          sessionProperties: nonEmptySessionProperties,
        }),
        scopes,
        transportType,
      );
    }

    // Show install modal for RN, Web + Node (or headless QR if requested)
    return this.#handleConnection(
      mwp.connect({
        flow: this.options.ui.headless ? 'headless' : 'install-modal',
        desktopPreferred: shouldShowInstallModal,
        scopes: mergedScopes,
        caipAccountIds: mergedCaipAccountIds,
        sessionProperties: nonEmptySessionProperties,
      }),
      scopes,
      transportType,
    );
  }

  public override emit(event: string, args: any): void {
    this.options.transport?.onNotification?.({ method: event, params: args });
    super.emit(event, args);
  }

  async #getCaipSession(): Promise<SessionData> {
    let sessionData: SessionData = {
      sessionScopes: {},
      sessionProperties: {},
    };
    if (this.#connection?.isConnected()) {
      try {
        const response = await this.#connection.transport.request({
          method: 'wallet_getSession',
        });
        if (response.result) {
          sessionData = response.result as SessionData;
        }
      } catch {
        // If session retrieval fails, return empty session
      }
    }
    return sessionData;
  }

  async disconnect(scopes: Scope[] = []): Promise<void> {
    const sessionData = await this.#getCaipSession();

    const remainingScopes =
      scopes.length === 0
        ? []
        : Object.keys(sessionData.sessionScopes).filter(
            (scope) => !scopes.includes(scope as Scope),
          );

    await this.#connection?.disconnect(scopes);

    if (remainingScopes.length === 0) {
      await this.storage.removeTransport();

      // Keep the DefaultConnection instance alive so we can continue to
      // listen for wallet_sessionChanged events from the extension. Only
      // dispose non-Browser connections.
      if (this.#connection && this.#connection.type !== TransportType.Browser) {
        await this.#connection.dispose();
        this.#connection = undefined;
        this.#providerTransportWrapper.clearTransportNotificationListener();
      }

      this.status = 'disconnected';
    }
  }

  async invokeMethod(request: InvokeMethodOptions): Promise<Json> {
    const { transport, options } = this;

    const rpcClient = new RpcClient(options, this.#sdkInfo);
    const requestRouter = new RequestRouter(
      transport,
      rpcClient,
      options,
      this.#connection?.type ?? TransportType.UNKNOWN,
    );
    // TODO: need read only method support for solana
    return requestRouter.invokeMethod(request);
  }

  // DRY THIS WITH REQUEST ROUTER
  openSimpleDeeplinkIfNeeded(): void {
    if (this.#connection instanceof MwpConnection) {
      this.#connection.openSimpleDeeplinkIfNeeded();
    }
  }

  // Provides a way for ecosystem clients (EVM, Solana, etc.) to get the current CAIP session data
  // when instantiating themselves (as they would have already missed any initial sessionChanged events emitted by ConnectMultichain)
  // without having to concern themselves with the current transport connection status.
  async emitSessionChanged(): Promise<void> {
    const emptySession = { sessionScopes: {} };

    if (!this.#connection?.isConnected()) {
      // If we aren't connected or connecting, there definitely is no active CAIP session
      // so we optimistically emit an empty session to signify that to the ecosystem client consumers (EVM, Solana, etc.)
      this.emit('wallet_sessionChanged', emptySession);
      return;
    }

    // Otherwise, we need to fetch the current CAIP session from the wallet
    const response = await this.#connection.transport.request({
      method: 'wallet_getSession',
    });

    // And then simulate a sessionChanged event with the current CAIP session data
    this.emit('wallet_sessionChanged', response.result ?? emptySession);
  }
}
