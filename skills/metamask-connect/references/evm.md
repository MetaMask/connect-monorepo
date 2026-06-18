# MetaMask Connect — EVM Chain ID & Switching

EVM chain ID formatting rules and `switchChain` behavior for `@metamask/connect-evm` and the wagmi `metaMask()` connector. For EVM provider events see [events.md](events.md); for always-on core guardrails (config, error handling, `supportedNetworks`) see [conventions.md](conventions.md).

## Contents

- [Hex String Requirement](#hex-string-requirement)
- [Common Chain IDs](#common-chain-ids)
- [CAIP-2 Conversion](#caip-2-conversion)
- [Auto-Included Chain](#auto-included-chain)
- [Wagmi Connector](#wagmi-connector)
- [Switch Chain Fallback](#switch-chain-fallback)
- [Validation Error](#validation-error)

## Hex String Requirement

- Chain IDs in MetaMask Connect must always be hex strings: `'0x1'` not `1` or `'1'`
- All `chainIds` arrays, `supportedNetworks` keys, and `switchChain` parameters expect hex format
- Passing a number or decimal string will cause silent failures or runtime errors
- Use `'0x' + chainId.toString(16)` to convert from decimal to hex

## Common Chain IDs

| Network           | Decimal  | Hex        | CAIP-2 Scope      |
| ----------------- | -------- | ---------- | ----------------- |
| Ethereum Mainnet  | 1        | `0x1`      | `eip155:1`        |
| Sepolia           | 11155111 | `0xaa36a7` | `eip155:11155111` |
| Polygon           | 137      | `0x89`     | `eip155:137`      |
| Arbitrum One      | 42161    | `0xa4b1`   | `eip155:42161`    |
| Optimism          | 10       | `0xa`      | `eip155:10`       |
| Base              | 8453     | `0x2105`   | `eip155:8453`     |
| Avalanche C-Chain | 43114    | `0xa86a`   | `eip155:43114`    |
| BNB Smart Chain   | 56       | `0x38`     | `eip155:56`       |
| Celo              | 42220    | `0xa4ec`   | `eip155:42220`    |
| Linea             | 59144    | `0xe708`   | `eip155:59144`    |

## CAIP-2 Conversion

- EVM CAIP-2 format is `eip155:<decimal-chainId>` — always uses decimal, not hex
- EVM RPC / EIP-1193 format uses hex strings (`0x1`)
- Multichain `invokeMethod` scope uses CAIP-2 (`eip155:1`)
- EVM client `connect({ chainIds })` uses hex strings (`['0x1']`)
- Convert: hex `0x89` → decimal `137` → CAIP-2 `eip155:137`

## Auto-Included Chain

- `0x1` (Ethereum mainnet) is automatically included in the EVM client's `connect()` **permission request** even if you don't pass it in `chainIds`
- It is **not** injected into `api.supportedNetworks` — that map must explicitly contain every chain you use (including mainnet), and `createEVMClient` throws if it is empty
- All chains need valid RPC URLs in `supportedNetworks`
- If you use Infura RPC URLs, make sure the needed chains are enabled for your Infura project/API key

## Wagmi Connector

- The wagmi MetaMask connector is imported from `wagmi/connectors`: `import { metaMask } from 'wagmi/connectors'` — it requires `@metamask/connect-evm` as a peer dependency
- Use `getInfuraRpcUrls({ infuraApiKey: 'API_KEY', chainIds?: Hex[] })` from `@metamask/connect-evm` to populate `supportedNetworks` — returns a hex-chain-ID-keyed map of Infura RPC URLs (e.g. `{ '0x1': 'https://...', '0x89': 'https://...' }`); `chainIds` is optional and filters to specific hex chain IDs
- The multichain equivalent in `@metamask/connect-multichain` is `getInfuraRpcUrls({ infuraApiKey: 'API_KEY', caipChainIds?: string[] })` — returns a CAIP-2-keyed map (e.g. `{ 'eip155:1': 'https://...' }`) and accepts CAIP-2 IDs for filtering

## Switch Chain Fallback

- Use `client.switchChain({ chainId, chainConfiguration? })` to switch the active EVM chain
- If the chain is not already added in MetaMask, `wallet_switchEthereumChain` can fail
- Pass `chainConfiguration` directly to `client.switchChain()` as the `wallet_addEthereumChain` fallback payload
- In wagmi flows, the connector passes the same fallback config through to the underlying SDK `switchChain()` call
- Since `@metamask/connect-evm` 1.2.0, calling `switchChain({ chainId })` without a `chainConfiguration` now surfaces the wallet's **original** `Unrecognized chain ID` error (EIP-1193 code `4902`) instead of the previous `No chain configuration found.` wrapper. Catch the raw code in your `catch` block and either retry with a `chainConfiguration` fallback, call `wallet_addEthereumChain` explicitly, or prompt the user to add the chain — do not pattern-match on the legacy `"No chain configuration found"` message string
- Since `@metamask/connect-evm` 2.0.0, MWP-backed (Mobile Wallet Protocol) EIP-1193 requests reject with the wallet's error consistently with the default transport, so `switchChain()` no longer inspects returned error payloads — wallet errors (including `4902`) always arrive as a **rejected promise**. Handle switch-chain failures purely in `catch`; do not check for an error object in the resolved value of `switchChain()` or a `provider.request({ method: 'wallet_switchEthereumChain' })` call

## Validation Error

- Making an RPC request whose **active** chain's CAIP scope is missing from `supportedNetworks` throws `Chain eip155:<id> is not configured in supportedNetworks. Requests cannot be made to chains not explicitly configured in supportedNetworks.`
- This check lives in the EIP-1193 provider's `request()` path — **not** in `connect()`. `connect()` only validates that `chainIds` is a non-empty array, and `wallet_switchEthereumChain` is forwarded to the wallet (it is not gated by `supportedNetworks`).
- Fix: add every chain the dApp reads from to `supportedNetworks` with a valid RPC URL before selecting it
