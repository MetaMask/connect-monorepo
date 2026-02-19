# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- When `ConnectMultichain.connect()` is called while a connection is already pending, the user is re-prompted with the pending connection deeplink. ([#176](https://github.com/MetaMask/connect-monorepo/pull/176))

### Changed

- **BREAKING** `createMultichainClient()` now returns a singleton. Any incoming constructor params on subsequent calls to `createMultichainClient()` will be applied to the existing singleton instance except for the `dapp`, `storage`, and `ui.factory` param options. ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))
- **BREAKING** `ConnectMultichain.openDeeplinkIfNeeded()` is renamed to `openSimpleDeeplinkIfNeeded()` ([#176](https://github.com/MetaMask/connect-monorepo/pull/176))
- `ConnectMultichain.connect()` now throws an `'Existing connection is pending. Please check your MetaMask Mobile app to continue.'` error if there is already an ongoing connection attempt. Previously it would abort that ongoing connection in favor of a new one. ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))
- `ConnectMultichain.connect()` adds newly requested scopes and accounts onto any existing permissions rather than fully replacing them. ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))
- `ConnectMultichain.disconnect()` accepts an optional array of scopes. When provided, only those scopes will be revoked from the existing permissions. If no scopes remain after a partial revoke, then the underly connection is fully discarded. If no scopes are specified ()`[]`), then all scopes will be removed. By default all scopes will be removed. ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))

### Fixed

- `ConnectMultichain` now waits 10 seconds (rather than 2 minutes) when attempting to resume a pending connection on initial instantiation via `createMultichainClient()` ([#175](https://github.com/MetaMask/connect-monorepo/pull/175))
- Fix `beforeunload` event listener not being properly removed on disconnect due to `.bind()` creating different function references, causing a listener leak on each connect/disconnect cycle ([#170](https://github.com/MetaMask/connect-monorepo/pull/170))

## [0.5.3]

### Added

- `createMultichainClient()` now accepts an optional `debug` param option which enables console debug logs when set to `true`. Defaults to `false`. ([#149](https://github.com/MetaMask/connect-monorepo/pull/149))

### Fixed

- Fix QR rejection handling: properly propagate user rejection errors from MetaMask Mobile to the dApp ([#156](https://github.com/MetaMask/connect-monorepo/pull/156))
- Close QR modal automatically when user rejects connection ([#156](https://github.com/MetaMask/connect-monorepo/pull/156))
- Use `@metamask/rpc-errors` for EIP-1193 compliant error handling ([#156](https://github.com/MetaMask/connect-monorepo/pull/156))
- Fix `sessionProperties` not being passed to `wallet_createSession` when recreating a session after scope/account changes ([#123](https://github.com/MetaMask/connect-monorepo/pull/123))

## [0.5.2]

### Changed

- `ConnectMultichain.connect()` will send `sessionProperties` as undefined when called with an empty object `{}` in order to ensure that the initial `wallet_createSession` request does not fail immediately ([#138](https://github.com/MetaMask/connect-monorepo/pull/138))

## [0.5.1]

### Fixed

- fix: Resolve Buffer polyfill requirement for browser/React Native consumers ([#121](https://github.com/MetaMask/connect-monorepo/pull/121))

## [0.5.0]

### Added

- Add `display_uri` event emission for QR code links to support custom UI implementations ([#130](https://github.com/MetaMask/connect-monorepo/pull/130))
  - Emitted when QR code link is generated during connection
  - Emitted when QR code is regenerated on expiration
  - Emitted for deeplink connections on mobile web
- Add `onDisplayUri` callback to `InstallWidgetProps` for notifying when QR codes are generated/regenerated ([#130](https://github.com/MetaMask/connect-monorepo/pull/130))
- Add headless mode support that emits `display_uri` without rendering modal UI ([#130](https://github.com/MetaMask/connect-monorepo/pull/130))
- Add `sessionProperties` parameter to `connect()` method for passing custom session configuration to wallets([#80](https://github.com/MetaMask/connect-monorepo/pull/80))
- Introduce `MultichainApiClientWrapperTransport` to provide the provider interface before connection is established([#80](https://github.com/MetaMask/connect-monorepo/pull/80))

### Changed

- **BREAKING** Rename `state` property to `status` on `MultichainCore` for improved clarity ([#125](https://github.com/MetaMask/connect-monorepo/pull/125))
- **BREAKING** Rename `createMetamaskConnect` to `createMultichainClient` for a cleaner naming convention ([#114](https://github.com/MetaMask/connect-monorepo/pull/114))
- Provider is now always available via `sdk.provider` regardless of connection state (wrapper handles disconnected state internally)([#80](https://github.com/MetaMask/connect-monorepo/pull/80))

### Fixed

- Fix `wallet_sessionChanged` events subsequent to the initial connection not being persisted ([#100](https://github.com/MetaMask/connect-monorepo/pull/100))
- Fix hanging when attempting to resume a previous connection initialization in which the wallet does not send any response at all ([#103](https://github.com/MetaMask/connect-monorepo/pull/103))

## [0.4.0]

### Changed

- **BREAKING** Remove opt-out of analytics from `connect-multichain`. `MultichainOptions` removes the `enable` flag from `analytics` config object ([#92](https://github.com/MetaMask/connect-monorepo/pull/92))

### Fixed

- Fix potential listener leak on `MultichainCore.deeplinkConnect` and duplicate `dappClient.on('message')` on `MWPTransport` ([#81](https://github.com/MetaMask/connect-monorepo/pull/81))
- Reverted: Fix mobile deeplink bug that occurred when `MultichainSDK.connect()` was called and the transport was already connected ([#74](https://github.com/MetaMask/connect-monorepo/pull/74))
- Fix rejections of the initial permission approval for deeplink connections not correctly updating the connection status to disconnected ([#75](https://github.com/MetaMask/connect-monorepo/pull/75))
- Fix `connect()` not working for mobile deeplink and QR connections when a previous connection attempt gets stuck ([#85](https://github.com/MetaMask/connect-monorepo/pull/85))
- Fix `connect()` improperly wrapping errors resulting in them being serialized to `[object Object]` ([#86](https://github.com/MetaMask/connect-monorepo/pull/86))

## [0.3.2]

### Added

- Add connection id to simple deeplinks ([#63](https://github.com/MetaMask/connect-monorepo/pull/63))

## [0.3.1]

### Changed

- Bump `@metamask/multichain-api-client` to prevent `RPC request with id already seen.` error on extension when using firefox ([#60](https://github.com/MetaMask/connect-monorepo/pull/60))

### Fixed

- Fixed incorrect caching of error responses for some requests/events ([#59](https://github.com/MetaMask/connect-monorepo/pull/59))

## [0.3.0]

### Changed

- **BREAKING** Make the `dapp.name` and `dapp.url` properties required in `createMetamaskConnect()` ([#56](https://github.com/MetaMask/connect-monorepo/pull/56))
  - The `dapp.url` property is now always overwritten with the value of the page's url when MetaMask Connect is running in a browser context ([#56](https://github.com/MetaMask/connect-monorepo/pull/56))

### Fixed

- Fixed mobile deeplink bug that occurred when `MultichainSDK.connect()` was called and the transport was already connected ([#57](https://github.com/MetaMask/connect-monorepo/pull/57))

## [0.2.1]

### Added

- Updated analytics tracking of connection and request handling ([#46](https://github.com/MetaMask/connect-monorepo/pull/46))

## [0.2.0]

### Added

- Add `removeListener`, `once` and `listenerCount` function to internal `EventEmitter` ([#31](https://github.com/MetaMask/connect-monorepo/pull/31))
- Add changelog formatting script ([#44](https://github.com/MetaMask/connect-monorepo/pull/44))
- Add support for read only RPC calls ([#33](https://github.com/MetaMask/connect-monorepo/pull/33))

### Changed

- Align package versions ([#48](https://github.com/MetaMask/connect-monorepo/pull/48))
- Rename `preferDesktop` flag to `showInstallModal` ([#42](https://github.com/MetaMask/connect-monorepo/pull/42))
- `MetaMaskConnect.provider` will be defined if there is a previous session that can be restored. Previously `connect()` had to be called explicitly first. ([#21](https://github.com/MetaMask/connect-monorepo/pull/21))
- **BREAKING** Rename `readonlyRpcMap` to `supportedNetworks` ([#37](https://github.com/MetaMask/connect-monorepo/pull/37))
- **BREAKING** Remove api.infuraAPIKey SDK param. Export getInfuraRpcUrls. Add env to playgrounds ([#19](https://github.com/MetaMask/connect-monorepo/pull/19))

### Fixed

- Fix switch to Bowser’s default export to fix Vite build ([#26](https://github.com/MetaMask/connect-monorepo/pull/26))
- Fix reconnect `dappClient` on resumed session ([#43](https://github.com/MetaMask/connect-monorepo/pull/43))
- Fix install modal not rendering when called from Vite application ([#42](https://github.com/MetaMask/connect-monorepo/pull/42))
- Fix requests not being sent to the mobile wallet with proper wrapping metadata ([#28](https://github.com/MetaMask/connect-monorepo/pull/28))
- Fix connections made from within the MetaMask Mobile In-App Browser ([#21](https://github.com/MetaMask/connect-monorepo/pull/21))
- Bump `@metamask/multichain-api-client` to prevent JSON RPC request ID conflicts across disconnect/reconnect cycles ([#38](https://github.com/MetaMask/connect-monorepo/pull/38))
- Fix `wallet_revokeSession` not firing correctly when terminating a session using the default transport (In-App Browser / Extension) ([#41](https://github.com/MetaMask/connect-monorepo/pull/41))

## [0.1.0]

### Added

- Initial release

[Unreleased]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.5.3...HEAD
[0.5.3]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.5.2...@metamask/connect-multichain@0.5.3
[0.5.2]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.5.1...@metamask/connect-multichain@0.5.2
[0.5.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.5.0...@metamask/connect-multichain@0.5.1
[0.5.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.4.0...@metamask/connect-multichain@0.5.0
[0.4.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.3.2...@metamask/connect-multichain@0.4.0
[0.3.2]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.3.1...@metamask/connect-multichain@0.3.2
[0.3.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.3.0...@metamask/connect-multichain@0.3.1
[0.3.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.2.1...@metamask/connect-multichain@0.3.0
[0.2.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.2.0...@metamask/connect-multichain@0.2.1
[0.2.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.1.0...@metamask/connect-multichain@0.2.0
[0.1.0]: https://github.com/MetaMask/connect-monorepo/releases/tag/@metamask/connect-multichain@0.1.0
