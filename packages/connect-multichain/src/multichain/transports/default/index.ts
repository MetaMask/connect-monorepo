import type { Session } from '@metamask/mobile-wallet-protocol-core';
import type { SessionRequest } from '@metamask/mobile-wallet-protocol-dapp-client';
import {
  type SessionProperties,
  type CreateSessionParams,
  getDefaultTransport,
  type Transport,
  type TransportRequest,
  type TransportResponse,
} from '@metamask/multichain-api-client';
import type { CaipAccountId } from '@metamask/utils';
import type { ExtendedTransport, RPCAPI, Scope, SessionData } from 'src/domain';

import {
  addValidAccounts,
  getOptionalScopes,
  getValidAccounts,
  isSameScopesAndAccounts,
} from '../../utils';

const DEFAULT_REQUEST_TIMEOUT = 60 * 1000;

type PendingRequest = {
  resolve: (value: TransportResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

export class DefaultTransport implements ExtendedTransport {
  readonly #notificationCallbacks: Set<(data: unknown) => void> = new Set();

  readonly #transport: Transport = getDefaultTransport();

  readonly #defaultRequestOptions = {
    timeout: DEFAULT_REQUEST_TIMEOUT,
  };

  // Use timestamp-based ID to avoid conflicts across disconnect/reconnect cycles
  #reqId = Date.now();

  readonly #pendingRequests = new Map<string, PendingRequest>();

  #handleResponseListener: ((event: MessageEvent) => void) | undefined;

  #handleNotificationListener: ((event: MessageEvent) => void) | undefined;

  #notifyCallbacks(data: unknown): void {
    for (const callback of this.#notificationCallbacks) {
      try {
        callback(data);
      } catch (error) {
        console.log(
          '[WindowPostMessageTransport] notifyCallbacks error:',
          error,
        );
      }
    }
  }

  #isMetamaskProviderEvent(event: MessageEvent): boolean {
    return (
      event?.data?.data?.name === 'metamask-provider' &&
      // eslint-disable-next-line no-restricted-globals
      event.origin === location.origin
    );
  }

  #handleResponse(event: MessageEvent): void {
    if (!this.#isMetamaskProviderEvent(event)) {
      return;
    }

    const responseData = event?.data?.data?.data;

    // Ignore requests (they have 'method' field) - only process responses
    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'method' in responseData
    ) {
      return;
    }

    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'id' in responseData &&
      ('result' in responseData || 'error' in responseData)
    ) {
      const responseId = String(responseData.id);

      const pendingRequest = this.#pendingRequests.get(responseId);
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        this.#pendingRequests.delete(responseId);

        const response = responseData as TransportResponse;
        if ('error' in response && response.error) {
          pendingRequest.reject(
            new Error(response.error.message || 'Request failed'),
          );
        } else {
          pendingRequest.resolve(response);
        }
      }
    }
  }

  #handleNotification(event: MessageEvent): void {
    if (!this.#isMetamaskProviderEvent(event)) {
      return;
    }

    const responseData = event?.data?.data?.data;

    if (
      (typeof responseData === 'object' &&
        responseData.method === 'metamask_chainChanged') ||
      responseData.method === 'metamask_accountsChanged'
    ) {
      this.#notifyCallbacks(responseData);
    }
  }

  #setupMessageListener(): void {
    // Only set up listener if it's not already set up for this instance
    if (this.#handleResponseListener) {
      return;
    }

    // Create a new handler bound to this instance
    // Rename this to handleResponse or something like this
    this.#handleResponseListener = this.#handleResponse.bind(this);
    this.#handleNotificationListener = this.#handleNotification.bind(this);

    // Add the listener
    // eslint-disable-next-line no-restricted-globals
    window.addEventListener('message', this.#handleResponseListener);
    // eslint-disable-next-line no-restricted-globals
    window.addEventListener('message', this.#handleNotificationListener);
  }

  async sendEip1193Message<
    TRequest extends TransportRequest,
    TResponse extends TransportResponse,
  >(payload: TRequest, options?: { timeout?: number }): Promise<TResponse> {
    // Setup message listener if not already set up
    this.#setupMessageListener();

    // Generate unique request ID - increment counter to ensure uniqueness
    this.#reqId += 1;
    const requestId = `${this.#reqId}`;

    // Create request with ID - MetaMask expects JSON-RPC format
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      ...payload,
    };

    return new Promise<TResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, options?.timeout ?? this.#defaultRequestOptions.timeout);

      this.#pendingRequests.set(requestId, {
        resolve: (response: TransportResponse) => {
          resolve(response as TResponse);
        },
        reject,
        timeout,
      });

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
    });
  }

  async connect(options?: {
    scopes: Scope[];
    caipAccountIds: CaipAccountId[];
    sessionProperties?: SessionProperties;
    forceRequest?: boolean;
  }): Promise<void> {
    // Ensure message listener is set up before connecting
    this.#setupMessageListener();

    await this.#transport.connect();

    // Get wallet session
    const sessionRequest = await this.request(
      { method: 'wallet_getSession' },
      this.#defaultRequestOptions,
    );
    if (sessionRequest.error) {
      throw new Error(sessionRequest.error.message);
    }
    let walletSession = sessionRequest.result as SessionData;

    const createSessionParams: CreateSessionParams<RPCAPI> = {
      optionalScopes: addValidAccounts(
        getOptionalScopes(options?.scopes ?? []),
        getValidAccounts(options?.caipAccountIds ?? []),
      ),
      sessionProperties: options?.sessionProperties,
    };

    if (walletSession && options && !options.forceRequest) {
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
        const response = await this.request(
          { method: 'wallet_createSession', params: createSessionParams },
          this.#defaultRequestOptions,
        );
        if (response.error) {
          throw new Error(response.error.message);
        }
        walletSession = response.result as SessionData;
      }
    } else if (!walletSession || options?.forceRequest) {
      const response = await this.request(
        { method: 'wallet_createSession', params: createSessionParams },
        this.#defaultRequestOptions,
      );
      if (response.error) {
        throw new Error(response.error.message);
      }
      walletSession = response.result as SessionData;
    }
    this.#notifyCallbacks({
      method: 'wallet_sessionChanged',
      params: walletSession,
    });
  }

  async disconnect(scopes: Scope[] = []): Promise<void> {
    await this.request({ method: 'wallet_revokeSession', params: { scopes } });

    const response = await this.request({ method: 'wallet_getSession' });
    const { sessionScopes } = response.result as SessionData;

    if (Object.keys(sessionScopes).length > 0) {
      return;
    }

    this.#notificationCallbacks.clear();

    // Remove the message listener when disconnecting
    if (this.#handleResponseListener) {
      // eslint-disable-next-line no-restricted-globals
      window.removeEventListener('message', this.#handleResponseListener);
      this.#handleResponseListener = undefined;
    }

    // Remove the notification listener when disconnecting
    if (this.#handleNotificationListener) {
      // eslint-disable-next-line no-restricted-globals
      window.removeEventListener('message', this.#handleNotificationListener);
      this.#handleNotificationListener = undefined;
    }

    // Reject all pending requests
    for (const [, request] of this.#pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Transport disconnected'));
    }
    this.#pendingRequests.clear();

    await this.#transport.disconnect();
  }

  isConnected(): boolean {
    return this.#transport.isConnected();
  }

  async request<
    TRequest extends TransportRequest,
    TResponse extends TransportResponse,
  >(
    request: TRequest,
    options: { timeout?: number } = this.#defaultRequestOptions,
  ): Promise<TResponse> {
    return this.#transport.request(request, options);
  }

  onNotification(callback: (data: unknown) => void): () => void {
    this.#transport.onNotification(callback);
    this.#notificationCallbacks.add(callback);
    return () => {
      this.#notificationCallbacks.delete(callback);
    };
  }

  async getActiveSession(): Promise<Session | undefined> {
    // This code path should never be triggered when the DefaultTransport is being used
    // It's only purpose is for exposing the session ID used for deeplinking to the mobile app
    // and so it is only implemented for the MWPTransport.
    throw new Error(
      'getActiveSession is purposely not implemented for the DefaultTransport',
    );
  }

  async getStoredSessionRequest(): Promise<SessionRequest | null> {
    throw new Error(
      'getStoredSessionRequest is purposely not implemented for the DefaultTransport',
    );
  }
}
