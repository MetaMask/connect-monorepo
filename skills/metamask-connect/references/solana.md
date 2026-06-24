# MetaMask Connect — Solana Constraints

Constraints for Solana integration: wallet-adapter config, CAIP-2 genesis-hash identifiers, network support per platform, RPC routing, disconnect behavior, and platform limitations. For always-on core guardrails see [conventions.md](conventions.md); for React Native specifics see [react-native.md](react-native.md).

## Contents

- [Wallet Adapter Configuration](#wallet-adapter-configuration)
- [CAIP-2 Genesis Hash Identifiers](#caip-2-genesis-hash-identifiers)
- [Devnet and Testnet](#devnet-and-testnet)
- [RPC Routing](#rpc-routing)
- [Disconnect Scopes Behavior](#disconnect-scopes-behavior)
- [Chrome Android Bug](#chrome-android-bug)
- [React Native (no wallet-adapter)](#react-native-no-wallet-adapter)

## Wallet Adapter Configuration

- The wallet name registered by `createSolanaClient` is `"MetaMask"` (renamed from `"MetaMask Connect"` in `@metamask/connect-solana` 1.0.0). Match on exactly `"MetaMask"` — do not branch on the old `"MetaMask Connect"` literal.
- Since `@metamask/connect-solana` 1.0.0, `createSolanaClient` no longer announces its own wallet-standard provider if an injected Solana provider (e.g. the MetaMask browser extension) is already present. Treat the already-injected provider as MetaMask; your UI should not expect two wallet entries.
- `WalletProvider` must receive `wallets={[]}` — MetaMask uses the wallet-standard auto-discovery protocol
- Never manually add MetaMask to the wallets array — it will not be found and may cause duplicates
- Initialize `createSolanaClient` early in app startup, but it does not need to resolve before the first `WalletProvider` render
- If your UI depends on MetaMask already being registered, gate that UI until `createSolanaClient` resolves
- Since `@metamask/connect-solana` 1.1.0, `createSolanaClient()` eagerly initializes the Solana wallet provider during creation — if the underlying multichain session already contains Solana scopes, the provider's accounts are populated by the time the client resolves. Apps no longer need to wait for a separate `wallet_sessionChanged` event to read accounts on cold start
- Since `@metamask/connect-solana` 1.1.0, `getWallet()` returns the same wallet instance on every call instead of constructing a new one. It is safe to cache the result in a module-level constant, React `useRef`, or `useMemo` — do not call `getWallet()` on every render expecting a fresh instance

## CAIP-2 Genesis Hash Identifiers

- Solana mainnet: `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`
- Solana devnet: `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`
- These are genesis hash identifiers, not cluster URLs or chain IDs
- Always use the full CAIP-2 string as the scope in multichain `invokeMethod` and `connect`

## Devnet and Testnet

- The SDK and the wallet-standard layer model three Solana scopes — mainnet (`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`), devnet (`solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`), and testnet (`solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z`)
- Non-mainnet availability ultimately depends on the connected MetaMask build/version — don't assume a given cluster is present. Handle `connect()` / `invokeMethod` errors rather than treating devnet/testnet as guaranteed
- For Solana read calls, point a `@solana/web3.js` `Connection` at the matching cluster RPC (the SDK routes signing through the wallet, not reads)

## RPC Routing

- **All Solana methods route through the wallet** — there is no RPC node fallback
- Unlike EVM (where read methods like `eth_getBalance` go to Infura), every Solana `invokeMethod` call goes to MetaMask
- This means every Solana call may prompt the user or require wallet availability
- For Solana read operations (balance, account info), use `@solana/web3.js` `Connection` directly against an RPC endpoint

## Disconnect Scopes Behavior

- On the Solana client (`createSolanaClient`), `disconnect()` revokes **only** the Solana scopes (mainnet/devnet/testnet) — it does not touch EVM scopes. (Full-session teardown across all scopes is the _multichain_ client's `disconnect()` with no arguments.)
- On the multichain client (`createMultichainClient`), `disconnect(['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'])` revokes only Solana mainnet — EVM scopes stay active
- Disconnecting a Solana scope does not affect any active EVM connections

## Chrome Android Bug

- `@solana/wallet-adapter-react`'s `WalletProvider` registers a `beforeunload` listener to detect window-unload disconnects. On Chrome for Android this misfires with MetaMask's wallet-standard provider (which doesn't emit a disconnect on unload), corrupting connection state
- This repo works around it with an **internal** yarn patch (`.yarn/patches/@solana-wallet-adapter-react-*.patch`) that removes that `beforeunload` effect — but the patch is **not shipped in `@metamask/connect-solana`**, so your app does not inherit it
- If you use `@solana/wallet-adapter-react` and target Chrome Android, apply the equivalent patch yourself (`yarn patch` / `patch-package`), or drive the wallet-standard provider directly without the React adapter
- Test Solana flows on desktop Chrome and the MetaMask browser extension before targeting mobile

## React Native (no wallet-adapter)

- `@solana/wallet-adapter-react` / `-react-ui` are browser-only (they depend on `window` and other DOM APIs), so the wallet-adapter-based Solana flow can't run in React Native — don't import them in an RN app
- This is a constraint of the third-party adapter, not of `@metamask/connect-solana`. For Solana in RN, skip the adapter and use the multichain client (`createMultichainClient`) with `invokeMethod` on CAIP-scoped Solana RPC methods (see [setup-solana-react-native.md](../workflows/setup-solana-react-native.md))
