# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Add disconnect buttons to cards ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))

### Fixed
- Fixes EVM Provider setChainId and setAccounts to also use the connect event ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))
- Multichain Card and button properly reflect initial instantiation connecting status ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))

### Removed
- Remove the explicit ActiveProviderStorage pattern. Now all providers (cards) are "Active" even without user input to connect to a specific ecosystem ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))

## [0.2.0]

### Added

- Add Solana wallet standard integration ([#123](https://github.com/MetaMask/connect-monorepo/pull/123))

### Changed

- **BREAKING**: Update connect/disconnect button labels to include connector names ("Connect" → "Connect (Multichain)", "Disconnect" → "Disconnect (Multichain)" / "Disconnect All") for clarity and consistency with other connector buttons ([#161](https://github.com/MetaMask/connect-monorepo/pull/161))

### Fixed

- Display Wagmi connection errors in UI instead of only logging to console ([#156](https://github.com/MetaMask/connect-monorepo/pull/156))

## [0.1.1]

### Added

- Track active provider via local storage state ([#154](https://github.com/MetaMask/connect-monorepo/pull/154))

### Changed

- Update to use hex chain ID format for `@metamask/connect-evm` API compatibility ([#150](https://github.com/MetaMask/connect-monorepo/pull/150))

## [0.1.0]

### Added

- Initial release

[Unreleased]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.2.0...HEAD
[0.2.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.1.1...@metamask/browser-playground@0.2.0
[0.1.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.1.0...@metamask/browser-playground@0.1.1
[0.1.0]: https://github.com/MetaMask/connect-monorepo/releases/tag/@metamask/browser-playground@0.1.0
