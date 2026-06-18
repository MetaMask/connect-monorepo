# MetaMask Connect — Multichain Session Lifecycle

Lifecycle rules for `createMultichainClient`: singleton merging, the concurrent-connect guard, session data shape, `wallet_sessionChanged`, persistence, headless mode, timeouts, lazy transport, permissions, and analytics. For always-on core guardrails (error handling, `supportedNetworks`) see [conventions.md](conventions.md).

## Contents

- [Singleton Merging](#singleton-merging)
- [Concurrent Connect Guard](#concurrent-connect-guard)
- [Session Data Shape](#session-data-shape)
- [dapp.url Requirement](#dappurl-requirement)
- [Multichain Events](#multichain-events)
- [Session Persistence and Resumption](#session-persistence-and-resumption)
- [Headless Mode](#headless-mode)
- [Timeouts](#timeouts)
- [Bundle / Lazy-loaded Transport](#bundle--lazy-loaded-transport)
- [Permission Handling](#permission-handling)
- [Analytics](#analytics)

## Singleton Merging

- `createMultichainClient` is a singleton — calling it multiple times returns the same instance
- On subsequent calls, new options merge into the existing instance
- The `dapp` object from the first call is used for the client's lifetime — it is **excluded from option merging** entirely (later `dapp` values are ignored)
- `api.supportedNetworks` entries merge by spreading the new map over the old — new chains are added and **existing keys are overwritten** by later calls
- Call `createMultichainClient` once at app startup and store the returned client reference

## Concurrent Connect Guard

- Only one `connect()` call can be active at a time over MetaMask Wallet Protocol (MWP)
- Calling `connect()` while a previous MWP `connect()` is pending throws a plain `Error` ("Existing connection is pending. Please check your MetaMask Mobile app to continue.") with **no numeric code** — match on the message. (`-32002` is an extension-transport RPC-queue code, not an SDK error code)
- Guard against double-clicks with a loading state or disable the connect button during connection
- The original pending `connect()` promise will resolve once the user acts in MetaMask

## Session Data Shape

- Multichain `connect()` resolves with **no value** (`Promise<void>`) — session data arrives via the `wallet_sessionChanged` event or on demand from `client.provider.getSession()`
- Session data is `SessionData`: scopes live under `sessionScopes` (e.g., `session.sessionScopes['eip155:1'].accounts`), and accounts are CAIP-10 strings (`eip155:1:0x...`)
- `sessionProperties` may be present — if empty, it is `undefined` (not an empty object)
- Always null-check `sessionProperties` before accessing its fields
- Since `@metamask/connect-evm` 1.2.0, every `wallet_createSession` request issued by `connect-evm` attaches `sessionProperties: { 'eip1193-compatible': true }`. Sessions established through `createEVMClient` will surface this flag on the resolved session, letting wallets and analytics consumers distinguish EIP-1193-style connections from pure Multichain API connections or other provider types (e.g. Solana Wallet Standard). Do not rely on it being present for sessions created directly via the multichain client

## dapp.url Requirement

- In browser environments, `dapp.url` falls back to `window.location.href` if not specified
- In Node.js and React Native, `dapp.url` is **required** — there is no `window.location` to fall back to
- Omitting `dapp.url` in non-browser environments throws `Error: You must provide dapp url` during client creation (in the browser it is auto-filled from `window.location`, which is absent in Node.js / React Native)

## Multichain Events

- **`wallet_sessionChanged`** — fires when any part of the multichain session changes (accounts, scopes, permissions)
- Listen on the multichain client directly with `client.on('wallet_sessionChanged', handler)`
- Payload contains the updated session object with all active scopes and accounts
- Fires on: initial connection, account changes, scope additions/removals, session restoration

```typescript
// Payload is SessionData | undefined — iterate sessionScopes, not the payload itself
client.on('wallet_sessionChanged', (session) => {
  for (const [scope, data] of Object.entries(session?.sessionScopes ?? {})) {
    console.log(`Scope ${scope}:`, data.accounts); // CAIP-10 account IDs
  }
});
```

## Session Persistence and Resumption

- The SDK persists session state and attempts to resume on subsequent page loads
- Listen for `wallet_sessionChanged` on startup to detect restored sessions
- Do not call `connect()` again if a session already exists — check session state first
- `createEVMClient` and `createSolanaClient` perform an initial session sync before returning, but session state should still be treated as event-driven
- Do not assume a usable session exists unless your startup logic has observed the current session state or a `wallet_sessionChanged` event

## Headless Mode

- Set `ui: { headless: true }` to suppress the default QR code modal
- Register a `display_uri` event listener **before** calling `connect()` to receive the connection URI
- `display_uri` only fires during the connecting phase — after connection or on error, it stops
- On connection error in headless mode, do **not** try to regenerate the QR from the old URI — start a new `connect()` call
- The URI is a one-time-use pairing token

## Timeouts

- Default request timeout is **60 seconds**
- Mobile Wallet Protocol uses an extended **120 second** connection timeout while waiting for user action in MetaMask Mobile
- Pending-session resumption waits about **10 seconds** before giving up
- These are internal SDK timeouts — do not implement your own shorter timeouts that race against them

## Bundle / Lazy-loaded Transport

- Since `@metamask/connect-multichain` 0.13.0, the MWP transport modules — `@metamask/mobile-wallet-protocol-core`, `@metamask/mobile-wallet-protocol-dapp-client`, and `eciesjs` — are dynamically imported only when MWP transport is actually used
- Bundlers (webpack, Vite, Rollup, Metro) can now code-split the entire MWP + crypto dependency tree out of the main chunk for consumers who only use the browser-extension flow
- Do not statically import the MWP modules yourself in app code — that defeats the code-split and re-inflates the bundle
- Since `@metamask/connect-multichain` 0.14.0, the QR-code MWP flow (desktop web and Node.js) omits the initial `wallet_createSession` request from the deeplink URI and sends it as a separate request after the wallet completes the MWP handshake. The result is a shorter deeplink URI and a less dense QR code. The native deeplink (non-QR MWP) flow used on mobile web and React Native is unchanged — no app-side action required

## Permission Handling

- Use `connect(scopes, [], undefined, true)` when you need a fresh permission prompt even if permissions already exist — `forceRequest` is the fourth positional argument
- The multichain `connect` signature is `connect(scopes, caipAccountIds, sessionProperties?, forceRequest?)` — all positional arguments, not an options object
- `wallet_requestPermissions` itself does not take a `forceRequest` parameter; the SDK handles that through `connect()`
- Without `forceRequest`, the SDK may reuse an existing compatible session
- `connect()` internally handles the underlying permission request flow, so you rarely need to call `wallet_requestPermissions` directly
- For multichain, `connect(scopes, [])` is the canonical way to request permissions for specific chains

## Analytics

- The SDK emits dapp-side analytics events and attaches wallet-correlation metadata by default. To opt out, pass `analytics: { enabled: false }` to the client factory — supported by `createMultichainClient` (`@metamask/connect-multichain` 0.15.0+), `createEVMClient` (`@metamask/connect-evm` 1.4.0+), and `createSolanaClient` (`@metamask/connect-solana` 1.2.0+)
- Setting `analytics.enabled: false` on `createMultichainClient` also omits the `analytics.remote_session_id` field from connection metadata; on the EVM/Solana clients it disables dapp-side events and wallet-correlation metadata
- To disable analytics at runtime after the client exists (rather than at construction), call `analytics.disable()` (`@metamask/analytics` 0.6.0+) — it stops event collection and clears any queued analytics events
- Respect user privacy preferences (e.g. a Do-Not-Track or cookie-consent setting) by wiring them to `analytics.enabled` / `analytics.disable()` rather than trying to intercept or block the network requests yourself
