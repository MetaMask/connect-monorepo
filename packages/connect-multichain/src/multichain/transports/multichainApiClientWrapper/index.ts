/* eslint-disable no-restricted-syntax -- Private class properties use established patterns */
/* eslint-disable @typescript-eslint/explicit-function-return-type -- Inferred types are sufficient */
/* eslint-disable @typescript-eslint/parameter-properties -- Constructor shorthand is intentional */
/* eslint-disable no-plusplus -- Increment operator is safe here */
/* eslint-disable @typescript-eslint/no-floating-promises -- Promise is intentionally not awaited */
import type {
  CreateSessionParams,
  Transport,
  TransportRequest,
  TransportResponse,
} from '@metamask/multichain-api-client';
import { providerErrors } from '@metamask/rpc-errors';
import type { CaipAccountId } from '@metamask/utils';
import type { InvokeMethodOptions, RPCAPI, Scope } from 'src/domain';
import type { MetaMaskConnectMultichain } from 'src/multichain';

// uint32 (two's complement) max
// more conservative than Number.MAX_SAFE_INTEGER
const MAX = 4_294_967_295;
let idCounter = Math.floor(Math.random() * MAX);

const getUniqueId = (): number => {
  idCounter = (idCounter + 1) % MAX;
  return idCounter;
};

type TransportRequestWithId = TransportRequest & { id: number };

export class MultichainApiClientWrapperTransport implements Transport {
  #requestId = getUniqueId();

  readonly #notificationCallbacks = new Set<(data: unknown) => void>();

  constructor(
    private readonly metamaskConnectMultichain: MetaMaskConnectMultichain,
  ) {}

  isTransportDefined(): boolean {
    try {
      return Boolean(this.metamaskConnectMultichain.transport);
    } catch (_error) {
      return false;
    }
  }

  clearNotificationCallbacks(): void {
    this.#notificationCallbacks.clear();
  }

  notifyCallbacks(data: unknown): void {
    this.#notificationCallbacks.forEach((callback) => {
      callback(data);
    });
  }

  setupNotifcationListener(): void {
    this.metamaskConnectMultichain.transport.onNotification(
      this.notifyCallbacks.bind(this),
    );
  }

  async connect(): Promise<void> {
    console.log('📚 connect');
    // noop
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }

  isConnected(): boolean {
    return true;
  }

  async request<
    ParamsType extends TransportRequest,
    ReturnType extends TransportResponse,
  >(
    params: ParamsType,
    _options: { timeout?: number } = {},
  ): Promise<ReturnType> {
    const id = this.#requestId++;
    const requestPayload = {
      id,
      jsonrpc: '2.0',
      ...params,
    };

    switch (requestPayload.method) {
      case 'wallet_createSession':
        return this.#walletCreateSession(requestPayload) as Promise<ReturnType>;
      case 'wallet_getSession':
        return this.#walletGetSession(requestPayload) as Promise<ReturnType>;
      case 'wallet_revokeSession':
        return this.#walletRevokeSession(requestPayload) as Promise<ReturnType>;
      case 'wallet_invokeMethod':
        return this.#walletInvokeMethod(requestPayload) as Promise<ReturnType>;
      default:
        throw new Error(`Unsupported method: ${requestPayload.method}`);
    }

    throw new Error(`Unknown method: ${requestPayload.method}`);
  }

  onNotification(callback: (data: unknown) => void): () => void {
    if (!this.isTransportDefined()) {
      this.#notificationCallbacks.add(callback);
      return () => {
        this.#notificationCallbacks.delete(callback);
      };
    }

    return this.metamaskConnectMultichain.transport.onNotification(callback);
  }

  async #walletCreateSession(request: TransportRequestWithId) {
    console.log('📚 #walletCreateSession', request);
    const createSessionParams = request.params as CreateSessionParams<RPCAPI>;
    const scopes = Object.keys({
      ...createSessionParams.optionalScopes,
      ...createSessionParams.requiredScopes,
    }) as Scope[];
    const scopeAccounts: CaipAccountId[] = [];

    scopes.forEach((scope) => {
      const requiredScope = createSessionParams.requiredScopes?.[scope];
      const optionalScope = createSessionParams.optionalScopes?.[scope];
      if (requiredScope) {
        scopeAccounts.push(...(requiredScope.accounts ?? []));
      }

      if (optionalScope) {
        scopeAccounts.push(...(optionalScope.accounts ?? []));
      }
    });
    const accounts = [...new Set(scopeAccounts)];

    console.log('📚 SDK connect');
    await this.metamaskConnectMultichain.connect(
      scopes,
      accounts,
      createSessionParams.sessionProperties,
    );
    console.log('📚 SDK connected');
    return this.metamaskConnectMultichain.transport.request({
      method: 'wallet_getSession',
    });
  }

  async #walletGetSession(request: TransportRequestWithId) {
    if (!this.isTransportDefined()) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          sessionScopes: {},
        },
      };
    }
    return this.metamaskConnectMultichain.transport.request({
      method: 'wallet_getSession',
    });
  }

  async #walletRevokeSession(request: TransportRequestWithId) {
    if (!this.isTransportDefined()) {
      return { jsonrpc: '2.0', id: request.id, result: true };
    }

    try {
      this.metamaskConnectMultichain.disconnect();
      return { jsonrpc: '2.0', id: request.id, result: true };
    } catch (_error) {
      return { jsonrpc: '2.0', id: request.id, result: false };
    }
  }

  async #walletInvokeMethod(request: TransportRequestWithId) {
    if (!this.isTransportDefined()) {
      return { error: providerErrors.unauthorized() };
    }
    const result = this.metamaskConnectMultichain.invokeMethod(
      request.params as InvokeMethodOptions,
    );

    return {
      result,
    };
  }
}
