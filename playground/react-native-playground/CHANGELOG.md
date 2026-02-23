# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Add Metro bundler configuration with Node.js module shims to support APK bundling
- Enable `unstable_transformImportMeta` in Babel config for `import.meta` support in dependencies
- Set explicit Android package identifier for APK builds
- Add `dotenv` and `readable-stream` as dev dependencies for Metro config

### Fixed

- Make sure Multichain UI card is rendered after Multichain connection established, which broke after merging in [Connect Multichain Singleton PR](https://github.com/MetaMask/connect-monorepo/pull/157) ([#181](https://github.com/MetaMask/connect-monorepo/pull/181))
- Fix JSON parse error on startup by replacing `createSyncStoragePersister` with `createAsyncStoragePersister` for React Native's async `AsyncStorage` API
- Fix Connect (Multichain) button not rendering by correcting `useSDK()` destructuring (`state` -> `status: state`)

## [0.1.1]

### Changed

- Bump workspace dependencies:
  - @metamask/connect-multichain@0.5.3
- **BREAKING**: Update connect/disconnect button labels to include connector names ("Connect" → "Connect (Multichain)", "Disconnect" → "Disconnect (Multichain)" / "Disconnect All") for clarity and consistency with other connector buttons ([#161](https://github.com/MetaMask/connect-monorepo/pull/161))
- Update to use hex chain ID format for `@metamask/connect-evm` API compatibility ([#150](https://github.com/MetaMask/connect-monorepo/pull/150))

## [0.1.0]

### Added

- Initial release

[Unreleased]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/react-native-playground@0.1.1...HEAD
[0.1.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/react-native-playground@0.1.0...@metamask/react-native-playground@0.1.1
[0.1.0]: https://github.com/MetaMask/connect-monorepo/releases/tag/@metamask/react-native-playground@0.1.0
