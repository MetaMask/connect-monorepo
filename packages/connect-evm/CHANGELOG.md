# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0]

### Uncategorized

- refactor(connect-evm): inline CAIP helpers, drop `@metamask/chain-agnostic-permission` ([#289](https://github.com/MetaMask/connect-monorepo/pull/289))

### Removed

- Remove `@metamask/chain-agnostic-permission` dependency. The two helpers used from it (`getEthAccounts`, `getPermittedEthChainIds`) and the `parseScopeString` utility are now implemented locally on top of `@metamask/utils` primitives. This drops the transitive `@metamask/controller-utils` / `lodash` / `bn.js` / `eth-ens-namehash` / `fast-deep-equal` / `@metamask/ethjs-unit` chain from the `connect-evm` bundle.

## [1.2.0]

### Added

- Send `sessionProperties: { 'eip1193-compatible': true }` on every `wallet_createSession` request issued by `connect-evm`. This lets wallets distinguish EIP-1193-style connections established through `@metamask/connect-evm` from pure Multichain API connections or other provider types (e.g. Solana Wallet Standard) ([#285](https://github.com/MetaMask/connect-monorepo/pull/285))

### Fixed

- Fix `wallet_switchEthereumChain` (and `EvmClient.switchChain()` when called without a `chainConfiguration` fallback) to forward the original `Unrecognized chain ID` error to the dapp instead of replacing it with `No chain configuration found.` ([#287](https://github.com/MetaMask/connect-monorepo/pull/287))

## [1.1.0]

### Changed

- Cleanup initialization promise logic ([#281](https://github.com/MetaMask/connect-monorepo/pull/281))

## [1.0.0]

### Changed

- **BREAKING** `connectAndSign` now returns `{ accounts: Address[]; chainId: Hex; signature: string }` instead of a bare `string`. Code that previously destructured or assigned the return value as a string must be updated to read `.signature`. ([#266](https://github.com/MetaMask/connect-monorepo/pull/266))
- **BREAKING** `connectWith` now returns `{ accounts: Address[]; chainId: Hex; result: unknown }` instead of `unknown`. Code that previously used the return value as the raw RPC result must be updated to read `.result`. ([#266](https://github.com/MetaMask/connect-monorepo/pull/266))

## [0.11.2]

### Changed

- Bump `@metamask/connect-multichain` to `^0.12.1` ([#273](https://github.com/MetaMask/connect-monorepo/pull/273))

## [0.11.1]

### Fixed

- Ensure `createEVMClient()` waits until the underlying instance is fully initialized before resolving ([#265](https://github.com/MetaMask/connect-monorepo/pull/265))

## [0.11.0]

### Changed

- **BREAKING** `EvmClient.status` now reflects the actual internal status of the `EvmClient` instance instead of proxying the underlying `MultichainClient.status`. The return type changes from `ConnectionStatus` to `ConnectEvmStatus`. ([#270](https://github.com/MetaMask/connect-monorepo/pull/270))

### Fixed

- Ensure EIP-1193 provider properties (`selectedChainId`, `accounts`) are updated before emitting the `connect` event ([#269](https://github.com/MetaMask/connect-monorepo/pull/269))

## [0.10.0]

### Changed

- Bump `@metamask/connect-multichain` to `^0.12.0` ([#261](https://github.com/MetaMask/connect-monorepo/pull/261))

## [0.9.1]

### Changed

- chore: align sub-package licenses with root ConsenSys 2022 license ([#241](https://github.com/MetaMask/connect-monorepo/pull/241))
- chore: turborepo ([#239](https://github.com/MetaMask/connect-monorepo/pull/239))

### Fixed

- `wallet_requestPermissions` now correctly re-prompts account selection on MWP (mobile) without requiring a full disconnect/reconnect cycle. The request forwards `forceRequest: true` through to `MWPTransport`, which previously ignored it and silently returned the existing session. ([#243](https://github.com/MetaMask/connect-monorepo/pull/243))

## [0.9.0]

### Changed

- Migrate `metamask_accountsChanged` and `metamask_chainChanged` subscriptions from `transport.onNotification()` to typed `core.on()`/`core.off()`, removing `@ts-expect-error` suppressions ([#230](https://github.com/MetaMask/connect-monorepo/pull/230))

### Fixed

- `EIP1193Provider.request()` now re-surfaces the original numeric RPC error code as `error.code` on the thrown error, matching the EIP-1193 error shape expected by dApps, wagmi, and ethers.js. Previously `error.code` was always `undefined`. ([#232](https://github.com/MetaMask/connect-monorepo/pull/232))

## [0.8.0]

### Changed

- **BREAKING** `getInfuraRpcUrls` now accepts a single options object `{ infuraApiKey, chainIds? }` instead of a positional `infuraApiKey` string. The optional `chainIds` parameter accepts hex chain IDs to filter the output ([#211](https://github.com/MetaMask/connect-monorepo/pull/211))
- use merged integration types in analytics ([#223](https://github.com/MetaMask/connect-monorepo/pull/223))

### Fixed

- fix: Fix react-native-playground consumption of **PACKAGE_VERSION** build-time constant in connect packages ([#221](https://github.com/MetaMask/connect-monorepo/pull/221))

## [0.7.0]

### Added

- Enable specifying the integration type for analytics. Defaults to `direct`. ([#213](https://github.com/MetaMask/connect-monorepo/pull/213))
- Pass `connect-evm` package version to `createMultichainClient` via the `versions` option so it appears in analytics events ([#206](https://github.com/MetaMask/connect-monorepo/pull/206))

### Fixed

- Fix an issue where `connect` would always return the default chain id regardless of other chains being specified. This also affected `connectWith` and `connectAndSign` ([#205](https://github.com/MetaMask/connect-monorepo/pull/205))

## [0.6.0]

### Added

- Bump `@metamask/connect-multichain` to `^0.8.0` ([#203](https://github.com/MetaMask/connect-monorepo/pull/203))

## [0.5.0]

### Changed

- **BREAKING** Standardize `chainId` to use `Hex` format throughout the public API ([#150](https://github.com/MetaMask/connect-monorepo/pull/150))
  - `connect()`, `connectAndSign()`, and `connectWith()` now expect `chainIds` as hex strings instead of decimal numbers
  - `connect()` now returns `{ accounts, chainId: Hex }` instead of `{ accounts, chainId: number }`
  - `switchChain()` now expects `chainId: Hex` instead of `chainId: number | Hex`
  - `createEVMClient()` param option `api.supportedNetworks` now expects hex chain IDs as keys (e.g., `'0x1'`) instead of CAIP chain IDs
  - Event handler types for `connectAndSign` and `connectWith` now use `Hex` for `chainId`
- **BREAKING** `getInfuraRpcUrls` now returns a rpc url map keyed by hex chain ID rather than CAIP Chain ID ([#152](https://github.com/MetaMask/connect-monorepo/pull/152))
- **BREAKING** `disconnect()` now revokes only `eip155:*` scopes instead of revoking the entire multichain session. Non-EVM scopes (for example Solana) are preserved. ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))
- **BREAKING** EIP-1193 `connect` event payload now includes accounts: `{ chainId: Hex; accounts: Address[] }` (previously `{ chainId: Hex }`). ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))
- The `debug` option param used by `createEVMClient()` now enables console debug logs of the underlying `MultichainClient` instance ([#149](https://github.com/MetaMask/connect-monorepo/pull/149))
- update `connect()` and `createEVMClient()` typings to be more accurate ([#153](https://github.com/MetaMask/connect-monorepo/pull/153))
- update `switchChain()` to return `Promise<void>` ([#153](https://github.com/MetaMask/connect-monorepo/pull/153))
- Make `ConnectEvm` rely on `wallet_sessionChanged` events from `ConnectMultichain` rather than explicit connect/disconnect events ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))
- Chain add/switch deeplink now calls `openSimpleDeeplinkIfNeeded()` instead of `openDeeplinkIfNeeded()` to align with `@metamask/connect-multichain` changes ([#176](https://github.com/MetaMask/connect-monorepo/pull/176))

### Fixed

- Fix `display_uri` and `wallet_sessionChanged` events not firing after disconnect and reconnect in headless mode ([#170](https://github.com/MetaMask/connect-monorepo/pull/170))

## [0.4.1]

### Fixed

- `createEVMClient` now ensures session resumption is properly awaited before returning the client instance. Previously there was a race condition which made it possible to make requests to the EIP-1193 provider before the underlying session was fully ready ([#141](https://github.com/MetaMask/connect-monorepo/pull/141))

## [0.4.0]

### Added

- `createEVMClient` now accepts `ui` in its param options. See `@metamask/connect-multichain` for examples of usage ([#140](https://github.com/MetaMask/connect-monorepo/pull/140))

## [0.3.1]

### Fixed

- Fix `ConnectEvm.connect()` not being able to establish an initial connection due to empty object `sessionProperties` ([#138](https://github.com/MetaMask/connect-monorepo/pull/138))

## [0.3.0]

### Added

- Add `ConnectEvm.status` property which exposes the current `ConnectionStatus` ([#136](https://github.com/MetaMask/connect-monorepo/pull/136))

### Fixed

- Fix `eth_chainId` requests not being resolved from local cached state when using the EIP-1193 Provider `request()` method over the `MwpTransport` ([#124](https://github.com/MetaMask/connect-monorepo/pull/124))

## [0.2.0]

### Added

- Add `display_uri` event support for custom QR code UI implementations ([#130](https://github.com/MetaMask/connect-monorepo/pull/130))
  - `display_uri` event on `EIP1193Provider` emitted when QR code link is available
  - `displayUri` callback in `EventHandlers` for event-based subscriptions
  - Forwarded from `@metamask/connect-multichain` core to EIP-1193 provider layer
- Add `mobile.preferredOpenLink` option support for React Native deeplink handling in wagmi connector ([#118](https://github.com/MetaMask/connect-monorepo/pull/118))
  - Allows React Native apps to use `Linking.openURL()` instead of `window.location.href` for opening MetaMask deeplinks
  - Required for wagmi connector usage in React Native environments
- Add legacy compatibility methods to `EIP1193Provider` for broader ecosystem compatibility ([#102](https://github.com/MetaMask/connect-monorepo/pull/102))
  - `chainId` getter (alias for `selectedChainId`)
  - `sendAsync()` for callback/promise-based JSON-RPC requests
  - `send()` for callback-based JSON-RPC requests

### Changed

- **BREAKING** Rename `createMetamaskConnectEVM` to `createEVMClient` for a cleaner naming convention ([#114](https://github.com/MetaMask/connect-monorepo/pull/114))

### Removed

- Revert: Fix local state not correctly being reset when establishing a new connection when there is an existing active session ([#119](https://github.com/MetaMask/connect-monorepo/pull/119))

### Fixed

- Fix selected chainId incorrectly reverting to Ethereum Mainnet after page refresh by caching the selected chainId and retrieving it from storage instead of assuming the first permitted chain is selected ([#113](https://github.com/MetaMask/connect-monorepo/pull/113))
- Update `#attemptSessionRecovery()` to check to state before attempting recovery ([#107](https://github.com/MetaMask/connect-monorepo/pull/107))
- Bind all public methods in `EIP1193Provider` constructor to ensure stable `this` context when methods are extracted or passed as callbacks ([#102](https://github.com/MetaMask/connect-monorepo/pull/102))

## [0.1.2]

### Added

- **BREAKING** Replace `chainId` property on `connect` method with `chainIds` to support for connecting to multiple chains ([#77](https://github.com/MetaMask/connect-monorepo/pull/77))

### Changed

- Bump `@metamask/connect-multichain` removing `enable` flag from `analytics` ([#92](https://github.com/MetaMask/connect-monorepo/pull/92))
- **BREAKING** Change `connectWithMessage()` to expect param object with `message` and optional `chainIds` property ([#82](https://github.com/MetaMask/connect-monorepo/pull/82))
  - `message` should be the value that the user will prompted to sign with their selected account after connecting. `message` is required.
  - `chainIds` should be an array of chainIds that the wallet will prompt the user to grant permisson for. `chainIds` is optional.

### Fixed

- Fix duplicate `onNotification` listener ([#81](https://github.com/MetaMask/connect-monorepo/pull/81))
- Fixed `addEthereumChain` not being prompted on mobile native browsers after a switch chain failure ([#79](https://github.com/MetaMask/connect-monorepo/pull/79))
- Fix local state not correctly being reset when establishing a new connection when there is an existing active session ([#88](https://github.com/MetaMask/connect-monorepo/pull/88))

## [0.1.1]

### Fixed

- Eagerly call `onChainChanged` when `switchChain` is called (rather than waiting for the `chainChanged` event), this ensures that the provider's selected chain ID is updated even if the `chainChanged` event is not received ([#62](https://github.com/MetaMask/connect-monorepo/pull/62))

- Fixed incorrect caching of error responses for some requests/events ([#59](https://github.com/MetaMask/connect-monorepo/pull/59))

## [0.1.0]

### Added

- Initial release ([#58](https://github.com/MetaMask/connect-monorepo/pull/58))

[Unreleased]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@1.3.0...HEAD
[1.3.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@1.2.0...@metamask/connect-evm@1.3.0
[1.2.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@1.1.0...@metamask/connect-evm@1.2.0
[1.1.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@1.0.0...@metamask/connect-evm@1.1.0
[1.0.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.11.2...@metamask/connect-evm@1.0.0
[0.11.2]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.11.1...@metamask/connect-evm@0.11.2
[0.11.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.11.0...@metamask/connect-evm@0.11.1
[0.11.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.10.0...@metamask/connect-evm@0.11.0
[0.10.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.9.1...@metamask/connect-evm@0.10.0
[0.9.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.9.0...@metamask/connect-evm@0.9.1
[0.9.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.8.0...@metamask/connect-evm@0.9.0
[0.8.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.7.0...@metamask/connect-evm@0.8.0
[0.7.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.6.0...@metamask/connect-evm@0.7.0
[0.6.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.5.0...@metamask/connect-evm@0.6.0
[0.5.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.4.1...@metamask/connect-evm@0.5.0
[0.4.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.4.0...@metamask/connect-evm@0.4.1
[0.4.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.3.1...@metamask/connect-evm@0.4.0
[0.3.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.3.0...@metamask/connect-evm@0.3.1
[0.3.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.2.0...@metamask/connect-evm@0.3.0
[0.2.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.1.2...@metamask/connect-evm@0.2.0
[0.1.2]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.1.1...@metamask/connect-evm@0.1.2
[0.1.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.1.0...@metamask/connect-evm@0.1.1
[0.1.0]: https://github.com/MetaMask/connect-monorepo/releases/tag/@metamask/connect-evm@0.1.0
