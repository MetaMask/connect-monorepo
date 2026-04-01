# connect-evm: Support account re-selection without disconnect

## Problem

When a user wants to add more accounts after an initial connection, Portfolio currently has to `disconnectAsync()` + `connectAsync()` through wagmi. This forces the user through a full reconnection flow — bad UX, especially on mobile where it means scanning a QR code again.

The existing `wallet_requestPermissions` flow in `connect-evm` is designed to handle this, but it silently no-ops on mobile because `MWPTransport` ignores the `forceRequest` flag that bypasses the "already connected" short-circuit.

## Architecture

The `forceRequest` plumbing already exists at every layer except the final one:

```
connect-evm  →  MetaMaskConnectMultichain.connect(forceRequest)  →  transport.connect({ forceRequest })
                                                                           ↓
                                                        DefaultTransport: ✅ handles forceRequest
                                                        MWPTransport:     ❌ ignores forceRequest
```

`ExtendedTransport` already declares `forceRequest` in its type. `DefaultTransport` already uses it to bypass `isSameScopesAndAccounts` and force a new `wallet_createSession`. `MWPTransport` accepts the options object but its type omits `forceRequest`, and `onResumeSuccess` has no code path to skip the scope-equality check.

Once `MWPTransport` sends `wallet_createSession` on an existing session, MetaMask Mobile should present the account selection UI. The wallet treats `wallet_createSession` as a new permission request regardless of transport — it is not a cache lookup.

---

## Changes Required

### Change 1: `MWPTransport.connect()` — accept and forward `forceRequest`

**File:** `packages/connect-multichain/src/multichain/transports/mwp/index.ts`

**What:** Add `forceRequest?: boolean` to the `connect()` options type and forward it to `onResumeSuccess`.

**Before (line 426):**

```typescript
async connect(options?: {
    scopes: Scope[];
    caipAccountIds: CaipAccountId[];
    sessionProperties?: SessionProperties;
}): Promise<void> {
```

**After:**

```typescript
async connect(options?: {
    scopes: Scope[];
    caipAccountIds: CaipAccountId[];
    sessionProperties?: SessionProperties;
    forceRequest?: boolean;
}): Promise<void> {
```

The call sites at lines 454 and 457 already pass `options` through to `onResumeSuccess` — no change needed there.

### Change 2: `MWPTransport.onResumeSuccess()` — bypass scope check when forced

**File:** `packages/connect-multichain/src/multichain/transports/mwp/index.ts`

**What:** Accept `forceRequest` in the options parameter and use it to skip the `isSameScopesAndAccounts` check, so `wallet_createSession` is sent unconditionally.

**Before (lines 306–352):**

```typescript
private async onResumeSuccess(
    resumeResolve: () => void,
    resumeReject: (err: Error) => void,
    options?: { scopes: Scope[]; caipAccountIds: CaipAccountId[] },
): Promise<void> {
    // ...
    let walletSession = sessionRequest.result as SessionData;
    if (walletSession && options) {
        // ...
        const hasSameScopesAndAccounts = isSameScopesAndAccounts(
            currentScopes, proposedScopes, walletSession, proposedCaipAccountIds,
        );
        if (!hasSameScopesAndAccounts) {
            // send wallet_createSession
        }
    }
```

**After:**

```typescript
private async onResumeSuccess(
    resumeResolve: () => void,
    resumeReject: (err: Error) => void,
    options?: { scopes: Scope[]; caipAccountIds: CaipAccountId[]; forceRequest?: boolean },
): Promise<void> {
    // ...
    let walletSession = sessionRequest.result as SessionData;
    if (walletSession && options) {
        // ...
        const hasSameScopesAndAccounts = isSameScopesAndAccounts(
            currentScopes, proposedScopes, walletSession, proposedCaipAccountIds,
        );
        if (options.forceRequest || !hasSameScopesAndAccounts) {
            // send wallet_createSession
        }
    }
```

**Why:** This is the actual gate that prevents re-prompting. When `forceRequest` is true, the scope-equality check is irrelevant — the user is explicitly asking to be prompted again regardless of whether scopes changed. This mirrors `DefaultTransport`'s existing behavior at line 251:

```
if (walletSession && options && !options.forceRequest) {
```

### Change 3: `connect-evm` `#requestInterceptor` — use session chain IDs

**File:** `packages/connect-evm/src/connect.ts`

**What:** Replace the hardcoded `chainIds: ['0x1']` with the chain IDs from the current session, so the re-prompt scope matches the initial connection scope.

**Before (lines 620–628):**

```typescript
const initiallySelectedChainId = DEFAULT_CHAIN_ID;
const scope: Scope = `eip155:${initiallySelectedChainId}`;

await this.#trackWalletActionRequested(method, scope, params);

try {
    const result = await this.connect({
        chainIds: [initiallySelectedChainId],
        forceRequest: shouldForceConnectionRequest,
    });
```

**After:**

```typescript
const sessionChainIds = getPermittedEthChainIds(this.#sessionScopes);
const chainIds = sessionChainIds.length > 0
    ? sessionChainIds
    : [DEFAULT_CHAIN_ID];
const scope: Scope = `eip155:${chainIds[0]}`;

await this.#trackWalletActionRequested(method, scope, params);

try {
    const result = await this.connect({
        chainIds,
        forceRequest: shouldForceConnectionRequest,
    });
```

**Why:** The initial connection used all configured chains (passed by the wagmi connector via `config.chains`). Hardcoding `'0x1'` on re-prompt means the `wallet_createSession` request has a narrower scope than the original session, which may cause the wallet to return a differently-scoped session. Using `getPermittedEthChainIds(this.#sessionScopes)` preserves scope parity. `this.#sessionScopes` is already maintained by `#onSessionChanged` on every session update. The `DEFAULT_CHAIN_ID` fallback handles the edge case of a first connection where no session exists yet.

Note: `connect()` already appends `DEFAULT_CHAIN_ID` internally via `chainIds.concat(DEFAULT_CHAIN_ID)` at line 361, so mainnet is always included regardless.

### Change 4: `connect-evm` `#onSessionChanged` — use session scopes for accounts on re-prompt

**File:** `packages/connect-evm/src/connect.ts`

**What:** When `#core.status === 'connected'`, use `getEthAccounts(this.#sessionScopes)` instead of the `eth_accounts` RPC call.

**Before (lines 760–770):**

```typescript
let initialAccounts: Address[] = [];
if (this.#core.status === 'connected') {
  const ethAccountsResponse = await this.#core.transport.sendEip1193Message({
    method: 'eth_accounts',
    params: [],
  });
  initialAccounts = ethAccountsResponse.result as Address[];
} else {
  initialAccounts = getEthAccounts(this.#sessionScopes);
}
```

**After:**

```typescript
const initialAccounts = getEthAccounts(this.#sessionScopes);
```

**Why:** The branching exists because, historically, `eth_accounts` was expected to return the "live" account list from the wallet. But on MWP, `sendEip1193Message` for `eth_accounts` returns a **cached** value from KVStore (`ACCOUNTS_STORE_KEY`). That cache is populated by `metamask_accountsChanged` notifications (line 275) and by `storeWalletSession` after `eth_accounts` RPC responses (line 743). Neither of those has necessarily fired yet when `#onSessionChanged` runs with the fresh session — the session scopes are updated first via `wallet_sessionChanged`, but the `eth_accounts` cache may still hold the old account list.

`getEthAccounts(this.#sessionScopes)` derives accounts directly from the session scopes that were just set on line 755 — no cache, no race. The `getEthAccounts` implementation (from `@metamask/chain-agnostic-permission`) already aggregates across all `eip155:*` scopes and deduplicates, so multi-chain sessions are handled correctly.

### Change 5 (optional): Return EIP-2255 shaped response from interceptor

**File:** `packages/connect-evm/src/connect.ts`

**What:** When `wallet_requestPermissions` is intercepted, wrap the `connect()` result in the standard EIP-2255 permission response format.

**After (in `#requestInterceptor`, after `connect()` resolves):**

```typescript
const result = await this.connect({
  chainIds,
  forceRequest: shouldForceConnectionRequest,
});

if (request.method === 'wallet_requestPermissions') {
  return [
    {
      parentCapability: 'eth_accounts',
      caveats: [
        {
          type: 'restrictReturnedAccounts',
          value: result.accounts,
        },
      ],
    },
  ];
}

return result;
```

**Why:** Currently the interceptor returns `{ accounts, chainId }` — the raw `connect()` result — which doesn't match the EIP-2255 response shape that `wallet_requestPermissions` callers expect. Portfolio's `requestPermissions` has bespoke parsing (`extractPermittedAddresses`) to handle this. Returning the standard shape eliminates the need for consumer-side workarounds.

This change is optional — the flow works without it, but it makes the API contract honest.

---

## What does NOT need to change

- **wagmi/core `connect` action** — Not involved. Re-prompt uses `provider.request({ method: 'wallet_requestPermissions' })`, which bypasses wagmi's connect action entirely and relies on the `accountsChanged` event pipeline.
- **@wagmi/connectors MetaMask connector** — The connector's `onAccountsChanged` already listens for the provider event and updates wagmi state via `config.emitter.emit('change', { accounts })`.
- **`ExtendedTransport` interface** — Already declares `forceRequest?: boolean` in its `connect` type.
- **`MetaMaskConnectMultichain.connect()`** — Already passes `forceRequest` through to `transport.connect()`.
- **`getEthAccounts` utility** — Already aggregates across all `eip155:*` scopes. No change needed.

---

## Flow After Fix

```
Portfolio calls provider.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] })
  → connect-evm #requestInterceptor catches it
  → calls this.connect({ chainIds: <from session scopes>, forceRequest: true })
  → MetaMaskConnectMultichain.connect() passes forceRequest to transport
  → MWPTransport.connect() enters onResumeSuccess with forceRequest: true
  → onResumeSuccess skips isSameScopesAndAccounts, sends wallet_createSession
  → MetaMask Mobile presents account selection UI
  → user selects accounts
  → wallet responds with updated session
  → wallet_sessionChanged notification fires
  → #onSessionChanged derives accounts from fresh session scopes via getEthAccounts
  → #onAccountsChanged emits 'accountsChanged' with full account list
  → wagmi connector's onAccountsChanged receives it
  → wagmi state updates automatically
  → connect-evm resolves, interceptor returns result
  → Portfolio merges with existing accounts
```

No disconnect. No QR code re-scan. No reconnection modal.

---

## Open Questions

1. **Wallet-side re-prompt behavior:** Does MetaMask Mobile present the account selection UI when it receives `wallet_createSession` on an existing MWP session? The SDK changes send the request correctly, but the wallet needs to treat it as a new permission prompt rather than returning the existing session silently. This needs verification against the mobile wallet — the [mobile-wallet-protocol](https://github.com/MetaMask/mobile-wallet-protocol/) repo handles transport only; session creation logic lives in the MetaMask Mobile app itself.

2. **`metamask_accountsChanged` cache timing:** After `wallet_createSession` resolves on MWP, the session cache updates via `storeWalletSession`, but the `ACCOUNTS_STORE_KEY` cache only updates when a `metamask_accountsChanged` notification arrives (line 275). Change 4 sidesteps this by using session scopes directly, but downstream consumers calling `eth_accounts` directly on the provider may still see stale data until the notification fires. This is a pre-existing issue, not introduced by this change.
