# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

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

[Unreleased]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.4.0...HEAD
[0.4.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.3.2...@metamask/connect-multichain@0.4.0
[0.3.2]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.3.1...@metamask/connect-multichain@0.3.2
[0.3.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.3.0...@metamask/connect-multichain@0.3.1
[0.3.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.2.1...@metamask/connect-multichain@0.3.0
[0.2.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.2.0...@metamask/connect-multichain@0.2.1
[0.2.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.1.0...@metamask/connect-multichain@0.2.0
[0.1.0]: https://github.com/MetaMask/connect-monorepo/releases/tag/@metamask/connect-multichain@0.1.0
