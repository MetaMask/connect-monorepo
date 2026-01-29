/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
/* eslint-disable @typescript-eslint/naming-convention -- RPC method names use snake_case */
import { describe, it, expect } from 'vitest';

import {
  normalizeMethodParams,
  updateInvokeMethodResults,
  extractRequestParams,
  extractRequestForStorage,
} from './methodInvocation';

describe('normalizeMethodParams', () => {
  it('should return params as-is for Solana methods', () => {
    const params = { account: { address: '123' }, message: 'test' };
    const result = normalizeMethodParams('signMessage', params, 'solana:xxx');

    expect(result).toEqual(params);
  });

  it('should return params as-is for Solana scope even without known method', () => {
    const params = { some: 'data' };
    const result = normalizeMethodParams('unknownMethod', params, 'solana:xxx');

    expect(result).toEqual(params);
  });

  it('should convert non-array params to array for EVM methods', () => {
    const params = { some: 'data' };
    const result = normalizeMethodParams('eth_getBalance', params, 'eip155:1');

    expect(result).toEqual([{ some: 'data' }]);
  });

  it('should keep array params as array for EVM methods', () => {
    const params = ['0x123', 'latest'];
    const result = normalizeMethodParams('eth_getBalance', params, 'eip155:1');

    expect(result).toEqual(['0x123', 'latest']);
  });

  it('should stringify second param for eth_signTypedData_v4', () => {
    const typedData = { domain: {}, message: {} };
    const params = ['0x123', typedData];
    const result = normalizeMethodParams(
      'eth_signTypedData_v4',
      params,
      'eip155:1',
    );

    expect(result).toEqual(['0x123', JSON.stringify(typedData)]);
  });

  it('should not double-stringify already stringified typed data', () => {
    const typedData = JSON.stringify({ domain: {}, message: {} });
    const params = ['0x123', typedData];
    const result = normalizeMethodParams(
      'eth_signTypedData_v4',
      params,
      'eip155:1',
    );

    expect(result).toEqual(['0x123', typedData]);
  });
});

describe('updateInvokeMethodResults', () => {
  it('should add result to empty state', () => {
    const result = updateInvokeMethodResults(
      {},
      'eip155:1',
      'eth_getBalance',
      '0x100',
      { method: 'eth_getBalance', params: [] },
    );

    expect(result).toEqual({
      'eip155:1': {
        eth_getBalance: [
          {
            result: '0x100',
            request: { method: 'eth_getBalance', params: [] },
          },
        ],
      },
    });
  });

  it('should append result to existing method results', () => {
    const previousResults = {
      'eip155:1': {
        eth_getBalance: [
          {
            result: '0x100',
            request: { method: 'eth_getBalance', params: [] },
          },
        ],
      },
    };

    const result = updateInvokeMethodResults(
      previousResults,
      'eip155:1',
      'eth_getBalance',
      '0x200',
      { method: 'eth_getBalance', params: ['0x456'] },
    );

    expect(result['eip155:1'].eth_getBalance).toHaveLength(2);
    expect(result['eip155:1'].eth_getBalance[1]).toEqual({
      result: '0x200',
      request: { method: 'eth_getBalance', params: ['0x456'] },
    });
  });

  it('should preserve other scopes and methods', () => {
    const previousResults = {
      'eip155:1': {
        eth_getBalance: [{ result: '0x100', request: {} }],
      },
      'eip155:137': {
        eth_chainId: [{ result: '0x89', request: {} }],
      },
    };

    const result = updateInvokeMethodResults(
      previousResults,
      'eip155:1',
      'eth_blockNumber',
      '0x1000',
      {},
    );

    expect(result['eip155:137']).toEqual(previousResults['eip155:137']);
    expect(result['eip155:1'].eth_getBalance).toEqual(
      previousResults['eip155:1'].eth_getBalance,
    );
  });
});

describe('extractRequestParams', () => {
  it('should extract params from nested request object', () => {
    const requestObject = {
      method: 'wallet_invokeMethod',
      params: {
        scope: 'eip155:1',
        request: {
          method: 'eth_getBalance',
          params: ['0x123', 'latest'],
        },
      },
    };

    const result = extractRequestParams(requestObject);

    expect(result).toEqual(['0x123', 'latest']);
  });
});

describe('extractRequestForStorage', () => {
  it('should extract request object for storage', () => {
    const requestObject = {
      method: 'wallet_invokeMethod',
      params: {
        scope: 'eip155:1',
        request: {
          method: 'eth_getBalance',
          params: ['0x123', 'latest'],
        },
      },
    };

    const result = extractRequestForStorage(requestObject);

    expect(result).toEqual({
      method: 'eth_getBalance',
      params: ['0x123', 'latest'],
    });
  });
});
