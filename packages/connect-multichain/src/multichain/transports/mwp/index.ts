/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable consistent-return */
/* eslint-disable no-plusplus */
/* eslint-disable promise/param-names */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable id-denylist */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-restricted-globals */
/* eslint-disable @typescript-eslint/parameter-properties */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/prefer-readonly */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-async-promise-executor -- Async promise executor needed for complex flow */
import type {
  Session,
  SessionRequest,
} from '@metamask/mobile-wallet-protocol-core';
import { SessionStore } from '@metamask/mobile-wallet-protocol-core';
import type { DappClient } from '@metamask/mobile-wallet-protocol-dapp-client';
import {
  type SessionProperties,
  type CreateSessionParams,
  type TransportRequest,
  type TransportResponse,
  TransportTimeoutError,
} from '@metamask/multichain-api-client';
import { providerErrors, rpcErrors } from '@metamask/rpc-errors';
import type { CaipAccountId } from '@metamask/utils';

import {
  createLogger,
  type ExtendedTransport,
  type RPCAPI,
  type Scope,
  type SessionData,
  type StoreAdapter,
} from '../../../domain';
import {
  addValidAccounts,
  getOptionalScopes,
  getValidAccounts,
  isSameScopesAndAccounts,
} from '../../utils';
import { MULTICHAIN_PROVIDER_STREAM_NAME } from '../constants';

const DEFAULT_REQUEST_TIMEOUT = 60 * 1000;
const CONNECTION_GRACE_PERIOD = 60 * 1000;
const DEFAULT_CONNECTION_TIMEOUT =
  DEFAULT_REQUEST_TIMEOUT + CONNECTION_GRACE_PERIOD;
const DEFAULT_RESUME_TIMEOUT = 10 * 1000;
const SESSION_STORE_KEY = 'cache_wallet_getSession';
const ACCOUNTS_STORE_KEY = 'cache_eth_accounts';
const CHAIN_STORE_KEY = 'cache_eth_chainId';
const PENDING_SESSION_REQUEST_KEY = 'pending_session_request';

const CACHED_METHOD_LIST = [
  'wallet_getSession',
  'wallet_createSession',
  'wallet_sessionChanged',
];
const CACHED_RESET_METHOD_LIST = [
  'wallet_revokeSession',
  'wallet_revokePermissions',
];

type PendingRequests = {
  request: { jsonrpc: string; id: string } & TransportRequest;
  method: string;
  resolve: (value: TransportResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

const logger = createLogger('metamask-sdk:transport');

/**
 * Mobile Wallet Protocol transport implementation
 * Bridges the MWP DappClient with the multichain API client Transport interface
 */
export class MWPTransport implements ExtendedTransport {
  private __reqId = 0;

  private __pendingRequests = new Map<string, PendingRequests>();

  private notificationCallbacks = new Set<(data: unknown) => void>();

  private currentSessionRequest: SessionRequest | undefined;

  private windowFocusHandler: (() => void) | undefined;

  get pendingRequests() {
    return this.__pendingRequests;
  }

  set pendingRequests(pendingRequests: Map<string, PendingRequests>) {
    this.__pendingRequests = pendingRequests;
  }

  get sessionRequest() {
    return this.currentSessionRequest;
  }

  constructor(
    private dappClient: DappClient,
    private kvstore: StoreAdapter,
    private options: {
      requestTimeout: number;
      connectionTimeout: number;
      resumeTimeout: number;
    } = {
      requestTimeout: DEFAULT_REQUEST_TIMEOUT,
      connectionTimeout: DEFAULT_CONNECTION_TIMEOUT,
      resumeTimeout: DEFAULT_RESUME_TIMEOUT,
    },
  ) {
    this.dappClient.on('message', this.handleMessage.bind(this));
    this.dappClient.on('session_request', (sessionRequest: SessionRequest) => {
      this.currentSessionRequest = sessionRequest;
      this.kvstore
        .set(PENDING_SESSION_REQUEST_KEY, JSON.stringify(sessionRequest))
        .catch((err) => {
          logger('Failed to store pending session request', err);
        });
    });
    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener !== 'undefined'
    ) {
      this.windowFocusHandler = this.onWindowFocus.bind(this);
      window.addEventListener('focus', this.windowFocusHandler);
    }
  }

  private async removeStoredSessionRequest(): Promise<void> {
    await this.kvstore.delete(PENDING_SESSION_REQUEST_KEY);
  }

  /**
   * Returns the stored pending session request from the dappClient session_request event, if any.
   *
   * @returns The stored SessionRequest, or null if none or invalid.
   */
  async getStoredSessionRequest(): Promise<SessionRequest | null> {
    try {
      const raw = await this.kvstore.get(PENDING_SESSION_REQUEST_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as SessionRequest;
    } catch {
      return null;
    }
  }

  private onWindowFocus(): void {
    if (!this.isConnected()) {
      this.dappClient.reconnect();
    }
  }

  private notifyCallbacks(data: unknown): void {
    this.notificationCallbacks.forEach((callback) => callback(data));
  }

  private rejectRequest(
    id: string,
    error = new Error('Request rejected'),
  ): void {
    const request = this.pendingRequests.get(id);
    if (request) {
      this.pendingRequests.delete(id);
      clearTimeout(request.timeout);
      request.reject(error);
    }
  }

  private parseWalletError(errorPayload: unknown): Error {
    const errorData = errorPayload as Record<string, unknown>;

    if (
      typeof errorData.code === 'number' &&
      typeof errorData.message === 'string'
    ) {
      return providerErrors.custom({
        code: errorData.code,
        message: errorData.message,
      });
    }

    const message =
      errorPayload instanceof Error
        ? errorPayload.message
        : JSON.stringify(errorPayload);

    return rpcErrors.internal({ message });
  }

  private handleMessage(message: unknown): void {
    if (typeof message === 'object' && message !== null) {
      if ('data' in message) {
        const messagePayload = message.data as Record<string, unknown>;

        if ('id' in messagePayload && typeof messagePayload.id === 'string') {
          const request = this.pendingRequests.get(messagePayload.id);

          if (request) {
            clearTimeout(request.timeout);

            // Check if the message contains an error (e.g., user rejected)
            if ('error' in messagePayload && messagePayload.error) {
              this.pendingRequests.delete(messagePayload.id);
              request.reject(this.parseWalletError(messagePayload.error));
              return;
            }

            // Success case - resolve the promise
            const requestWithName = {
              ...messagePayload,
              method:
                request.method === 'wallet_getSession' ||
                request.method === 'wallet_createSession'
                  ? 'wallet_sessionChanged'
                  : request.method,
            } as unknown as {
              jsonrpc: string;
              id: string;
            } & TransportResponse;

            const notification = {
              ...messagePayload,
              method:
                request.method === 'wallet_getSession' ||
                request.method === 'wallet_createSession'
                  ? 'wallet_sessionChanged'
                  : request.method,
              params: requestWithName.result,
            };

            this.notifyCallbacks(notification);
            request.resolve(requestWithName);
            this.pendingRequests.delete(messagePayload.id);
          }
        } else {
          if (
            (message.data as { method: string }).method ===
            'metamask_chainChanged'
          ) {
            this.kvstore.set(
              CHAIN_STORE_KEY,
              JSON.stringify(
                (message.data as { params: { chainId: number } }).params
                  .chainId,
              ),
            );
          }

          if (
            (message.data as { method: string }).method ===
            'metamask_accountsChanged'
          ) {
            this.kvstore.set(
              ACCOUNTS_STORE_KEY,
              JSON.stringify(
                (message.data as { params: { accounts: string[] } }).params,
              ),
            );
          }

          // Ensure session changes are always persisted to the store
          if (
            (message.data as { method: string }).method ===
            'wallet_sessionChanged'
          ) {
            const notification = message.data as {
              method: string;
              params: SessionData;
            };

            const response = {
              result: notification.params,
            };

            this.kvstore.set(SESSION_STORE_KEY, JSON.stringify(response));
          }

          this.notifyCallbacks(message.data);
        }
      }
    }
  }

  private async onResumeSuccess(
    resumeResolve: () => void,
    resumeReject: (err: Error) => void,
    options?: { scopes: Scope[]; caipAccountIds: CaipAccountId[] },
  ): Promise<void> {
    try {
      await this.waitForWalletSessionIfNotCached();
      const sessionRequest = await this.request({
        method: 'wallet_getSession',
      });
      // TODO: verify if this branching logic can ever be hit
      if (sessionRequest.error) {
        return resumeReject(new Error(sessionRequest.error.message));
      }
      let walletSession = sessionRequest.result as SessionData;
      if (walletSession && options) {
        const currentScopes = Object.keys(
          walletSession?.sessionScopes ?? {},
        ) as Scope[];
        const proposedScopes = options?.scopes ?? [];
        const proposedCaipAccountIds = options?.caipAccountIds ?? [];
        const hasSameScopesAndAccounts = isSameScopesAndAccounts(
          currentScopes,
          proposedScopes,
          walletSession,
          proposedCaipAccountIds,
        );
        if (!hasSameScopesAndAccounts) {
          const optionalScopes = addValidAccounts(
            getOptionalScopes(options?.scopes ?? []),
            getValidAccounts(options?.caipAccountIds ?? []),
          );
          const sessionRequest: CreateSessionParams<RPCAPI> = {
            optionalScopes,
          };
          const response = await this.request({
            method: 'wallet_createSession',
            params: sessionRequest,
          });
          if (response.error) {
            return resumeReject(new Error(response.error.message));
          }
          // TODO: Maybe find a better way to revoke sessions on wallet without triggering an empty notification
          // Issue of this is it will send a session update event with an empty session and right after we may get the session recovered
          // await this.request({ method: 'wallet_revokeSession', params: walletSession });
          walletSession = response.result as SessionData;
        }
      } else if (!walletSession) {
        // TODO: verify if this branching logic can ever be hit
        const optionalScopes = addValidAccounts(
          getOptionalScopes(options?.scopes ?? []),
          getValidAccounts(options?.caipAccountIds ?? []),
        );
        const sessionRequest: CreateSessionParams<RPCAPI> = { optionalScopes };
        const response = await this.request({
          method: 'wallet_createSession',
          params: sessionRequest,
        });
        if (response.error) {
          return resumeReject(new Error(response.error.message));
        }
        walletSession = response.result as SessionData;
      }
      await this.removeStoredSessionRequest();
      this.notifyCallbacks({
        method: 'wallet_sessionChanged',
        params: walletSession,
      });
      return resumeResolve();
    } catch (err) {
      return resumeReject(err as Error);
    }
  }

  // TODO: Rename this
  async sendEip1193Message<
    TRequest extends TransportRequest,
    TResponse extends TransportResponse,
  >(payload: TRequest, options?: { timeout?: number }): Promise<TResponse> {
    const request = {
      jsonrpc: '2.0',
      id: `${this.__reqId++}`,
      ...payload,
    };

    const cachedWalletSession = await this.getCachedResponse(request);
    if (cachedWalletSession) {
      this.notifyCallbacks(cachedWalletSession);
      return cachedWalletSession as TResponse;
    }

    return new Promise<TResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.rejectRequest(request.id, new TransportTimeoutError());
      }, options?.timeout ?? this.options.requestTimeout);

      this.pendingRequests.set(request.id, {
        request,
        method: request.method,
        resolve: async (response: TransportResponse) => {
          await this.storeWalletSession(request, response);
          return resolve(response as TResponse);
        },
        reject,
        timeout,
      });

      this.dappClient
        .sendRequest({
          name: 'metamask-provider',
          data: request,
        })
        .catch(reject);
    });
  }

  async connect(options?: {
    scopes: Scope[];
    caipAccountIds: CaipAccountId[];
    sessionProperties?: SessionProperties;
  }): Promise<void> {
    const { dappClient } = this;

    const session = await this.getActiveSession();
    if (session) {
      logger('active session found', session);
    }

    let timeout: NodeJS.Timeout;
    let initialConnectionMessageHandler:
      | ((message: unknown) => Promise<void>)
      | undefined;
    const connectionPromise = new Promise<void>(async (resolve, reject) => {
      let connection: Promise<void>;
      if (session) {
        connection = new Promise<void>((resumeResolve, resumeReject) => {
          if (this.dappClient.state === 'CONNECTED') {
            this.onResumeSuccess(resumeResolve, resumeReject, options);
          } else {
            this.dappClient.once('connected', async () => {
              this.onResumeSuccess(resumeResolve, resumeReject, options);
            });
            dappClient.resume(session?.id ?? '');
          }
        });
      } else {
        connection = new Promise<void>(
          (resolveConnection, rejectConnection) => {
            const optionalScopes = addValidAccounts(
              getOptionalScopes(options?.scopes ?? []),
              getValidAccounts(options?.caipAccountIds ?? []),
            );
            const sessionRequest: CreateSessionParams<RPCAPI> = {
              optionalScopes,
              sessionProperties: options?.sessionProperties,
            };
            const request = {
              jsonrpc: '2.0',
              id: `${this.__reqId++}`,
              method: 'wallet_createSession',
              params: sessionRequest,
            };

            // Handler for initial connection messages - checks for error responses
            // and properly rejects the connection promise with EIP-1193 error codes
            initialConnectionMessageHandler = async (
              message: unknown,
            ): Promise<void> => {
              if (typeof message !== 'object' || message === null) {
                return;
              }
              if (!('data' in message)) {
                return;
              }

              const messagePayload = message.data as Record<string, unknown>;

              // Match by ID (preferred) or by method (backward compatibility for notifications without ID)
              const isMatchingId = messagePayload.id === request.id;
              const isMatchingMethod =
                messagePayload.method === 'wallet_createSession' ||
                messagePayload.method === 'wallet_sessionChanged';

              if (!isMatchingId && !isMatchingMethod) {
                return;
              }

              // Handle error response (e.g., user rejected the connection)
              if (messagePayload.error) {
                return rejectConnection(
                  this.parseWalletError(messagePayload.error),
                );
              }

              // Success case - store session, notify, and resolve
              await this.storeWalletSession(
                request,
                messagePayload as TransportResponse,
              );
              await this.removeStoredSessionRequest();
              this.notifyCallbacks(messagePayload);
              return resolveConnection();
            };

            this.dappClient.on('message', initialConnectionMessageHandler);

            dappClient
              .connect({
                mode: 'trusted',
                initialPayload: {
                  name: MULTICHAIN_PROVIDER_STREAM_NAME,
                  data: request,
                },
              })
              .catch((error) => {
                if (initialConnectionMessageHandler) {
                  this.dappClient.off(
                    'message',
                    initialConnectionMessageHandler,
                  );
                }
                rejectConnection(error);
              });
          },
        );
      }

      timeout = setTimeout(() => {
        reject(new TransportTimeoutError());
      }, this.options.connectionTimeout);

      connection.then(resolve).catch(reject);
    });

    return connectionPromise
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        if (timeout) {
          clearTimeout(timeout);
        }
        if (initialConnectionMessageHandler) {
          this.dappClient.off('message', initialConnectionMessageHandler);
          initialConnectionMessageHandler = undefined;
        }
        this.removeStoredSessionRequest();
      });
  }

  /**
   * Disconnects from the Mobile Wallet Protocol
   *
   * @param [scopes] - The scopes to revoke. If not provided or empty, all scopes will be revoked.
   * @returns Nothing
   */
  async disconnect(scopes: Scope[] = []): Promise<void> {
    const cachedSession = await this.getCachedResponse({
      jsonrpc: '2.0',
      id: '0',
      method: 'wallet_getSession',
    });
    const cachedSessionScopes =
      (cachedSession?.result as SessionData | undefined)?.sessionScopes ?? {};

    const remainingScopes =
      scopes.length === 0
        ? []
        : Object.keys(cachedSessionScopes).filter(
            (scope) => !scopes.includes(scope as Scope),
          );

    const newSessionScopes = Object.fromEntries(
      Object.entries(cachedSessionScopes).filter(([key]) =>
        remainingScopes.includes(key),
      ),
    );

    // NOTE: Purposely not awaiting this to avoid blocking the disconnect flow.
    // This might not actually get executed on the wallet if the user doesn't open
    // their wallet before the message TTL or if the underlying transport isn't actually connected
    this.request({ method: 'wallet_revokeSession', params: { scopes } }).catch(
      (err) => {
        console.error('error revoking session', err);
      },
    );

    // Clear the cached values for eth_accounts and eth_chainId if all eip155 scopes were removed.
    const remainingScopesIncludeEip155 = remainingScopes.some((scope) =>
      scope.includes('eip155'),
    );
    if (!remainingScopesIncludeEip155) {
      this.kvstore.delete(ACCOUNTS_STORE_KEY);
      this.kvstore.delete(CHAIN_STORE_KEY);
    }

    if (remainingScopes.length > 0) {
      this.kvstore.set(
        SESSION_STORE_KEY,
        JSON.stringify({
          result: {
            sessionScopes: newSessionScopes,
          },
        }),
      );
    } else {
      this.kvstore.delete(SESSION_STORE_KEY);

      // Clean up window focus event listener
      if (
        typeof window !== 'undefined' &&
        typeof window.removeEventListener !== 'undefined' &&
        this.windowFocusHandler
      ) {
        window.removeEventListener('focus', this.windowFocusHandler);
        this.windowFocusHandler = undefined;
      }

      await this.dappClient.disconnect();
    }

    this.notifyCallbacks({
      method: 'wallet_sessionChanged',
      params: {
        sessionScopes: newSessionScopes,
      },
    });
  }

  /**
   * Checks if the transport is connected
   *
   * @returns True if transport is connected, false otherwise
   */
  isConnected(): boolean {
    // biome-ignore lint/suspicious/noExplicitAny:  required if state is not made public in dappClient
    return (this.dappClient as any).state === 'CONNECTED';
  }

  /**
   * Attempts to re-establish a connection via DappClient
   *
   * @returns Nothing
   */
  // TODO: We should re-evaluate adding this to the WebSocketTransport layer from `@metamask/mobile-wallet-protocol-core`
  // ticket: https://consensyssoftware.atlassian.net/browse/WAPI-862
  private async attemptResumeSession(): Promise<void> {
    try {
      await this.dappClient.reconnect();
      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Resume timeout'));
        }, 2_000);

        if (this.isConnected()) {
          clearTimeout(timeout);
          resolve();
        } else {
          this.dappClient.once('connected', () => {
            clearTimeout(timeout);
            resolve();
          });
        }
      });
    } catch (error) {
      return Promise.reject(
        new Error(`Failed to resume session: ${error.message}`),
      );
    }
  }

  private async getCachedResponse(
    request: { jsonrpc: string; id: string } & TransportRequest,
  ): Promise<TransportResponse | undefined> {
    if (request.method === 'wallet_getSession') {
      const walletGetSession = await this.kvstore.get(SESSION_STORE_KEY);
      if (walletGetSession) {
        const walletSession = JSON.parse(walletGetSession);
        return {
          id: request.id,
          jsonrpc: '2.0',
          result: walletSession.params ?? walletSession.result, // "what?... why walletSession.params?.."
          method: request.method,
        } as unknown as TransportResponse;
      }
    } else if (request.method === 'eth_accounts') {
      const ethAccounts = await this.kvstore.get(ACCOUNTS_STORE_KEY);
      if (ethAccounts) {
        return {
          id: request.id,
          jsonrpc: '2.0',
          result: JSON.parse(ethAccounts),
          method: request.method,
        } as unknown as TransportResponse;
      }
    } else if (request.method === 'eth_chainId') {
      const ethChainId = await this.kvstore.get(CHAIN_STORE_KEY);
      if (ethChainId) {
        return {
          id: request.id,
          jsonrpc: '2.0',
          result: JSON.parse(ethChainId),
          method: request.method,
        } as unknown as TransportResponse;
      }
    }
  }

  private async storeWalletSession(
    request: TransportRequest,
    response: TransportResponse,
  ): Promise<void> {
    if (response.error) {
      return;
    }
    if (CACHED_METHOD_LIST.includes(request.method)) {
      await this.kvstore.set(SESSION_STORE_KEY, JSON.stringify(response));
    } else if (request.method === 'eth_accounts') {
      await this.kvstore.set(
        ACCOUNTS_STORE_KEY,
        JSON.stringify(response.result),
      );
    } else if (request.method === 'eth_chainId') {
      await this.kvstore.set(CHAIN_STORE_KEY, JSON.stringify(response.result));
    } else if (CACHED_RESET_METHOD_LIST.includes(request.method)) {
      await this.kvstore.delete(SESSION_STORE_KEY);
      await this.kvstore.delete(ACCOUNTS_STORE_KEY);
      await this.kvstore.delete(CHAIN_STORE_KEY);
    }
  }

  async request<
    TRequest extends TransportRequest,
    TResponse extends TransportResponse,
  >(payload: TRequest, options?: { timeout?: number }): Promise<TResponse> {
    const request = {
      jsonrpc: '2.0',
      id: `${this.__reqId++}`,
      ...payload,
    };

    const cachedWalletSession = await this.getCachedResponse(request);
    if (cachedWalletSession) {
      this.notifyCallbacks(cachedWalletSession);
      return cachedWalletSession as TResponse;
    }

    if (!this.isConnected()) {
      await this.attemptResumeSession();
    }

    return new Promise<TResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.rejectRequest(request.id, new TransportTimeoutError());
      }, options?.timeout ?? this.options.requestTimeout);

      this.pendingRequests.set(request.id, {
        request,
        method: request.method,
        resolve: async (response: TransportResponse) => {
          await this.storeWalletSession(request, response);
          return resolve(response as TResponse);
        },
        reject,
        timeout,
      });

      this.dappClient
        .sendRequest({
          name: MULTICHAIN_PROVIDER_STREAM_NAME,
          data: request,
        })
        .catch(reject);
    });
  }

  onNotification(callback: (data: unknown) => void): () => void {
    this.notificationCallbacks.add(callback);
    return () => {
      this.notificationCallbacks.delete(callback);
    };
  }

  async getActiveSession(): Promise<Session | undefined> {
    const { kvstore } = this;
    const sessionStore = new SessionStore(kvstore);

    try {
      const [activeSession] = await sessionStore.list();
      return activeSession;
    } catch (error) {
      // TODO: verify if this try catch is necessary
      logger('error getting active session', error);
      return undefined;
    }
  }

  // This method checks if an existing CAIP session response is cached or waits for one
  // to be received from the wallet if not cached. This is necessary because there is an edge
  // case during the initial connection flow where after the user has accepted the permission approval
  // and returned back to the dapp from the wallet, the dapp page may have gotten unloaded and refreshed.
  // When it is unloaded and refreshed, it will try to resume the session by making a request for wallet_getSession
  // which should resolve from cache, but because a race condition makes it possible for the response from the wallet
  // for the initial wallet_createSession connection request to not have been handled and cached yet. This results
  // in the wallet_getSession request never resolving unless we wait for it explicitly as done in this method.
  private async waitForWalletSessionIfNotCached() {
    const cachedWalletGetSessionResponse =
      await this.kvstore.get(SESSION_STORE_KEY);
    if (cachedWalletGetSessionResponse) {
      return;
    }
    let unsubscribe: () => void;
    const responsePromise = new Promise<void>((resolve) => {
      unsubscribe = this.onNotification((message) => {
        if (typeof message === 'object' && message !== null) {
          if ('data' in message) {
            const messagePayload = message.data as Record<string, unknown>;
            if (
              messagePayload.method === 'wallet_getSession' ||
              messagePayload.method === 'wallet_sessionChanged'
            ) {
              unsubscribe();
              resolve();
            }
          }
        }
      });
    });

    const timeoutPromise = new Promise<void>((_resolve, reject) => {
      setTimeout(() => {
        unsubscribe();
        this.removeStoredSessionRequest();
        reject(new TransportTimeoutError());
      }, this.options.resumeTimeout);
    });

    return Promise.race([responsePromise, timeoutPromise]);
  }
}
