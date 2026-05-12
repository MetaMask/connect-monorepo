/* eslint-disable no-restricted-globals -- window is used intentionally for browser APIs */
/* eslint-disable no-async-promise-executor -- Async promise executor needed for connect flow */
/* eslint-disable @typescript-eslint/no-misused-promises -- Async listeners in MWP callbacks */
/* eslint-disable @typescript-eslint/naming-convention -- External property/event names */
/* eslint-disable promise/always-return -- Promise executor event handlers */
import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';
import type { DappClient } from '@metamask/mobile-wallet-protocol-dapp-client';
import type { SessionData } from '@metamask/multichain-api-client';

import type {
  Connection,
  ConnectionContext,
  ConnectionEvents,
  MwpConnectParams,
} from './types';
import {
  METAMASK_CONNECT_BASE_URL,
  METAMASK_DEEPLINK_BASE,
  MWP_RELAY_URL,
} from '../../config';
import {
  type ConnectionRequest,
  type ConnectionStatus,
  getVersion,
  type Scope,
  TransportType,
} from '../../domain';
import { EventEmitter } from '../../domain/events';
import { getPlatformType, isSecure } from '../../domain/platform';
import { MWPTransport } from '../transports/mwp';
import { openDeeplink } from '../utils';

/**
 * Strategy that talks to MetaMask Mobile over the Mobile Wallet Protocol
 * (MWP). Owns the `DappClient`/WebSocket lifecycle, the install-modal /
 * deeplink / headless sub-flows, and any deeplinks emitted to nudge the
 * user back into the MetaMask app.
 */
export class MwpConnection
  extends EventEmitter<ConnectionEvents>
  implements Connection
{
  readonly type = TransportType.MWP;

  readonly #ctx: ConnectionContext;

  readonly #dappClient: DappClient;

  readonly #transport: MWPTransport;

  #notificationUnsubscribe: (() => void) | undefined;

  #beforeUnloadCleanup: (() => void) | undefined;

  // eslint-disable-next-line no-restricted-syntax -- Constructors can't use hash names; factory is preferred
  private constructor(
    ctx: ConnectionContext,
    dappClient: DappClient,
    transport: MWPTransport,
  ) {
    super();
    this.#ctx = ctx;
    this.#dappClient = dappClient;
    this.#transport = transport;
    this.#notificationUnsubscribe = transport.onNotification((data) => {
      this.emit('notification', data);
    });
  }

  /**
   * Factory that performs the async setup (dynamic imports, key manager,
   * websocket transport) needed before an MWP connection can be used.
   *
   * @param ctx - Shared connection context.
   * @returns A new `MwpConnection` with a ready-to-use `DappClient` and `MWPTransport`.
   */
  static async create(ctx: ConnectionContext): Promise<MwpConnection> {
    const dappClient = await MwpConnection.#createDappClient(ctx);
    const { adapter: kvstore } = ctx.options.storage;
    const transport = new MWPTransport(dappClient, kvstore);
    return new MwpConnection(ctx, dappClient, transport);
  }

  static async #createDappClient(ctx: ConnectionContext): Promise<DappClient> {
    const [mwpCore, { DappClient: DappClientClass }, { createKeyManager }] =
      await Promise.all([
        import('@metamask/mobile-wallet-protocol-core'),
        import('@metamask/mobile-wallet-protocol-dapp-client'),
        import('../transports/mwp/KeyManager'),
      ]);
    const keymanager = await createKeyManager();

    const { adapter: kvstore } = ctx.options.storage;
    const sessionstore = await mwpCore.SessionStore.create(kvstore);
    // Prefer the browser `WebSocket` when available; otherwise lazy-load the
    // `ws` package for Node so we don't pull a Node-only dep into bundles.
    const websocket =
      // eslint-disable-next-line no-negated-condition -- Matches existing readability preference
      typeof window !== 'undefined'
        ? WebSocket
        : (await import('ws')).WebSocket;
    const transport = await mwpCore.WebSocketTransport.create({
      url: MWP_RELAY_URL,
      kvstore,
      websocket,
    });
    return new DappClientClass({
      transport,
      sessionstore,
      keymanager,
    });
  }

  get transport(): MWPTransport {
    return this.#transport;
  }

  get dappClient(): DappClient {
    return this.#dappClient;
  }

  isConnected(): boolean {
    return this.#transport.isConnected();
  }

  /**
   * Execute one of the MWP sub-flows.
   *
   * @param params - The connect parameters plus a flow selector.
   */
  async connect(params: MwpConnectParams): Promise<void> {
    this.#installBeforeUnloadGuard();
    const { flow, desktopPreferred = false, ...rest } = params;

    switch (flow) {
      case 'deeplink':
        await this.#deeplinkConnect(rest);
        break;
      case 'headless':
        await this.#headlessConnect(rest);
        break;
      case 'install-modal':
        await this.#renderInstallModalAsync(desktopPreferred, rest);
        break;
      default:
        throw new Error(`Unknown MWP connect flow: ${String(flow)}`);
    }
  }

  async disconnect(scopes: Scope[] = []): Promise<void> {
    await this.#transport.disconnect(scopes);
  }

  async dispose(): Promise<void> {
    this.#notificationUnsubscribe?.();
    this.#beforeUnloadCleanup?.();
    this.#notificationUnsubscribe = undefined;
    this.#beforeUnloadCleanup = undefined;
  }

  // ── Public deeplink helpers ───────────────────────────────────────────────

  /**
   * Used by `connect-evm` (and similar) after a method invocation to nudge
   * the user back into the MetaMask app via a stored MWP session.
   */
  openSimpleDeeplinkIfNeeded(): void {
    const { ui, mobile } = this.#ctx.options;
    const { showInstallModal = false } = ui ?? {};
    const secure = isSecure();
    const shouldOpenDeeplink = secure && !showInstallModal;

    if (!shouldOpenDeeplink) {
      return;
    }

    setTimeout(async () => {
      const session = await this.#transport.getActiveSession();
      if (!session) {
        throw new Error('No active session found');
      }

      const url = `${METAMASK_DEEPLINK_BASE}/mwp?id=${encodeURIComponent(session.id)}`;
      if (mobile?.preferredOpenLink) {
        mobile.preferredOpenLink(url, '_self');
      } else {
        openDeeplink(this.#ctx.options, url, METAMASK_CONNECT_BASE_URL);
      }
    }, 10); // small delay to ensure the message encryption and dispatch completes
  }

  /**
   * Used when a fresh `connect()` call comes in while an MWP connection is
   * already in flight — opens a deeplink to the in-progress session so the
   * user is brought back to MetaMask Mobile to complete approval.
   */
  async openConnectDeeplinkIfNeeded(): Promise<void> {
    const { ui } = this.#ctx.options;
    const { showInstallModal = false } = ui ?? {};
    const secure = isSecure();
    const shouldOpenDeeplink = secure && !showInstallModal;

    if (!shouldOpenDeeplink) {
      return;
    }

    const storedSessionRequest =
      await this.#transport.getStoredPendingSessionRequest();
    if (!storedSessionRequest) {
      return;
    }

    const connectionRequest = {
      sessionRequest: storedSessionRequest,
      metadata: this.#buildConnectionMetadata(),
    };
    const deeplink =
      this.#ctx.options.ui.factory.createConnectionDeeplink(connectionRequest);

    const universalLink =
      this.#ctx.options.ui.factory.createConnectionUniversalLink(
        connectionRequest,
      );

    if (this.#ctx.options.mobile?.preferredOpenLink) {
      this.#ctx.options.mobile.preferredOpenLink(deeplink, '_self');
    } else {
      openDeeplink(this.#ctx.options, deeplink, universalLink);
    }
  }

  // ── Private sub-flow implementations (moved verbatim from MultichainClient) ──

  #buildConnectionMetadata(): ConnectionRequest['metadata'] {
    const metadata: ConnectionRequest['metadata'] = {
      dapp: this.#ctx.options.dapp,
      sdk: { version: getVersion(), platform: getPlatformType() },
    };
    if (this.#ctx.anonId) {
      metadata.analytics = { remote_session_id: this.#ctx.anonId };
    }
    return metadata;
  }

  #setStatus(status: ConnectionStatus): void {
    this.emit('status', status);
  }

  async #onBeforeUnload(): Promise<void> {
    // Fixes glitch with "connecting" state when modal is still visible and we close screen or refresh
    if (this.#ctx.options.ui.factory.modal?.isMounted) {
      await this.#ctx.options.storage.removeTransport();
    }
  }

  #installBeforeUnloadGuard(): void {
    if (this.#beforeUnloadCleanup) {
      return;
    }
    const handler = this.#onBeforeUnload.bind(this);

    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener !== 'undefined'
    ) {
      window.addEventListener('beforeunload', handler);
    }
    this.#beforeUnloadCleanup = (): void => {
      if (
        typeof window !== 'undefined' &&
        typeof window.removeEventListener !== 'undefined'
      ) {
        window.removeEventListener('beforeunload', handler);
      }
    };
  }

  async #renderInstallModalAsync(
    desktopPreferred: boolean,
    params: Omit<MwpConnectParams, 'flow' | 'desktopPreferred'>,
  ): Promise<void> {
    const { scopes, caipAccountIds, sessionProperties } = params;
    const { storage } = this.#ctx.options;
    return new Promise<void>((resolve, reject) => {
      // Use Connection Modal
      this.#ctx.options.ui.factory
        .renderInstallModal(
          desktopPreferred,
          async () => {
            if (
              this.#dappClient.state === 'CONNECTED' ||
              this.#dappClient.state === 'CONNECTING'
            ) {
              await this.#dappClient.disconnect();
            }
            return new Promise<ConnectionRequest>((_resolve) => {
              this.#dappClient.on(
                'session_request',
                (sessionRequest: SessionRequest) => {
                  _resolve({
                    sessionRequest,
                    metadata: this.#buildConnectionMetadata(),
                  });
                },
              );

              (async (): Promise<void> => {
                try {
                  await this.#transport.connect({
                    scopes,
                    caipAccountIds,
                    sessionProperties,
                  });
                  await this.#ctx.options.ui.factory.unload();
                  this.#ctx.options.ui.factory.modal?.unmount();
                  this.#setStatus('connected');
                  await storage.setTransport(TransportType.MWP);
                } catch (error) {
                  const { ProtocolError, ErrorCode } = await import(
                    '@metamask/mobile-wallet-protocol-core'
                  );
                  if (error instanceof ProtocolError) {
                    if (error.code !== ErrorCode.REQUEST_EXPIRED) {
                      this.#setStatus('disconnected');
                      // Close the modal on error
                      await this.#ctx.options.ui.factory.unload(error);
                      reject(error);
                    }
                    // If request expires, the QRCode will automatically be regenerated; ignore.
                  } else {
                    this.#setStatus('disconnected');
                    const normalizedError =
                      error instanceof Error ? error : new Error(String(error));
                    // Close the modal on error
                    await this.#ctx.options.ui.factory.unload(normalizedError);
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
              await storage.removeTransport();
              reject(error);
            } else {
              await storage.setTransport(TransportType.MWP);
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

  async #headlessConnect(
    params: Omit<MwpConnectParams, 'flow' | 'desktopPreferred'>,
  ): Promise<void> {
    const { scopes, caipAccountIds, sessionProperties } = params;
    const { storage } = this.#ctx.options;
    return new Promise<void>((resolve, reject) => {
      if (
        this.#dappClient.state === 'CONNECTED' ||
        this.#dappClient.state === 'CONNECTING'
      ) {
        this.#dappClient.disconnect().catch(() => {
          // Ignore disconnect errors
        });
      }

      // Listen for session_request to generate and emit the QR code link
      this.#dappClient.on(
        'session_request',
        (sessionRequest: SessionRequest) => {
          const connectionRequest: ConnectionRequest = {
            sessionRequest,
            metadata: this.#buildConnectionMetadata(),
          };

          const deeplink =
            this.#ctx.options.ui.factory.createConnectionDeeplink(
              connectionRequest,
            );
          this.emit('display_uri', deeplink);
        },
      );

      this.#transport
        .connect({ scopes, caipAccountIds, sessionProperties })
        .then(async () => {
          this.#setStatus('connected');
          await storage.setTransport(TransportType.MWP);
          resolve();
        })
        .catch(async (error) => {
          const { ProtocolError } = await import(
            '@metamask/mobile-wallet-protocol-core'
          );
          if (error instanceof ProtocolError) {
            // In headless mode, we don't auto-regenerate QR codes
            // since there's no modal to display them
            this.#setStatus('disconnected');
            await storage.removeTransport();
            reject(error);
          } else {
            this.#setStatus('disconnected');
            await storage.removeTransport();
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
    });
  }

  async #deeplinkConnect(
    params: Omit<MwpConnectParams, 'flow' | 'desktopPreferred'>,
  ): Promise<void> {
    const { scopes, caipAccountIds, sessionProperties } = params;
    const { storage } = this.#ctx.options;
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
            this.#dappClient.off('message', dappClientMessageHandler);
            reject(data.error as Error);
          }
          // if sessionScopes is set in the result, then this is a response to wallet_createSession
          if (data?.result?.sessionScopes) {
            this.#dappClient.off('message', dappClientMessageHandler);
            // unsure if we need to call resolve here like we do above for reject()
          }
        }
      };
      this.#dappClient.on('message', dappClientMessageHandler);

      let timeout: NodeJS.Timeout | undefined;

      if (this.#transport.isConnected()) {
        timeout = setTimeout(() => {
          this.openSimpleDeeplinkIfNeeded();
        }, 250);
      } else {
        this.#dappClient.once(
          'session_request',
          (sessionRequest: SessionRequest) => {
            const connectionRequest = {
              sessionRequest,
              metadata: this.#buildConnectionMetadata(),
            };
            const deeplink =
              this.#ctx.options.ui.factory.createConnectionDeeplink(
                connectionRequest,
              );
            const universalLink =
              this.#ctx.options.ui.factory.createConnectionUniversalLink(
                connectionRequest,
              );

            // Emit display_uri event for deeplink connections
            this.emit('display_uri', deeplink);

            if (this.#ctx.options.mobile?.preferredOpenLink) {
              this.#ctx.options.mobile.preferredOpenLink(deeplink, '_self');
            } else {
              openDeeplink(this.#ctx.options, deeplink, universalLink);
            }
          },
        );
      }

      return this.#transport
        .connect({ scopes, caipAccountIds, sessionProperties })
        .then(resolve)
        .catch(async (error) => {
          await storage.removeTransport();
          this.#dappClient.off('message', dappClientMessageHandler);
          reject(error instanceof Error ? error : new Error(String(error)));
        })
        .finally(() => {
          if (timeout) {
            clearTimeout(timeout);
          }
        });
    });
  }
}
