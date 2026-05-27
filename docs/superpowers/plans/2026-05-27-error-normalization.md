# Error Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize wallet invocation errors so `connect-multichain.invokeMethod()` exposes one SDK-owned error shape across `DefaultTransport` and `MWPTransport`, while `connect-evm` keeps its EIP-1193 provider-facing error shape.

**Architecture:** `RequestRouter` remains the public error boundary for `invokeMethod()` and converts both resolved JSON-RPC error payloads and rejected coded errors into the same `RPCInvokeMethodErr` fields. `EIP1193Provider.request()` continues to adapt `RPCInvokeMethodErr.rpcCode` / `rpcMessage` into wallet-facing EIP-1193-style errors.

**Tech Stack:** TypeScript, Vitest, Yarn workspaces, `@metamask/rpc-errors`-style coded wallet errors, existing `RPCInvokeMethodErr`.

---

## File Structure

- Modify: `packages/connect-multichain/src/multichain/rpc/requestRouter.test.ts`
  - Adds focused tests proving resolved transport errors and rejected transport errors normalize to identical `RPCInvokeMethodErr` fields.
- Modify: `packages/connect-multichain/src/multichain/rpc/requestRouter.ts`
  - Replaces the current loose `toRPCInvokeMethodErr` helper with a canonical extractor for `reason`, `rpcCode`, and `rpcMessage`.
  - Routes `response.error` through the same helper used for caught transport rejections.
- Modify: `packages/connect-evm/src/provider.test.ts`
  - Locks the provider boundary with a canonical normalized `RPCInvokeMethodErr` input and expected EIP-1193-facing output.

## Task 1: Normalize `RequestRouter` Invocation Errors

**Files:**
- Modify: `packages/connect-multichain/src/multichain/rpc/requestRouter.test.ts:73`
- Modify: `packages/connect-multichain/src/multichain/rpc/requestRouter.ts:34`

- [ ] **Step 1: Write failing router normalization tests**

In `packages/connect-multichain/src/multichain/rpc/requestRouter.test.ts`, insert this helper after the `t.afterEach` block and before `t.describe('invokeMethod', ...)`:

```ts
  const expectRpcInvokeMethodErr = async ({
    actual,
    reason,
    rpcCode,
    rpcMessage,
  }: {
    actual: Promise<unknown>;
    reason: string;
    rpcCode?: number;
    rpcMessage?: string;
  }): Promise<void> => {
    await t.expect(actual).rejects.toSatisfy((error: unknown) => {
      t.expect(error).toBeInstanceOf(RPCInvokeMethodErr);
      const rpcError = error as RPCInvokeMethodErr;
      t.expect(rpcError.code).toBe(RPCInvokeMethodErr.code);
      t.expect(rpcError.message).toBe(
        `RPCErr53: RPC Client invoke method reason (${reason})`,
      );
      t.expect(rpcError.reason).toBe(reason);
      t.expect(rpcError.rpcCode).toBe(rpcCode);
      t.expect(rpcError.rpcMessage).toBe(rpcMessage);
      return true;
    });
  };
```

Then replace the existing tests named `should throw RPCInvokeMethodErr when response contains an error`, `should preserve the original RPC error code on RPCInvokeMethodErr when response contains an error`, and `should preserve the original RPC error code when transport rejects with a coded error` with this block:

```ts
        t.describe.each([
          ['user rejection', 4001, 'User rejected the request'],
          ['wallet internal error', -32603, 'Internal error'],
        ] as const)(
          'normalizes %s from transport-specific error shapes',
          (_label, code, message) => {
            t.it(
              'normalizes a resolved JSON-RPC error response',
              async () => {
                mockTransport.request.mockResolvedValue({
                  error: { code, message },
                });

                await expectRpcInvokeMethodErr({
                  actual: requestRouter.invokeMethod(baseOptions),
                  reason: message,
                  rpcCode: code,
                  rpcMessage: message,
                });
              },
            );

            t.it('normalizes a rejected coded transport error', async () => {
              const codedError = new Error(message) as Error & {
                code: number;
              };
              codedError.code = code;
              mockTransport.request.mockRejectedValue(codedError);

              await expectRpcInvokeMethodErr({
                actual: requestRouter.invokeMethod(baseOptions),
                reason: message,
                rpcCode: code,
                rpcMessage: message,
              });
            });
          },
        );
```

Also tighten the existing `should throw RPCInvokeMethodErr when transport request fails` test by replacing its body with:

```ts
            mockTransport.request.mockRejectedValue(
              new Error('Transport error'),
            );

            await expectRpcInvokeMethodErr({
              actual: requestRouter.invokeMethod(baseOptions),
              reason: 'Transport error',
            });
```

- [ ] **Step 2: Run the focused router test and confirm it fails**

Run:

```bash
yarn workspace @metamask/connect-multichain test:unit src/multichain/rpc/requestRouter.test.ts --reporter=verbose
```

Expected: FAIL. At least one new assertion should show the current mismatch, such as a resolved JSON-RPC error producing `reason: "RPC Request failed with code -32603: Internal error"` instead of `reason: "Internal error"`, or a rejected coded error leaving `rpcMessage` undefined.

- [ ] **Step 3: Implement the canonical router normalizer**

In `packages/connect-multichain/src/multichain/rpc/requestRouter.ts`, replace the current `toRPCInvokeMethodErr` helper at the top of the file with:

```ts
type InvocationErrorDetails = {
  reason: string;
  rpcCode?: number;
  rpcMessage?: string;
};

function getErrorObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function getNumericCode(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function getNonEmptyMessage(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Extracts the public invocation error fields from either a JSON-RPC error
 * payload or a rejected Error-like value.
 *
 * @param error - Unknown error thrown or returned during method execution.
 * @returns Canonical fields for RPCInvokeMethodErr.
 */
function getInvocationErrorDetails(error: unknown): InvocationErrorDetails {
  const errorObject = getErrorObject(error);
  const causeObject = getErrorObject(errorObject?.cause);
  const rpcCode =
    getNumericCode(errorObject?.code) ?? getNumericCode(causeObject?.code);
  const reason =
    getNonEmptyMessage(errorObject?.message) ??
    getNonEmptyMessage(causeObject?.message) ??
    'Unknown error';

  return {
    reason,
    rpcCode,
    ...(rpcCode === undefined ? {} : { rpcMessage: reason }),
  };
}

/**
 * Normalizes unknown invocation errors to the router error type.
 *
 * @param error - Unknown error thrown or returned during method execution.
 * @returns Error instance surfaced by invokeMethod.
 */
function toRPCInvokeMethodErr(error: unknown): RPCInvokeMethodErr {
  if (error instanceof RPCInvokeMethodErr) {
    return error;
  }

  const { reason, rpcCode, rpcMessage } = getInvocationErrorDetails(error);
  return new RPCInvokeMethodErr(reason, rpcCode, rpcMessage);
}
```

Then replace the `response.error` handling in `handleWithWallet()` with:

```ts
      const response = await request;
      if (response.error) {
        throw toRPCInvokeMethodErr(response.error);
      }

      return response.result as Json;
```

Leave the existing `catch` blocks in `#withAnalyticsTracking()` calling `toRPCInvokeMethodErr(error)`. The helper now preserves an existing `RPCInvokeMethodErr`, so already-normalized response errors will not be wrapped again.

- [ ] **Step 4: Run the focused router test and confirm it passes**

Run:

```bash
yarn workspace @metamask/connect-multichain test:unit src/multichain/rpc/requestRouter.test.ts --reporter=verbose
```

Expected: PASS for `packages/connect-multichain/src/multichain/rpc/requestRouter.test.ts`.

- [ ] **Step 5: Commit the router normalization**

Run:

```bash
git add packages/connect-multichain/src/multichain/rpc/requestRouter.ts packages/connect-multichain/src/multichain/rpc/requestRouter.test.ts
git commit -m "fix(connect-multichain): normalize invoke method errors"
```

## Task 2: Lock The EIP-1193 Provider Boundary

**Files:**
- Modify: `packages/connect-evm/src/provider.test.ts:24`

- [ ] **Step 1: Update the provider mapping test to use the canonical SDK error**

In `packages/connect-evm/src/provider.test.ts`, replace the first test in `describe('#request', ...)` with:

```ts
    it('maps normalized RPCInvokeMethodErr to an EIP-1193 error with the wallet code', async () => {
      const mockCore = createMockCore();
      const provider = new EIP1193Provider(mockCore as any, vi.fn());
      provider.selectedChainId = '0x1';

      mockCore.invokeMethod.mockRejectedValue(
        new RPCInvokeMethodErr(
          'User rejected the request',
          4001,
          'User rejected the request',
        ),
      );

      await expect(
        provider.request({ method: 'eth_sendTransaction', params: [] }),
      ).rejects.toMatchObject({
        message: 'User rejected the request',
        code: 4001,
      });
    });
```

Do not change `packages/connect-evm/src/provider.ts` unless this test fails. The current provider code already adapts `RPCInvokeMethodErr.rpcCode` and `rpcMessage` into a wallet-facing provider error.

- [ ] **Step 2: Run the focused provider test**

Run:

```bash
yarn workspace @metamask/connect-evm test:unit src/provider.test.ts --reporter=verbose
```

Expected: PASS. This task is a regression lock for the boundary confirmed in the design: `connect-evm` is EIP-1193-facing, not SDK-error-facing.

- [ ] **Step 3: Commit the provider boundary test**

Run:

```bash
git add packages/connect-evm/src/provider.test.ts
git commit -m "test(connect-evm): lock provider error mapping"
```

## Task 3: Verify The Public Error Boundary End To End

**Files:**
- Verify: `packages/connect-multichain/src/multichain/rpc/requestRouter.test.ts`
- Verify: `packages/connect-evm/src/provider.test.ts`
- Verify: `packages/connect-multichain/src/invoke.test.ts`

- [ ] **Step 1: Run the focused multichain router tests**

Run:

```bash
yarn workspace @metamask/connect-multichain test:unit src/multichain/rpc/requestRouter.test.ts --reporter=verbose
```

Expected: PASS.

- [ ] **Step 2: Run the multichain invoke integration-style tests**

Run:

```bash
yarn workspace @metamask/connect-multichain test:unit src/invoke.test.ts --reporter=verbose
```

Expected: PASS. These platform fixture tests ensure the `invokeMethod()` public path still works across web, web-mobile, React Native, and node fixtures.

- [ ] **Step 3: Run the focused EVM provider tests**

Run:

```bash
yarn workspace @metamask/connect-evm test:unit src/provider.test.ts --reporter=verbose
```

Expected: PASS.

- [ ] **Step 4: Inspect the final diff**

Run:

```bash
git diff --stat HEAD~2..HEAD
git diff HEAD~2..HEAD -- packages/connect-multichain/src/multichain/rpc/requestRouter.ts packages/connect-multichain/src/multichain/rpc/requestRouter.test.ts packages/connect-evm/src/provider.test.ts
```

Expected: the diff only changes the router normalizer, router tests, and provider boundary test. It should not modify transport connection/session/deeplink logic.

