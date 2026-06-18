# MetaMask Connect — Conventions & Guardrails

Always-on guardrails for the MetaMask Connect SDK, distilled from the [MetaMask Connect Cursor plugin](https://github.com/MetaMask/metamask-connect-cursor-plugin) rules. Apply the core rules below whenever you generate or review MetaMask Connect (`@metamask/connect-evm` / `-multichain` / `-solana`) or wagmi `metaMask()` connector code. Deeper, domain-specific guidance lives in the focused reference files indexed below — read the one(s) relevant to your task.

## Topic index

Each topic has a single canonical home. Load the file for the area you're working in:

| Topic                                                                        | Reference                                |
| ---------------------------------------------------------------------------- | ---------------------------------------- |
| EVM chain ID format (hex vs CAIP-2), `switchChain`, validation               | [evm.md](evm.md)                         |
| Event handling — EIP-1193 events, `eventHandlers`, EIP-6963, status          | [events.md](events.md)                   |
| Multichain session lifecycle — singleton, `wallet_sessionChanged`, timeouts  | [multichain.md](multichain.md)           |
| Solana constraints — wallet adapter, CAIP-2 genesis hashes, RPC routing      | [solana.md](solana.md)                   |
| React Native — polyfills, import order, Metro `extraNodeModules`, `openLink` | [react-native.md](react-native.md)       |
| Content Security Policy (browser) origins                                    | [csp.md](csp.md)                         |
| Testing patterns — mocking, singleton cleanup, test networks                 | [testing.md](testing.md)                 |
| Symptom → cause → fix index for connection/polyfill/QR issues                | [troubleshooting.md](troubleshooting.md) |

## Core (always-on)

These cross-cutting rules apply to every MetaMask Connect integration regardless of stack.

### Import Paths

- Import EVM client from `@metamask/connect-evm`
- Import multichain client from `@metamask/connect-multichain`
- Import Solana client from `@metamask/connect-solana`
- Never import from internal sub-packages like `@metamask/connect/dist/...` or `@metamask/connect-evm/src/...`
- Use the wagmi connector from the published entrypoint your installed version exposes; do not assume `@metamask/connect-evm/wagmi` exists unless your package version exports it
- `@metamask/connect-multichain` is a **regular dependency** of both `@metamask/connect-evm` and `@metamask/connect-solana` (since 2.1.0) and is installed transitively — you do not need to add it yourself. (Only the 2.0.0 releases briefly made it a peer dependency.) Both clients warn at runtime on duplicate or mismatched `@metamask/connect-multichain` resolutions; if you do depend on it directly (e.g. to use `createMultichainClient`), use `^1.0.0` — it is a stable 1.x package following strict semver

### Required Configuration

- `dapp.name` is always required — it appears in the MetaMask connection prompt
- `dapp.url` is required in Node.js and React Native environments (no `window.location` available)
- `dapp.url` in browser can default to `window.location.href` but explicit is safer
- `dapp.iconUrl` is optional — displayed in MetaMask connection UI
- `dapp.base64Icon` is an alternative to `iconUrl` — pass a base64-encoded icon string directly (useful when a hosted URL is unavailable, e.g., in React Native)

### Supported Networks

- Every chain the dApp interacts with must be in `api.supportedNetworks` with a reachable RPC URL
- Use `getInfuraRpcUrls({ infuraApiKey: 'API_KEY', chainIds?: Hex[] })` to populate common EVM chains — it returns a hex-keyed map for `createEVMClient`
- Use `getInfuraRpcUrls({ infuraApiKey: 'API_KEY', caipChainIds?: string[] })` to populate CAIP-2 chains for `createMultichainClient`
- Use `getInfuraRpcUrls({ infuraApiKey: 'API_KEY', networks: SolanaNetwork[] })` from `@metamask/connect-solana` to populate a network-name-keyed map for `createSolanaClient` — `networks` is required
- Chain `0x1` (Ethereum mainnet) is auto-included in the EVM `connect()` permission request if not specified — but it is **not** auto-added to `supportedNetworks`, which must list every chain explicitly
- Making an RPC request whose active chain is missing from `supportedNetworks` throws "not configured in supportedNetworks" (the check runs in the provider's `request()` path, not in `connect()`). See [evm.md → Validation Error](evm.md#validation-error)

### Singleton Behavior

- `createMultichainClient` is the singleton shared core instance
- `createEVMClient` and `createSolanaClient` create chain-specific wrappers on top of that shared multichain core
- Repeated client creation still reuses the existing multichain session and merged core options, but EVM/Solana wrappers can attach fresh listeners
- The multichain core keeps the `dapp` object from the first call and does not overwrite it later
- Never call `create*Client` inside a React component render — call it once at app startup
- Do not wrap client creation in `useEffect` or other hooks that may re-run
- Full merge semantics: [multichain.md → Singleton Merging](multichain.md#singleton-merging)

### Error Handling

- Code `4001`: User rejected the request — show retry UI, do not log as application error. On the EVM provider it appears as `err.code`; on the multichain client it appears as `err.rpcCode` (see below)
- Code `-32002` ("request already pending") comes from the **extension transport only** — multichain MWP concurrent `connect()` instead throws a plain `Error` ("Existing connection is pending...") with no numeric code
- Wrap all `connect()`, `invokeMethod()`, and signing calls in try/catch
- Multichain `invokeMethod()` errors are wrapped in `RPCInvokeMethodErr` (its own `code` is `53`); the wallet's original code/message/data are preserved on `rpcCode` / `rpcMessage` / `rpcData`:

  ```typescript
  import { RPCInvokeMethodErr } from '@metamask/connect-multichain';

  try {
    await client.invokeMethod({ scope, request });
  } catch (err) {
    if (err instanceof RPCInvokeMethodErr && err.rpcCode === 4001) {
      // user rejection
    }
  }
  ```

- Other exported error classes: `RPCHttpErr` (code 50), `RPCReadonlyResponseErr` (51), `RPCReadonlyRequestErr` (52) — for RPC-node-routed read calls. (There are no `ProtocolError`/`StorageError`/`RpcError` exports.)

### Connection State

- Check connection state before making signing requests
- Listen for `wallet_sessionChanged` to track session state reactively
- Do not call `connect()` on page reload if a session already exists — listen for session restoration via events
- **Multichain client:** `disconnect()` with no arguments revokes all scopes and terminates the session; `disconnect(scopes)` revokes only those scopes
- **EVM client:** `disconnect()` revokes only the `eip155:*` scopes — Solana scopes on the same session survive; full teardown requires the multichain client
- `disconnect(scopes)` with specific scopes only revokes those scopes

### Unsupported Methods

- The EVM client **rejects** certain methods with `Method: <name> is not supported by Metamask Connect/EVM` (they are not silently ignored)
- Since `@metamask/connect-evm` 2.0.0, `wallet_requestPermissions` resolves to a spec-shaped requested-permissions array — but `connect()` remains the canonical way to establish permissions
