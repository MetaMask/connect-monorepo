# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fix duplicate `onNotification` listener ([#81](https://github.com/MetaMask/connect-monorepo/pull/81))

## [0.1.1]

### Fixed

- Eagerly call `onChainChanged` when `switchChain` is called (rather than waiting for the `chainChanged` event), this ensures that the provider's selected chain ID is updated even if the `chainChanged` event is not received ([#62](https://github.com/MetaMask/connect-monorepo/pull/62))

- Fixed incorrect caching of error responses for some requests/events ([#59](https://github.com/MetaMask/connect-monorepo/pull/59))

## [0.1.0]

### Added

- Initial release ([#58](https://github.com/MetaMask/connect-monorepo/pull/58))

[Unreleased]: https://github.com/MetaMask/metamask-connect-monorepo/compare/@metamask/connect-evm@0.1.1...HEAD
[0.1.1]: https://github.com/MetaMask/metamask-connect-monorepo/compare/@metamask/connect-evm@0.1.0...@metamask/connect-evm@0.1.1
[0.1.0]: https://github.com/MetaMask/metamask-connect-monorepo/releases/tag/@metamask/connect-evm@0.1.0
