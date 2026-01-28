/* eslint-disable no-restricted-syntax -- Private class properties use established patterns */
/* eslint-disable @typescript-eslint/explicit-function-return-type -- Inferred types are sufficient */
/* eslint-disable @typescript-eslint/parameter-properties -- Constructor shorthand is intentional */
/* eslint-disable @typescript-eslint/no-shadow -- fetch import shadows global */

import type { Json } from '@metamask/utils';
import fetch from 'cross-fetch';

import {
  RPCHttpErr,
  RPCReadonlyRequestErr,
  RPCReadonlyResponseErr,
} from '../../../domain';
import type {
  RPCResponse,
  RpcUrlsMap,
  Scope,
  InvokeMethodOptions,
  MultichainOptions,
} from '../../../domain';

let rpcId = 1;

/**
 * Gets the next RPC ID for request tracking.
 *
 * @returns The next unique RPC ID.
 */
export function getNextRpcId(): number {
  rpcId += 1;
  return rpcId;
}

export class MissingRpcEndpointErr extends Error {}

export class RpcClient {
  constructor(
    private readonly config: MultichainOptions,
    private readonly sdkInfo: string,
  ) {}

  /**
   * Routes the request to a configured RPC node.
   *
   * @param options - The invoke method options.
   * @returns The JSON response from the RPC node.
   */
  async request(options: InvokeMethodOptions): Promise<Json> {
    const { request } = options;
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method: request.method,
      params: request.params,
      id: getNextRpcId(),
    });
    const rpcEndpoint = this.getRpcEndpoint(options.scope);
    const rpcRequest = await this.fetchWithTimeout(
      rpcEndpoint,
      body,
      'POST',
      this.getHeaders(rpcEndpoint),
      30_000,
    ); // 30 seconds default timeout
    const response = await this.parseResponse(rpcRequest);
    return response;
  }

  private getRpcEndpoint(scope: Scope) {
    const supportedNetworks: RpcUrlsMap =
      this.config?.api?.supportedNetworks ?? {};

    const rpcEndpoint = supportedNetworks[scope];
    if (!rpcEndpoint) {
      throw new MissingRpcEndpointErr(
        `No RPC endpoint found for scope ${scope}`,
      );
    }
    return rpcEndpoint;
  }

  private async fetchWithTimeout(
    endpoint: string,
    body: string,
    method: string,
    headers: Record<string, string>,
    timeout: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(endpoint, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new RPCHttpErr(endpoint, method, response.status);
      }
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof RPCHttpErr) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new RPCReadonlyRequestErr(`Request timeout after ${timeout}ms`);
      }
      throw new RPCReadonlyRequestErr(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private async parseResponse(response: Response) {
    try {
      const rpcResponse = (await response.json()) as RPCResponse;
      return rpcResponse.result as Json;
    } catch (error) {
      throw new RPCReadonlyResponseErr(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private getHeaders(rpcEndpoint: string) {
    const defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (rpcEndpoint.includes('infura')) {
      return {
        ...defaultHeaders,
        'Metamask-Sdk-Info': this.sdkInfo,
      };
    }
    return defaultHeaders;
  }
}
