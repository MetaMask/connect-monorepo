/* eslint-disable id-length -- vitest alias */
import * as t from 'vitest';

import { isRejectionError } from './analytics';
import { RPCInvokeMethodErr } from '../../domain';

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

  t.it('returns true for code 4100 (unauthorized)', () => {
    t.expect(isRejectionError({ code: 4100, message: 'denied by user' })).toBe(
      true,
    );
  });

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
