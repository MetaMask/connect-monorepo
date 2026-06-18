# MetaMask Connect — Solana Constraints

Constraints for Solana integration: wallet-adapter config, CAIP-2 genesis-hash identifiers, network support per platform, RPC routing, disconnect behavior, and platform limitations. For always-on core guardrails see [conventions.md](conventions.md); for React Native specifics see [react-native.md](react-native.md).

## Contents

- [Wallet Adapter Configuration](#wallet-adapter-configuration)
- [CAIP-2 Genesis Hash Identifiers](#caip-2-genesis-hash-identifiers)
- [Devnet and Testnet](#devnet-and-testnet)
- [RPC Routing](#rpc-routing)
- [Disconnect Scopes Behavior](#disconnect-scopes-behavior)
- [Chrome Android Bug](#chrome-android-bug)
- [React Native Limitation](#react-native-limitation)

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

- There is a known issue with `@solana/wallet-adapter-react` on Chrome Android when used with the wallet-standard provider from `@metamask/connect-solana`
- The connect monorepo carries a patch for the wallet-adapter behavior in that setup
- Treat Solana wallet-adapter flows on mobile Chrome as fragile until you verify them explicitly
- Test Solana flows on desktop Chrome and MetaMask browser extension wallet before targeting mobile

## React Native Limitation

- The Solana wallet adapter (`@solana/wallet-adapter-react`) is **not supported** in React Native
- For Solana in React Native, use the multichain client (`createMultichainClient`) with `invokeMethod` directly
- Do not attempt to import `@solana/wallet-adapter-react` or `@solana/wallet-adapter-react-ui` in RN — they depend on browser APIs
