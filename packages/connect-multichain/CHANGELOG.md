# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Fix requests not being sent to the mobile wallet with proper wrapping metadata ([#28](https://github.com/MetaMask/connect-monorepo/pull/28))
- `MetaMaskConnect.provider` will be defined if there is a previous session that can be restored. Previously `connect()` had to be called explicitly first. ([#21](https://github.com/MetaMask/connect-monorepo/pull/21))

### Fixed

- Fix connections made from within the MetaMask Mobile In-App Browser ([#21](https://github.com/MetaMask/connect-monorepo/pull/21))
- Bump `@metamask/multichain-api-client` to prevent JSON RPC request ID conflicts across disconnect/reconnect cycles ([#38](https://github.com/MetaMask/connect-monorepo/pull/38))

## [0.1.0]

### Added

- Initial release

[Unreleased]: https://github.com/MetaMask/metamask-connect-monorepo/compare/@metamask/connect-multichain@0.1.0...HEAD
[0.1.0]: https://github.com/MetaMask/metamask-connect-monorepo/releases/tag/@metamask/connect-multichain@0.1.0
