# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

## [0.1.1]

### Fixed

- Eagerly call `onChainChanged` when `switchChain` is called (rather than waiting for the `chainChanged` event), this ensures that the provider's selected chain ID is updated even if the `chainChanged` event is not received ([#62](https://github.com/MetaMask/connect-monorepo/pull/62))

- Fixed incorrect caching of error responses for some requests/events ([#59](https://github.com/MetaMask/connect-monorepo/pull/59))

## [0.1.0]

### Added

- Initial release ([#58](https://github.com/MetaMask/connect-monorepo/pull/58))

[Unreleased]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.1.2...HEAD
[0.1.2]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.1.1...@metamask/connect-evm@0.1.2
[0.1.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-evm@0.1.0...@metamask/connect-evm@0.1.1
[0.1.0]: https://github.com/MetaMask/connect-monorepo/releases/tag/@metamask/connect-evm@0.1.0
