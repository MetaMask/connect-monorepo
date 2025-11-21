import { CreateSessionParams, Transport, TransportRequest, TransportResponse } from "@metamask/multichain-api-client";
import { providerErrors } from "@metamask/rpc-errors";
import { CaipAccountId } from "@metamask/utils";
import { InvokeMethodOptions, RPCAPI, Scope } from "src/domain";
import { MultichainSDK } from "src/multichain";

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
  private requestId = getUniqueId();
  private notificationCallbacks = new Set<(data: unknown) => void>();
  constructor(private multichainSDK: MultichainSDK) {
  }

  clearNotificationCallbacks() {
    this.notificationCallbacks.clear();
  }

  notifyCallbacks(data: unknown) {
    this.notificationCallbacks.forEach((callback) => {
      callback(data);
    });
  }

  setupNotifcationListener() {
    this.multichainSDK.transport.onNotification(this.notifyCallbacks.bind(this));
  }

  connect(): Promise<void> {
    // noop
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }

  isConnected(): boolean {
    return true
  }

  async request<ParamsType extends TransportRequest, ReturnType extends TransportResponse>(
    params: ParamsType,
    options: { timeout?: number } = {},
  ): Promise<ReturnType> {
    const id = this.requestId++;
    const requestPayload = {
      id,
      jsonrpc: '2.0',
      ...params,
    };

    if (requestPayload.method === 'wallet_createSession') {
      return this.#walletCreateSession(requestPayload) as Promise<ReturnType>;
    } else if (requestPayload.method === 'wallet_getSession') {
      return this.#walletGetSession(requestPayload) as Promise<ReturnType>;
    } else if (requestPayload.method === 'wallet_revokeSession') {
      return this.#walletRevokeSession(requestPayload) as Promise<ReturnType>;
    } else if (requestPayload.method === 'wallet_invokeMethod') {
      return this.#walletInvokeMethod(requestPayload) as Promise<ReturnType>;
    }

    throw new Error(`Unknown method: ${requestPayload.method}`);
  }

  onNotification(callback: (data: unknown) => void) {
    if (!this.multichainSDK.transport) {
      this.notificationCallbacks.add(callback);
      return () => {
        this.notificationCallbacks.delete(callback);
      };
    }

    return this.multichainSDK.transport.onNotification(callback);
  }

  async #walletCreateSession(request: TransportRequestWithId) {
    const createSessionParams = request.params as CreateSessionParams<RPCAPI>;
    const scopes = Object.keys({...createSessionParams.optionalScopes, ...createSessionParams.requiredScopes}) as Scope[]
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


    await this.multichainSDK.connect(scopes, accounts, createSessionParams.sessionProperties)
    return this.multichainSDK.transport.request({ method: 'wallet_getSession' });
  }

  async #walletGetSession(request: TransportRequestWithId) {
    if (!this.multichainSDK.transport) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          "sessionScopes": {}
        }
      }
    }
    return this.multichainSDK.transport.request({ method: 'wallet_getSession' });
  }

  async #walletRevokeSession(request: TransportRequestWithId) {
    if (!this.multichainSDK.transport) {
      return { jsonrpc: '2.0', id: request.id, result: true };
    }

    try {
      this.multichainSDK.disconnect()
      return { jsonrpc: '2.0', id: request.id, result: true }
    } catch (error) {
      return { jsonrpc: '2.0', id: request.id, result: false }
    }
  }

  async #walletInvokeMethod(request: TransportRequestWithId) {
    if (!this.multichainSDK.transport) {
      return { error: providerErrors.unauthorized() }
    }
    return this.multichainSDK.invokeMethod(request.params as InvokeMethodOptions)
  }
}
