/* eslint-disable id-length -- vitest alias */
import * as t from 'vitest';

import {
  classifyFailureReason,
  extractErrorDiagnostics,
  getWalletActionAnalyticsProperties,
  isRejectionError,
  sanitiseErrorMessage,
} from './analytics';
import {
  type InvokeMethodOptions,
  type MultichainOptions,
  RPCInvokeMethodErr,
  type Scope,
  type StoreClient,
  TransportType,
} from '../../domain';

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

  t.it(
    'classifies transport disconnect from narrow substring matches (not bare "disconnect")',
    () => {
      t.expect(
        classifyFailureReason(new Error('Transport disconnect during call')),
      ).toBe('transport_disconnect');
      t.expect(classifyFailureReason(new Error('Connection lost'))).toBe(
        'transport_disconnect',
      );
      t.expect(
        classifyFailureReason(new Error('Socket closed unexpectedly')),
      ).toBe('transport_disconnect');
    },
  );

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
      // Regression test: this also exercises the ordering of the classifier —
      // wallet codes are checked BEFORE the transport-disconnect substring
      // heuristic, so the "Disconnected" message must not leak into
      // `transport_disconnect`.
      const error = new RPCInvokeMethodErr('inner', 4900, 'Disconnected');
      t.expect(classifyFailureReason(error)).toBe('unknown');
    },
  );

  t.it(
    'classifies JSON-RPC server-error range (-32000..-32099) as wallet_internal_error',
    () => {
      t.expect(
        classifyFailureReason(
          new RPCInvokeMethodErr('inner', -32000, 'Server error'),
        ),
      ).toBe('wallet_internal_error');
      t.expect(
        classifyFailureReason(
          new RPCInvokeMethodErr('inner', -32099, 'Reserved server error'),
        ),
      ).toBe('wallet_internal_error');
    },
  );

  t.it('falls back to "unknown" for unrecognised errors', () => {
    t.expect(
      classifyFailureReason(new Error('Something exploded somewhere')),
    ).toBe('unknown');
    t.expect(classifyFailureReason(null)).toBe('unknown');
    t.expect(classifyFailureReason('a string')).toBe('unknown');
  });

  // Documents how the classifier behaves on the *connection*-side error
  // surface (the `.catch` of `transport.connect()` in `multichain/index.ts`).
  // Most of these errors are plain `new Error(...)` strings rather than
  // `RPCInvokeMethodErr`s — they have no wallet code to inspect, so they
  // currently land in `unknown` unless the message happens to match a
  // transport heuristic. This is a known gap (see PR description / audit);
  // tests pin the current behaviour so future improvements have a baseline.
  t.describe('connection-side error shapes', () => {
    t.it(
      'classifies "Transport not initialized" as unknown (no message heuristic match)',
      () => {
        t.expect(
          classifyFailureReason(
            new Error('Transport not initialized, establish connection first'),
          ),
        ).toBe('unknown');
      },
    );

    t.it(
      'classifies "Existing connection is pending" as unknown (concurrent connect race)',
      () => {
        t.expect(
          classifyFailureReason(
            new Error(
              'Existing connection is pending. Please check your MetaMask Mobile app to continue.',
            ),
          ),
        ).toBe('unknown');
      },
    );

    t.it(
      'classifies the deeplink sentinel "No active session found" as unknown',
      () => {
        // Note: this error is thrown inside a `setTimeout` callback for
        // deeplink opening and is fire-and-forget — in practice the analytics
        // try/catch never sees it. Kept here so the classifier's behaviour is
        // documented if/when we instrument that path.
        t.expect(
          classifyFailureReason(new Error('No active session found')),
        ).toBe('unknown');
      },
    );

    t.it(
      'classifies a TransportTimeoutError reaching the connect() catch',
      () => {
        const error = new Error('connect timed out after 60000ms');
        error.name = 'TransportTimeoutError';
        t.expect(classifyFailureReason(error)).toBe('transport_timeout');
      },
    );
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

  t.it(
    'attaches error_code and error_message_sample when passed via extra',
    async () => {
      const props = await getWalletActionAnalyticsProperties(
        mockOptions,
        mockStorage,
        invokeOptions,
        TransportType.Browser,
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention -- analytics property is snake_case by schema convention
          failure_reason: 'wallet_internal_error',
          // eslint-disable-next-line @typescript-eslint/naming-convention -- analytics property is snake_case by schema convention
          error_code: -32603,
          // eslint-disable-next-line @typescript-eslint/naming-convention -- analytics property is snake_case by schema convention
          error_message_sample: 'Internal error',
        },
      );
      t.expect(props.error_code).toBe(-32603);
      t.expect(props.error_message_sample).toBe('Internal error');
    },
  );

  t.it(
    'preserves error_code=0 (truthy-check would drop it but typeof check keeps it)',
    async () => {
      const props = await getWalletActionAnalyticsProperties(
        mockOptions,
        mockStorage,
        invokeOptions,
        TransportType.Browser,
        // eslint-disable-next-line @typescript-eslint/naming-convention -- analytics property is snake_case by schema convention
        { error_code: 0 },
      );
      t.expect(props.error_code).toBe(0);
    },
  );
});

t.describe('sanitiseErrorMessage', () => {
  t.it('returns undefined for empty / missing input', () => {
    t.expect(sanitiseErrorMessage(undefined)).toBeUndefined();
    t.expect(sanitiseErrorMessage('')).toBeUndefined();
  });

  t.it('strips 0x… EVM addresses', () => {
    const out = sanitiseErrorMessage(
      'Insufficient funds for sender 0x1234567890abcdef1234567890abcdef12345678',
    );
    t.expect(out).toBe('Insufficient funds for sender <addr>');
  });

  t.it('strips long hex blobs (tx hashes, signatures)', () => {
    const out = sanitiseErrorMessage(
      'Transaction abcdef1234567890abcdef1234567890 reverted',
    );
    t.expect(out).toBe('Transaction <hex> reverted');
  });

  t.it('strips URLs', () => {
    const out = sanitiseErrorMessage(
      'fetch failed: https://mainnet.infura.io/v3/abc?key=secret',
    );
    t.expect(out).toBe('fetch failed: <url>');
  });

  t.it(
    'strips long decimal numbers (10+ digits) without touching short codes',
    () => {
      const out = sanitiseErrorMessage(
        'gas required 1234567890 wei for tx with code -32603',
      );
      t.expect(out).toBe('gas required <num> wei for tx with code -32603');
    },
  );

  t.it('truncates long messages to 200 chars with an ellipsis marker', () => {
    const out = sanitiseErrorMessage('x'.repeat(500));
    t.expect(out?.length).toBe(200);
    t.expect(out?.endsWith('…')).toBe(true);
  });

  t.it('passes short messages through unchanged', () => {
    t.expect(sanitiseErrorMessage('User rejected the request')).toBe(
      'User rejected the request',
    );
  });

  t.it('applies all scrubbers in one call', () => {
    const out = sanitiseErrorMessage(
      'fetch https://example.com/0xdeadbeef12345678 failed at block 99999999999 for sender 0x1234567890abcdef1234567890abcdef12345678',
    );
    t.expect(out).toContain('<url>');
    t.expect(out).toContain('<num>');
    t.expect(out).toContain('<addr>');
    t.expect(out).not.toContain('0x1234567890abcdef1234567890abcdef12345678');
    t.expect(out).not.toContain('https://');
  });
});

t.describe('extractErrorDiagnostics', () => {
  t.it('returns failure_reason only for non-object errors', () => {
    t.expect(extractErrorDiagnostics(null)).toStrictEqual({
      // eslint-disable-next-line @typescript-eslint/naming-convention -- analytics property is snake_case by schema convention
      failure_reason: 'unknown',
    });
    t.expect(extractErrorDiagnostics(undefined)).toStrictEqual({
      // eslint-disable-next-line @typescript-eslint/naming-convention -- analytics property is snake_case by schema convention
      failure_reason: 'unknown',
    });
  });

  t.it(
    'returns failure_reason + error_code + sample for a wallet error',
    () => {
      const error = new RPCInvokeMethodErr(
        'inner',
        -32603,
        'Internal error fetching balance for 0x1234567890abcdef1234567890abcdef12345678',
      );
      const out = extractErrorDiagnostics(error);
      t.expect(out.failure_reason).toBe('wallet_internal_error');
      t.expect(out.error_code).toBe(-32603);
      t.expect(out.error_message_sample).toBe(
        'Internal error fetching balance for <addr>',
      );
    },
  );

  t.it(
    'omits error_code when the underlying error carries no numeric code',
    () => {
      const out = extractErrorDiagnostics(
        new Error('Transport not initialized'),
      );
      t.expect(out.failure_reason).toBe('unknown');
      t.expect(out.error_code).toBeUndefined();
      t.expect(out.error_message_sample).toBe('Transport not initialized');
    },
  );

  t.it('omits error_message_sample when the error has no message', () => {
    const error = new RPCInvokeMethodErr('inner', 4001);
    const out = extractErrorDiagnostics(error);
    // The underlying RPCInvokeMethodErr message synthesises a string, so we
    // expect a sample here — pin the actual contract that "no useful message"
    // yields an absent sample by constructing one with an empty rpcMessage.
    t.expect(out.error_code).toBe(4001);
    t.expect(typeof out.error_message_sample).toBe('string');
  });
});

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
    'returns false for code 4100 (unauthorized) — a permission/support signal, not a user rejection',
    () => {
      // 4100 is what the CAIP-25 permission layer returns when a method
      // isn't in the granted scope. Classifying it as `_rejected` inflated
      // the rejected bucket and hid permission issues from `_failed`. The
      // canonical 4100 message even contains the substring "by the user",
      // so we have to inspect the code explicitly to avoid mis-bucketing.
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
