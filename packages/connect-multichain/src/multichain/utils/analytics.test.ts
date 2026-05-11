/* eslint-disable id-length -- vitest alias */
import * as t from 'vitest';

import {
  classifyFailureReason,
  getWalletActionAnalyticsProperties,
  isRejectionError,
} from './analytics';
import {
  type InvokeMethodOptions,
  type MultichainOptions,
  RPCHttpErr,
  RPCInvokeMethodErr,
  RPCReadonlyRequestErr,
  RPCReadonlyResponseErr,
  type Scope,
  type StoreClient,
  TransportType,
} from '../../domain';

t.describe('isRejectionError', () => {
  t.it('returns false for non-object errors', () => {
    t.expect(isRejectionError(null)).toBe(false);
    t.expect(isRejectionError(undefined)).toBe(false);
    t.expect(isRejectionError('User rejected')).toBe(false);
    t.expect(isRejectionError(42)).toBe(false);
  });

  t.it('returns true for EIP-1193 user-rejected code 4001', () => {
    t.expect(isRejectionError({ code: 4001, message: 'anything' })).toBe(true);
  });

  t.it(
    'does NOT treat 4100 (unauthorized) as a rejection — that signals a permission/method-support issue, not user intent',
    () => {
      t.expect(
        isRejectionError({
          code: 4100,
          message:
            'The requested account and/or method has not been authorized by the user.',
        }),
      ).toBe(false);
    },
  );

  t.it('returns true for messages mentioning explicit user action', () => {
    t.expect(isRejectionError({ message: 'User rejected the request' })).toBe(
      true,
    );
    t.expect(isRejectionError({ message: 'User denied signature' })).toBe(true);
    t.expect(isRejectionError({ message: 'User cancelled' })).toBe(true);
    t.expect(isRejectionError({ message: 'Request rejected' })).toBe(true);
  });

  t.it(
    'does NOT treat unrelated "user" mentions as rejections (avoids false positives)',
    () => {
      // Account Abstraction error messages often contain "user operation"
      t.expect(isRejectionError({ message: 'user operation reverted' })).toBe(
        false,
      );
      t.expect(isRejectionError({ message: 'user agent not supported' })).toBe(
        false,
      );
    },
  );

  t.it(
    'unwraps RPCInvokeMethodErr to detect wallet-side rejection codes',
    () => {
      // Outer error has code: 53 (the SDK's static internal code), but the
      // inner wallet code is 4001 — the classifier must look at rpcCode.
      const wrapped = new RPCInvokeMethodErr(
        'RPC Request failed with code 4001: Some random message that does not match heuristics',
        4001,
        'Some random message that does not match heuristics',
      );
      t.expect(isRejectionError(wrapped)).toBe(true);
    },
  );
});

t.describe('classifyFailureReason', () => {
  t.it('classifies transport timeout from TransportTimeoutError name', () => {
    const error = new Error('Transport request timed out');
    error.name = 'TransportTimeoutError';
    t.expect(classifyFailureReason(error)).toBe('transport_timeout');
  });

  t.it(
    'classifies transport timeout from DefaultTransport plain message',
    () => {
      // DefaultTransport throws `new Error('Request timeout')` (not a
      // TransportTimeoutError) on its own setTimeout path — we still want to
      // classify this as a timeout.
      t.expect(classifyFailureReason(new Error('Request timeout'))).toBe(
        'transport_timeout',
      );
    },
  );

  t.it('classifies transport disconnect from TransportError name', () => {
    const error = new Error('Chrome port not connected');
    error.name = 'TransportError';
    t.expect(classifyFailureReason(error)).toBe('transport_disconnect');
  });

  t.it('classifies the "Unrecognized chain" message', () => {
    t.expect(
      classifyFailureReason(new Error('Unrecognized chain ID "0xfa"')),
    ).toBe('unrecognised_chain');
  });

  t.it('classifies wallet JSON-RPC method-not-found', () => {
    const error = new RPCInvokeMethodErr('inner', -32601, 'Method not found');
    t.expect(classifyFailureReason(error)).toBe('wallet_method_unsupported');
  });

  t.it('classifies wallet JSON-RPC invalid params', () => {
    const error = new RPCInvokeMethodErr('inner', -32602, 'Invalid params');
    t.expect(classifyFailureReason(error)).toBe('wallet_invalid_params');
  });

  t.it('classifies wallet JSON-RPC internal error', () => {
    const error = new RPCInvokeMethodErr('inner', -32603, 'Internal error');
    t.expect(classifyFailureReason(error)).toBe('wallet_internal_error');
  });

  t.it(
    'classifies wallet 4100 unauthorized (e.g. CAIP-25 scope did not grant the method)',
    () => {
      const error = new RPCInvokeMethodErr(
        'inner',
        4100,
        'The requested account and/or method has not been authorized by the user.',
      );
      t.expect(classifyFailureReason(error)).toBe('wallet_unauthorized');
    },
  );

  t.it('classifies wallet 4200 unsupported method', () => {
    const error = new RPCInvokeMethodErr('inner', 4200, 'Unsupported method');
    t.expect(classifyFailureReason(error)).toBe('wallet_method_unsupported');
  });

  t.it(
    'classifies wallet 4902 unrecognised chain (mobile switchEthereumChain)',
    () => {
      const error = new RPCInvokeMethodErr(
        'inner',
        4902,
        'Unrecognized chain ID "0xfa". Try adding the chain using wallet_addEthereumChain first.',
      );
      t.expect(classifyFailureReason(error)).toBe('unrecognised_chain');
    },
  );

  t.it(
    'falls back to "unknown" for unrecognised provider-defined codes (no wallet_custom_error bucket)',
    () => {
      // 4900 "Disconnected" — real EIP-1193 code, but we don't surface it
      // separately today. Lives in `unknown` until/unless usage justifies
      // its own bucket (this is the policy described in the source comment).
      const error = new RPCInvokeMethodErr('inner', 4900, 'Disconnected');
      t.expect(classifyFailureReason(error)).toBe('unknown');
    },
  );

  t.it('classifies read-only RPC HTTP errors', () => {
    t.expect(
      classifyFailureReason(
        new RPCHttpErr('https://example.com', 'eth_blockNumber', 503),
      ),
    ).toBe('rpc_node_http_error');
  });

  t.it(
    'classifies read-only RPC request errors (fetch timeouts, aborts)',
    () => {
      t.expect(
        classifyFailureReason(
          new RPCReadonlyRequestErr('Request timeout after 30000ms'),
        ),
      ).toBe('rpc_node_request_error');
    },
  );

  t.it('classifies read-only RPC response errors (malformed JSON)', () => {
    t.expect(
      classifyFailureReason(new RPCReadonlyResponseErr('Unexpected token <')),
    ).toBe('rpc_node_response_error');
  });

  t.it('falls back to "unknown" for unrecognised errors', () => {
    t.expect(
      classifyFailureReason(new Error('Something exploded somewhere')),
    ).toBe('unknown');
    t.expect(classifyFailureReason(null)).toBe('unknown');
    t.expect(classifyFailureReason('a string')).toBe('unknown');
  });
});

t.describe('getWalletActionAnalyticsProperties', () => {
  const mockOptions: MultichainOptions = {
    dapp: { name: 'Test', url: 'https://test.com' },
    versions: { 'connect-multichain': '1.2.3' },
  } as unknown as MultichainOptions;

  const mockStorage = {
    getAnonId: async () => Promise.resolve('anon-id-123'),
  } as unknown as StoreClient;

  const invokeOptions: InvokeMethodOptions = {
    scope: 'eip155:1' as Scope,
    request: { method: 'personal_sign', params: [] },
  };

  t.it('does not attach failure_reason by default', async () => {
    const props = await getWalletActionAnalyticsProperties(
      mockOptions,
      mockStorage,
      invokeOptions,
      TransportType.Browser,
    );
    t.expect(props).not.toHaveProperty('failure_reason');
  });

  t.it('attaches failure_reason when passed via extra', async () => {
    const props = await getWalletActionAnalyticsProperties(
      mockOptions,
      mockStorage,
      invokeOptions,
      TransportType.Browser,
      // eslint-disable-next-line @typescript-eslint/naming-convention -- analytics property is snake_case by schema convention
      { failure_reason: 'transport_timeout' },
    );
    t.expect(props.failure_reason).toBe('transport_timeout');
  });
});
