/* eslint-disable no-restricted-syntax -- Private class properties use established patterns */
/* eslint-disable @typescript-eslint/explicit-function-return-type -- Inferred types are sufficient */
/* eslint-disable @typescript-eslint/parameter-properties -- Constructor shorthand is intentional */

import type {
  CreateSessionParams,
  RevokeSessionParams,
  Transport,
  TransportRequest,
  TransportResponse,
} from '@metamask/multichain-api-client';
import { providerErrors } from '@metamask/rpc-errors';
import type { CaipAccountId } from '@metamask/utils';
import type {
  ExtendedTransport,
  InvokeMethodOptions,
  RPCAPI,
  Scope,
} from 'src/domain';
import type { MetaMaskConnectMultichain } from 'src/multichain';

import { getUniqueRequestId } from '../../utils';

type TransportRequestWithId = TransportRequest & { id: number };

export class MultichainApiClientWrapperTransport implements Transport {
  readonly #notificationCallbacks = new Set<(data: unknown) => void>();

  readonly #getTransport: () => ExtendedTransport | undefined;

  notificationListener: (() => void) | undefined;

  constructor(
    private readonly metamaskConnectMultichain: MetaMaskConnectMultichain,
    getTransport: () => ExtendedTransport | undefined,
  ) {
    this.#getTransport = getTransport;
  }

  isTransportDefined(): boolean {
    return this.#getTransport() !== undefined;
  }

  isTransportConnected(): boolean {
    return this.#getTransport()?.isConnected() ?? false;
  }

  clearNotificationCallbacks(): void {
    this.#notificationCallbacks.clear();
  }

  notifyCallbacks(data: unknown): void {
    this.#notificationCallbacks.forEach((callback) => {
      callback(data);
    });
  }

  clearTransportNotificationListener(): void {
    this.notificationListener?.();
    this.notificationListener = undefined;
  }

  setupTransportNotificationListener(): void {
    const transport = this.#getTransport();
    if (!transport || this.notificationListener) {
      return;
    }
    this.notificationListener = transport.onNotification(
      this.notifyCallbacks.bind(this),
    );
  }

  // Purposely noop, resolves successfully. Actual connection is handled by the underlying client/transport.
  async connect(): Promise<void> {
    return Promise.resolve();
  }

  // Purposely noop, resolves successfully. Actual connection is handled by the underlying client/transport.
  async disconnect(): Promise<void> {
    return Promise.resolve();
  }

  // Purposely hardcoded to true. Actual connection is handled by the underlying client/transport.
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
    const id = getUniqueRequestId();
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
  }

  onNotification(callback: (data: unknown) => void): () => void {
    this.setupTransportNotificationListener();
    this.#notificationCallbacks.add(callback);
    return () => {
      this.#notificationCallbacks.delete(callback);
    };
  }

  async #walletCreateSession(request: TransportRequestWithId) {
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

    await this.metamaskConnectMultichain.connect(
      scopes,
      accounts,
      createSessionParams.sessionProperties,
    );
    const transport = this.#getTransport();
    if (!transport) {
      throw new Error('Transport not initialized after connect');
    }
    return transport.request({
      method: 'wallet_getSession',
    });
  }

  async #walletGetSession(request: TransportRequestWithId) {
    const transport = this.#getTransport();
    if (!transport?.isConnected()) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          sessionScopes: {},
        },
      };
    }
    return transport.request({
      method: 'wallet_getSession',
    });
  }

  async #walletRevokeSession(request: TransportRequestWithId) {
    const revokeSessionParams = request.params as
      | RevokeSessionParams<RPCAPI>
      | undefined;
    const scopes = revokeSessionParams?.scopes ?? [];

    try {
      await this.metamaskConnectMultichain.disconnect(scopes as Scope[]);
      return { jsonrpc: '2.0', id: request.id, result: true };
    } catch (_error) {
      return { jsonrpc: '2.0', id: request.id, result: false };
    }
  }

  async #walletInvokeMethod(request: TransportRequestWithId) {
    if (!this.isTransportConnected()) {
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
