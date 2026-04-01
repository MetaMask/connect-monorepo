## fix(connect-evm, connect-multichain): support account re-selection via `wallet_requestPermissions` on MWP

### Problem

When a user wants to add or change accounts after an initial connection, consumers like Portfolio currently have to `disconnectAsync()` + `connectAsync()` through wagmi. This forces the user through a full reconnection flow — bad UX, especially on mobile where it means scanning a QR code again.

The `wallet_requestPermissions` flow in `connect-evm` is designed to handle this by calling `connect({ forceRequest: true })`, which should bypass the "already connected" short-circuit and re-prompt the user for account selection. The `forceRequest` plumbing already exists at every layer — `connect-evm`, `MetaMaskConnectMultichain`, `DefaultTransport` — except the final one: **`MWPTransport` ignores `forceRequest`**, so the re-prompt silently no-ops on mobile.

A secondary issue is that on re-prompt, the interceptor was hardcoding `chainIds: ['0x1']` instead of using the session's chain IDs, meaning the `wallet_createSession` request had a narrower scope than the original session.

A third issue is that `#onSessionChanged` was calling `eth_accounts` via RPC when already connected, but on MWP this returns a **cached** value that may not yet reflect the freshly updated session — creating a race condition where the old account list is emitted.

### Changes

**1. `MWPTransport.connect()` — accept `forceRequest`** (`connect-multichain`)

Added `forceRequest?: boolean` to the `connect()` options type so it's forwarded to `onResumeSuccess`.

**2. `MWPTransport.onResumeSuccess()` — bypass scope check when forced** (`connect-multichain`)

When `forceRequest` is true, skip the `isSameScopesAndAccounts` check and unconditionally send `wallet_createSession`. This mirrors `DefaultTransport`'s existing behavior.

**3. `connect-evm` `#requestInterceptor` — use session chain IDs**

Replaced the hardcoded `chainIds: ['0x1']` with `getPermittedEthChainIds(this.#sessionScopes)`, so the re-prompt scope matches the initial connection scope. Falls back to `DEFAULT_CHAIN_ID` when no session exists yet.

**4. `connect-evm` `#onSessionChanged` — derive accounts from session scopes**

Simplified to always use `getEthAccounts(this.#sessionScopes)` instead of branching between an `eth_accounts` RPC call (when connected) and session scope extraction (when disconnected). The session scopes are the authoritative source — they're set immediately by `wallet_sessionChanged`, while the `eth_accounts` cache may still hold stale data.

### Flow after fix

```
wallet_requestPermissions
  → connect-evm interceptor: connect({ chainIds: <from session>, forceRequest: true })
  → MetaMaskConnectMultichain.connect() forwards forceRequest to transport
  → MWPTransport.onResumeSuccess() skips scope check, sends wallet_createSession
  → MetaMask Mobile presents account selection UI
  → wallet responds with updated session
  → wallet_sessionChanged fires
  → #onSessionChanged derives accounts from fresh session scopes
  → accountsChanged emitted → wagmi state updates
```


### Test plan

- [ ] Verify `wallet_requestPermissions` triggers account selection UI on MWP (mobile)
- [ ] Verify re-prompt preserves all original session chains (not just mainnet)
- [ ] Verify accounts update correctly after re-selection without stale cache
- [ ] Verify initial connection flow (no existing session) is unchanged
- [ ] Verify `DefaultTransport` (extension) behavior is unchanged
- [ ] Unit tests pass (22 connect-evm, 306 connect-multichain)
