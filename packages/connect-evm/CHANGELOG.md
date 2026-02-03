# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **BREAKING** Standardize `chainId` to use `Hex` format throughout the public API ([#150](https://github.com/MetaMask/connect-monorepo/pull/150))
  - `connect()`, `connectAndSign()`, and `connectWith()` now expect `chainIds` as hex strings instead of decimal numbers
  - `connect()` now returns `{ accounts, chainId: Hex }` instead of `{ accounts, chainId: number }`
  - `switchChain()` now expects `chainId: Hex` instead of `chainId: number | Hex`
  - `createEVMClient()` param option `api.supportedNetworks` now expects hex chain IDs as keys (e.g., `'0x1'`) instead of CAIP chain IDs
  - Event handler types for `connectAndSign` and `connectWith` now use `Hex` for `chainId`
- **BREAKING** `getInfuraRpcUrls` now returns a rpc url map keyed by hex chain ID rather than CAIP Chain ID ([#152](https://github.com/MetaMask/connect-monorepo/pull/152))
- The `debug` option param used by `createEVMClient()` now enables console debug logs of the underlying `MultichainClient` instance ([#149](https://github.com/MetaMask/connect-monorepo/pull/149))
- update `connect()` and `createEVMClient()` typings to be more accurate ([#153](https://github.com/MetaMask/connect-monorepo/pull/153))
- update `switchChain()` to return `Promise<void>` ([#153](https://github.com/MetaMask/connect-monorepo/pull/153))

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

[Unreleased]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.4.1...HEAD
[0.4.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.4.0...@metamask/connect-evm@0.4.1
[0.4.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.3.1...@metamask/connect-evm@0.4.0
[0.3.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.3.0...@metamask/connect-evm@0.3.1
[0.3.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.2.0...@metamask/connect-evm@0.3.0
[0.2.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.1.2...@metamask/connect-evm@0.2.0
[0.1.2]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.1.1...@metamask/connect-evm@0.1.2
[0.1.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.1.0...@metamask/connect-evm@0.1.1
[0.1.0]: https://github.com/MetaMask/connect-monorepo/releases/tag/@metamask/connect-evm@0.1.0
