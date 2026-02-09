/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-restricted-globals */
/* eslint-disable promise/always-return -- Event handlers */
/* eslint-disable no-async-promise-executor -- Async promise executor needed for complex flow */
import { analytics } from '@metamask/analytics';
import {
  ErrorCode,
  ProtocolError,
  type SessionRequest,
  SessionStore,
  WebSocketTransport,
} from '@metamask/mobile-wallet-protocol-core';
import { DappClient } from '@metamask/mobile-wallet-protocol-dapp-client';
import {
  type SessionProperties,
  getMultichainClient,
  type MultichainApiClient,
  type SessionData,
} from '@metamask/multichain-api-client';
import type { CaipAccountId, Json } from '@metamask/utils';

import {
  METAMASK_CONNECT_BASE_URL,
  METAMASK_DEEPLINK_BASE,
  MWP_RELAY_URL,
} from '../config';
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
  getBaseAnalyticsProperties,
  isRejectionError,
} from './utils/analytics';
import {
  createLogger,
  enableDebug,
  isEnabled as isLoggerEnabled,
} from '../domain/logger';
import {
  type ConnectionRequest,
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
import { DefaultTransport } from './transports/default';
import { MultichainApiClientWrapperTransport } from './transports/multichainApiClientWrapper';
import { MWPTransport } from './transports/mwp';
import { keymanager } from './transports/mwp/KeyManager';
import {
  getDappId,
  getGlobalObject,
  mergeRequestedSessionWithExisting,
  openDeeplink,
  setupDappMetadata,
} from './utils';

export { getInfuraRpcUrls } from '../domain/multichain/api/infura';

// ENFORCE NAMESPACE THAT CAN BE DISABLED
const logger = createLogger('metamask-sdk:core');

const SINGLETON_KEY = '__METAMASK_CONNECT_MULTICHAIN_SINGLETON__';

export class MetaMaskConnectMultichain extends MultichainCore {
  readonly #provider: MultichainApiClient<RPCAPI>;

  readonly #providerTransportWrapper: MultichainApiClientWrapperTransport;

  #transport: ExtendedTransport | undefined = undefined;

  #dappClient: DappClient | undefined = undefined;

  #beforeUnloadListener: (() => void) | undefined;

  public _status: ConnectionStatus = 'pending';

  #listener: (() => void | Promise<void>) | undefined;

  get status(): ConnectionStatus {
    return this._status;
  }

  set status(value: ConnectionStatus) {
    this._status = value;
    this.options.transport?.onNotification?.({
      method: 'stateChanged',
      params: value,
    });
  }

  get provider(): MultichainApiClient<RPCAPI> {
    return this.#provider;
  }

  get transport(): ExtendedTransport {
    if (!this.#transport) {
      throw new Error('Transport not initialized, establish connection first');
    }
    return this.#transport;
  }

  get dappClient(): DappClient {
    if (!this.#dappClient) {
      throw new Error('DappClient not initialized, establish connection first');
    }
    return this.#dappClient;
  }

  get storage(): StoreClient {
    return this.options.storage;
  }

  get transportType(): TransportType {
    return this.#transport instanceof MWPTransport
      ? TransportType.MWP
      : TransportType.Browser;
  }

  readonly #sdkInfo = `Sdk/Javascript SdkVersion/${getVersion()} Platform/${getPlatformType()} dApp/${this.options.dapp.url ?? this.options.dapp.name} dAppTitle/${this.options.dapp.name}`;

  constructor(options: MultichainOptions) {
    const withDappMetadata = setupDappMetadata(options);
    const integrationType = options.analytics?.integrationType ?? 'direct';
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
    };

    super(allOptions);

    this.#providerTransportWrapper = new MultichainApiClientWrapperTransport(
      this,
    );
    this.#provider = getMultichainClient({
      transport: this.#providerTransportWrapper,
    });
  }

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
    return instancePromise;
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

    const version = getVersion();
    const dappId = getDappId(this.options.dapp);
    const anonId = await this.storage.getAnonId();

    const { integrationType } = this.options.analytics ?? {
      integrationType: '',
    };
    analytics.setGlobalProperty('mmconnect_version', version);
    analytics.setGlobalProperty('dapp_id', dappId);
    analytics.setGlobalProperty('anon_id', anonId);
    analytics.setGlobalProperty('platform', platform);
    analytics.setGlobalProperty('integration_type', integrationType);
    analytics.enable();
  }

  async #onTransportNotification(payload: any): Promise<void> {
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'method' in payload
    ) {
      this.emit(payload.method as string, payload.params ?? payload.result);
    }
  }

  async #getStoredTransport(): Promise<
    DefaultTransport | MWPTransport | undefined
  > {
    const transportType = await this.storage.getTransport();
    const hasExtensionInstalled = await hasExtension();
    if (transportType) {
      if (transportType === TransportType.Browser) {
        if (hasExtensionInstalled) {
          const apiTransport = new DefaultTransport();
          this.#transport = apiTransport;
          this.#providerTransportWrapper.setupTransportNotifcationListener();
          this.#listener = apiTransport.onNotification(
            this.#onTransportNotification.bind(this),
          );
          return apiTransport;
        }
      } else if (transportType === TransportType.MWP) {
        const { adapter: kvstore } = this.options.storage;
        const dappClient = await this.#createDappClient();
        const apiTransport = new MWPTransport(dappClient, kvstore);
        this.#dappClient = dappClient;
        this.#transport = apiTransport;
        this.#providerTransportWrapper.setupTransportNotifcationListener();
        this.#listener = apiTransport.onNotification(
          this.#onTransportNotification.bind(this),
        );
        return apiTransport;
      }

      await this.storage.removeTransport();
    }

    return undefined;
  }

  async #setupTransport(): Promise<void> {
    const transport = await this.#getStoredTransport();
    if (transport) {
      if (!this.transport.isConnected()) {
        this.status = 'connecting';
        await this.transport.connect();
      }
      this.status = 'connected';
      if (this.transport instanceof MWPTransport) {
        await this.storage.setTransport(TransportType.MWP);
      } else {
        await this.storage.setTransport(TransportType.Browser);
      }
    } else {
      this.status = 'loaded';
    }
  }

  async #init(): Promise<void> {
    try {
      await this.#setupAnalytics();
      await this.#setupTransport();
      try {
        const baseProps = await getBaseAnalyticsProperties(
          this.options,
          this.storage,
        );
        analytics.track('mmconnect_initialized', baseProps);
      } catch (error) {
        logger('Error tracking initialized event', error);
      }
    } catch (error) {
      await this.storage.removeTransport();
      this.status = 'pending';
      logger('MetaMaskSDK error during initialization', error);
    }
  }

  async #createDappClient(): Promise<DappClient> {
    const { adapter: kvstore } = this.options.storage;
    const sessionstore = new SessionStore(kvstore);
    const websocket =
      // eslint-disable-next-line no-negated-condition
      typeof window !== 'undefined'
        ? WebSocket
        : (await import('ws')).WebSocket;
    const transport = await WebSocketTransport.create({
      url: MWP_RELAY_URL,
      kvstore,
      websocket,
    });
    const dappClient = new DappClient({ transport, sessionstore, keymanager });
    return dappClient;
  }

  async #setupMWP(): Promise<void> {
    if (this.#transport instanceof MWPTransport) {
      return;
    }
    // Only setup MWP if it is not already mwp
    const { adapter: kvstore } = this.options.storage;
    const dappClient = await this.#createDappClient();
    this.#dappClient = dappClient;
    const apiTransport = new MWPTransport(dappClient, kvstore);
    this.#transport = apiTransport;
    this.#providerTransportWrapper.setupTransportNotifcationListener();
    this.#listener = this.transport.onNotification(
      this.#onTransportNotification.bind(this),
    );
    await this.storage.setTransport(TransportType.MWP);
  }

  async #onBeforeUnload(): Promise<void> {
    // Fixes glitch with "connecting" state when modal is still visible and we close screen or refresh
    if (this.options.ui.factory.modal?.isMounted) {
      await this.storage.removeTransport();
    }
  }

  #createBeforeUnloadListener(): () => void {
    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener !== 'undefined'
    ) {
      window.addEventListener('beforeunload', this.#onBeforeUnload.bind(this));
    }
    return () => {
      if (
        typeof window !== 'undefined' &&
        typeof window.removeEventListener !== 'undefined'
      ) {
        window.removeEventListener(
          'beforeunload',
          this.#onBeforeUnload.bind(this),
        );
      }
    };
  }

  async #renderInstallModalAsync(
    desktopPreferred: boolean,
    scopes: Scope[],
    caipAccountIds: CaipAccountId[],
    sessionProperties?: SessionProperties,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Use Connection Modal
      this.options.ui.factory
        .renderInstallModal(
          desktopPreferred,
          async () => {
            if (
              this.dappClient.state === 'CONNECTED' ||
              this.dappClient.state === 'CONNECTING'
            ) {
              await this.dappClient.disconnect();
            }
            return new Promise<ConnectionRequest>((_resolve) => {
              this.dappClient.on(
                'session_request',
                (sessionRequest: SessionRequest) => {
                  _resolve({
                    sessionRequest,
                    metadata: {
                      dapp: this.options.dapp,
                      sdk: {
                        version: getVersion(),
                        platform: getPlatformType(),
                      },
                    },
                  });
                },
              );

              (async (): Promise<void> => {
                try {
                  await this.transport.connect({
                    scopes,
                    caipAccountIds,
                    sessionProperties,
                  });
                  await this.options.ui.factory.unload();
                  this.options.ui.factory.modal?.unmount();
                  this.status = 'connected';
                  await this.storage.setTransport(TransportType.MWP);
                } catch (error) {
                  if (error instanceof ProtocolError) {
                    // Ignore Request expired errors to allow modal to regenerate expired qr codes
                    if (error.code !== ErrorCode.REQUEST_EXPIRED) {
                      this.status = 'disconnected';
                      // Close the modal on error
                      await this.options.ui.factory.unload(error);
                      reject(error);
                    }
                    // If request is expires, the QRCode will automatically be regenerated we can ignore this case
                  } else {
                    this.status = 'disconnected';
                    const normalizedError =
                      error instanceof Error ? error : new Error(String(error));
                    // Close the modal on error
                    await this.options.ui.factory.unload(normalizedError);
                    reject(normalizedError);
                  }
                }
              })().catch(() => {
                // Error already handled in the async function
              });
            });
          },
          async (error?: Error) => {
            if (error) {
              await this.storage.removeTransport();
              reject(error);
            } else {
              await this.storage.setTransport(TransportType.MWP);
              resolve();
            }
          },
          (uri: string) => {
            this.emit('display_uri', uri);
          },
        )
        .catch((error) => {
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }

  async #showInstallModal(
    desktopPreferred: boolean,
    scopes: Scope[],
    caipAccountIds: CaipAccountId[],
    sessionProperties?: SessionProperties,
  ): Promise<void> {
    // create the listener only once to avoid memory leaks
    this.#beforeUnloadListener ??= this.#createBeforeUnloadListener();

    // In headless mode, don't render UI but still emit display_uri events
    if (this.options.ui.headless) {
      await this.#headlessConnect(scopes, caipAccountIds, sessionProperties);
    } else {
      await this.#renderInstallModalAsync(
        desktopPreferred,
        scopes,
        caipAccountIds,
        sessionProperties,
      );
    }
  }

  /**
   * Handles connection in headless mode without rendering any UI.
   * Emits display_uri events to allow consumers to build custom QR code UI.
   *
   * @param scopes - The requested permission scopes
   * @param caipAccountIds - The requested account IDs
   * @param sessionProperties - Optional session properties
   */
  async #headlessConnect(
    scopes: Scope[],
    caipAccountIds: CaipAccountId[],
    sessionProperties?: SessionProperties,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (
        this.dappClient.state === 'CONNECTED' ||
        this.dappClient.state === 'CONNECTING'
      ) {
        this.dappClient.disconnect().catch(() => {
          // Ignore disconnect errors
        });
      }

      // Listen for session_request to generate and emit the QR code link
      this.dappClient.on(
        'session_request',
        (sessionRequest: SessionRequest) => {
          const connectionRequest: ConnectionRequest = {
            sessionRequest,
            metadata: {
              dapp: this.options.dapp,
              sdk: {
                version: getVersion(),
                platform: getPlatformType(),
              },
            },
          };

          // Generate and emit the QR code link
          const deeplink =
            this.options.ui.factory.createConnectionDeeplink(connectionRequest);
          this.emit('display_uri', deeplink);
        },
      );

      // Start the connection
      this.transport
        .connect({ scopes, caipAccountIds, sessionProperties })
        .then(async () => {
          this.status = 'connected';
          await this.storage.setTransport(TransportType.MWP);
          resolve();
        })
        .catch(async (error) => {
          if (error instanceof ProtocolError) {
            // In headless mode, we don't auto-regenerate QR codes
            // since there's no modal to display them
            this.status = 'disconnected';
            await this.storage.removeTransport();
            reject(error);
          } else {
            this.status = 'disconnected';
            await this.storage.removeTransport();
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
    });
  }

  async #setupDefaultTransport(): Promise<DefaultTransport> {
    this.status = 'connecting';
    await this.storage.setTransport(TransportType.Browser);
    const transport = new DefaultTransport();
    this.#listener = transport.onNotification(
      this.#onTransportNotification.bind(this),
    );
    this.#transport = transport;
    this.#providerTransportWrapper.setupTransportNotifcationListener();
    return transport;
  }

  async #deeplinkConnect(
    scopes: Scope[],
    caipAccountIds: CaipAccountId[],
    sessionProperties?: SessionProperties,
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      // Handle the response to the initial wallet_createSession request
      const dappClientMessageHandler = (payload: unknown): void => {
        if (
          typeof payload !== 'object' ||
          payload === null ||
          !('data' in payload)
        ) {
          return;
        }
        const data = payload.data as { result?: SessionData; error?: unknown };
        if (typeof data === 'object' && data !== null) {
          // optimistically assume any error is due to the initial wallet_createSession request failure
          if (data.error) {
            this.dappClient.off('message', dappClientMessageHandler);
            reject(data.error as Error);
          }
          // if sessionScopes is set in the result, then this is a response to wallet_createSession
          if (data?.result?.sessionScopes) {
            this.dappClient.off('message', dappClientMessageHandler);
            // unsure if we need to call resolve here like we do above for reject()
          }
        }
      };
      this.dappClient.on('message', dappClientMessageHandler);

      let timeout: NodeJS.Timeout | undefined;

      if (this.transport.isConnected()) {
        timeout = setTimeout(() => {
          this.openDeeplinkIfNeeded();
        }, 250);
      } else {
        this.dappClient.once(
          'session_request',
          (sessionRequest: SessionRequest) => {
            const connectionRequest = {
              sessionRequest,
              metadata: {
                dapp: this.options.dapp,
                sdk: { version: getVersion(), platform: getPlatformType() },
              },
            };
            const deeplink =
              this.options.ui.factory.createConnectionDeeplink(
                connectionRequest,
              );
            const universalLink =
              this.options.ui.factory.createConnectionUniversalLink(
                connectionRequest,
              );

            // Emit display_uri event for deeplink connections
            this.emit('display_uri', deeplink);

            if (this.options.mobile?.preferredOpenLink) {
              this.options.mobile.preferredOpenLink(deeplink, '_self');
            } else {
              openDeeplink(this.options, deeplink, universalLink);
            }
          },
        );
      }

      return this.transport
        .connect({ scopes, caipAccountIds, sessionProperties })
        .then(resolve)
        .catch(async (error) => {
          await this.storage.removeTransport();
          this.dappClient.off('message', dappClientMessageHandler);
          reject(error instanceof Error ? error : new Error(String(error)));
        })
        .finally(() => {
          if (timeout) {
            clearTimeout(timeout);
          }
        });
    });
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
    if (this.status !== 'connected') {
      await this.disconnect();
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

    const {
      requestedScopes,
      requestedCaipAccountIds,
      requestedSessionProperties,
    } = mergeRequestedSessionWithExisting(
      sessionData,
      scopes,
      caipAccountIds,
      sessionProperties,
    );

    // Needed because empty object will cause wallet_createSession to return an error
    const nonEmptySessionProperties =
      Object.keys(requestedSessionProperties ?? {}).length > 0
        ? requestedSessionProperties
        : undefined;

    if (this.#transport?.isConnected() && !secure) {
      return this.#handleConnection(
        this.#transport
          .connect({
            scopes: requestedScopes,
            caipAccountIds: requestedCaipAccountIds,
            sessionProperties: nonEmptySessionProperties,
            forceRequest,
          })
          .then(async () => {
            if (this.#transport instanceof MWPTransport) {
              return this.storage.setTransport(TransportType.MWP);
            }
            return this.storage.setTransport(TransportType.Browser);
          }),
        scopes,
        transportType,
      );
    }

    // In MetaMask Mobile In App Browser, window.ethereum is available directly
    if (platformType === PlatformType.MetaMaskMobileWebview) {
      const defaultTransport = await this.#setupDefaultTransport();
      return this.#handleConnection(
        defaultTransport.connect({
          scopes: requestedScopes,
          caipAccountIds: requestedCaipAccountIds,
          sessionProperties: nonEmptySessionProperties,
          forceRequest,
        }),
        scopes,
        transportType,
      );
    }

    if (isWeb && hasExtensionInstalled && preferExtension) {
      // If metamask extension is available, connect to it
      const defaultTransport = await this.#setupDefaultTransport();
      // Web transport has no initial payload
      return this.#handleConnection(
        defaultTransport.connect({
          scopes: requestedScopes,
          caipAccountIds: requestedCaipAccountIds,
          sessionProperties: nonEmptySessionProperties,
          forceRequest,
        }),
        scopes,
        transportType,
      );
    }

    // Connection will now be InstallModal + QRCodes or Deeplinks, both require mwp
    await this.#setupMWP();

    // Determine preferred option for install modal
    const shouldShowInstallModal = hasExtensionInstalled
      ? showInstallModal
      : !preferExtension || showInstallModal;

    if (secure && !shouldShowInstallModal) {
      // Desktop is not preferred option, so we use deeplinks (mobile web)
      return this.#handleConnection(
        this.#deeplinkConnect(
          scopes,
          caipAccountIds,
          nonEmptySessionProperties,
        ),
        scopes,
        transportType,
      );
    }

    // Show install modal for RN, Web + Node
    return this.#handleConnection(
      this.#showInstallModal(
        shouldShowInstallModal,
        requestedScopes,
        requestedCaipAccountIds,
        nonEmptySessionProperties,
      ),
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
    if (this.status !== 'connected') {
      const response = await this.transport.request({
        method: 'wallet_getSession',
      });
      if (response.result) {
        sessionData = response.result as SessionData;
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

    await this.#transport?.disconnect(scopes);

    if (remainingScopes.length === 0) {
      await this.#listener?.();
      this.#beforeUnloadListener?.();

      await this.storage.removeTransport();

      this.#listener = undefined;
      this.#beforeUnloadListener = undefined;
      this.#transport = undefined;
      this.#providerTransportWrapper.clearTransportNotifcationListener();
      this.#dappClient = undefined;
      this.status = 'disconnected';
    }

    const newSessionScopes = Object.fromEntries(
      Object.entries(sessionData.sessionScopes).filter(([key]) =>
        remainingScopes.includes(key),
      ),
    );

    // in theory this is only needed for MWP
    this.emit('wallet_sessionChanged', { sessionScopes: newSessionScopes });
  }

  async invokeMethod(request: InvokeMethodOptions): Promise<Json> {
    const { transport, options } = this;

    const rpcClient = new RpcClient(options, this.#sdkInfo);
    const requestRouter = new RequestRouter(transport, rpcClient, options);
    // TODO: need read only method support for solana
    return requestRouter.invokeMethod(request);
  }

  // DRY THIS WITH REQUEST ROUTER
  openDeeplinkIfNeeded(): void {
    const { ui, mobile } = this.options;
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
          openDeeplink(this.options, url, METAMASK_CONNECT_BASE_URL);
        }
      }, 10); // small delay to ensure the message encryption and dispatch completes
    }
  }

  async emitSessionChanged(): Promise<void> {
    if (this.status !== 'connected' && this.status !== 'connecting') {
      this.emit('wallet_sessionChanged', { sessionScopes: {} });
    } else {
      const response = await this.transport.request({
        method: 'wallet_getSession',
      });
      if (response.result) {
        this.emit('wallet_sessionChanged', response.result);
      } else {
        this.emit('wallet_sessionChanged', { sessionScopes: {} });
      }
    }
  }
}
