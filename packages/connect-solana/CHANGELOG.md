# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0]

### Uncategorized

- Correct README documentation across `connect-solana`, `connect-evm`, and `connect-multichain` to match actual API behaviour. ([#194](https://github.com/MetaMask/connect-monorepo/pull/194))
- add missing changelogs from Release/17.0.0 ([#186](https://github.com/MetaMask/connect-monorepo/pull/186))

### Fixed

- Explicitly disconnect only Solana scopes when calling `SolanaClient.disconnect()`. Previously calling this function would result in the wallet connection being terminated entirely even if other ecosystems (evm, bitcoin, etc) were still connected ([#193](https://github.com/MetaMask/connect-monorepo/pull/193))

## [0.2.0]

### Added

- Add node.js builds [#169](https://github.com/MetaMask/connect-monorepo/pull/169)

### Changed

- **BREAKING:** Automatically register as MetaMask to Solana Wallet Standard registry upon instantiation - with option to skip auto-registration [#178](https://github.com/MetaMask/connect-monorepo/pull/178)
- **BREAKING** `getWallet()` no longer accepts a `walletName` argument and now always returns the `"MetaMask Connect"` wallet instance. ([#178](https://github.com/MetaMask/connect-monorepo/pull/178))
- **BREAKING** `registerWallet()` no longer accepts a `walletName` argument. Wallet naming is now fixed to `"MetaMask Connect"`. ([#178](https://github.com/MetaMask/connect-monorepo/pull/178))
- `registerWallet()` is now effectively a no-op when auto-registration is enabled (default). Use `skipAutoRegister: true` for manual registration control. ([#178](https://github.com/MetaMask/connect-monorepo/pull/178))

## [0.1.0]

### Added

- Initial release

[Unreleased]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-solana@0.3.0...HEAD
[0.3.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-solana@0.2.0...@metamask/connect-solana@0.3.0
[0.2.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-solana@0.1.0...@metamask/connect-solana@0.2.0
[0.1.0]: https://github.com/MetaMask/connect-monorepo/releases/tag/@metamask/connect-solana@0.1.0
