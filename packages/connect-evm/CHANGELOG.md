# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added `connectWith()` method which makes a request for the method to be paired together with a connection request ([#53](https://github.com/MetaMask/connect-monorepo/pull/53))
  - This method expects param options `method`, `params`, `chainId`, and `account`
  - `params` can be a function or a plain value. When it is a function, it will be called with the selected account as the first param and must return a value that will be used as the actual params for the request.
- Added `eventHandlers.connectAndSign` handler which is called on successful `connectAndSign` request with an object including the `accounts`, `chainId`, and `signResponse` ([#53](https://github.com/MetaMask/connect-monorepo/pull/53))
- Added `eventHandlers.connectWith` handler which is called on successful `connectWith` request with an object including the `accounts`, `chainId`, and `connectWithResponse` ([#53](https://github.com/MetaMask/connect-monorepo/pull/53))
- Added analytics tracking of request handling ([#46](https://github.com/MetaMask/connect-monorepo/pull/46))
- Initial release ([#21](https://github.com/MetaMask/connect-monorepo/pull/21))

### Changed

- `connect()` now always returns `chainId`, previously it could undefined ([#53](https://github.com/MetaMask/connect-monorepo/pull/53))

### Fixed

- `ethereum_switchChain` fallback when chain is not configured ([#31](https://github.com/MetaMask/connect-monorepo/pull/31))
- Typedoc generation ([#31](https://github.com/MetaMask/connect-monorepo/pull/31))
- Permissioning accounts through `wallet_requestPermissions` ([#31](https://github.com/MetaMask/connect-monorepo/pull/31))
- Enable conditional logging through options in `createMetamaskConnectEVM` ([#31](https://github.com/MetaMask/connect-monorepo/pull/31))
- Fixed mobile deeplink bug that occurred when `MetamaskConnectEVM.connect()` was called and the transport was already connected ([#57](https://github.com/MetaMask/connect-monorepo/pull/57))

[Unreleased]: https://github.com/MetaMask/metamask-connect-monorepo/
