# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.3]

### Changed

- Bump workspace dependencies:
  - @metamask/connect-evm@0.10.0
  - @metamask/connect-multichain@0.12.0

## [0.3.2]

### Changed

- Bump workspace dependencies: @metamask/connect-evm@0.9.1, @metamask/connect-multichain@0.11.1
- Bump wagmi from `^2.19.2` to `^3.5.0` and apply v3 migration changes: use `useConnectors()` instead of `useConnect().connectors`, `useChains()` instead of `useSwitchChain().chains`, and rename `useAccount` to `useConnection` ([#233](https://github.com/MetaMask/connect-monorepo/pull/233))
- Bump `@wagmi/core` from `^2.22.1` to `^3.4.0` ([#233](https://github.com/MetaMask/connect-monorepo/pull/233))
- Bump `@tanstack/react-query` from `>=5.45.1` to `^5.90.21` ([#233](https://github.com/MetaMask/connect-monorepo/pull/233))
- Bump `@tanstack/react-query-persist-client` and `@tanstack/query-async-storage-persister` from `5.0.5` to `^5.90.24` ([#233](https://github.com/MetaMask/connect-monorepo/pull/233))

## [0.3.1]

### Changed

- Bump workspace dependencies:
  - @metamask/connect-evm@0.9.0
  - @metamask/connect-multichain@0.11.0

## [0.3.0]

### Added

- Add `integrationType: wagmi` to wagmi metamask connector([#215](https://github.com/MetaMask/connect-monorepo/pull/215/))

### Changed

- Update `getInfuraRpcUrls` calls to use new options object parameter ([#211](https://github.com/MetaMask/connect-monorepo/pull/211))

## [0.2.1]

### Changed

- Bump workspace dependencies:
  - @metamask/connect-evm@0.7.0
  - @metamask/connect-multichain@0.9.0

## [0.2.0]

### Changed

- Update wagmi MetaMask connector ([#202](https://github.com/MetaMask/connect-monorepo/pull/202))

### Removed

- Remove explicit dependency on `@metamask/mobile-wallet-protocol-core` ([#201](https://github.com/MetaMask/connect-monorepo/pull/201))
- Remove explicit dependency on `@metamask/mobile-wallet-protocol-wallet-client` ([#201](https://github.com/MetaMask/connect-monorepo/pull/201))

## [0.1.3]

### Changed

- Bump workspace dependencies:
  - @metamask/connect-multichain@0.7.0

### Fixed

- Fix malformed reported dapp URL causing issues in the wallet ([#187](https://github.com/MetaMask/connect-monorepo/pull/187))

## [0.1.2]

### Changed

- Add Metro bundler configuration with Node.js module shims to support APK bundling ([#182](https://github.com/MetaMask/connect-monorepo/pull/182))
- Enable `unstable_transformImportMeta` in Babel config for `import.meta` support in dependencies ([#182](https://github.com/MetaMask/connect-monorepo/pull/182))
- Set explicit Android package identifier for APK builds ([#182](https://github.com/MetaMask/connect-monorepo/pull/182))
- Add `dotenv` and `readable-stream` as dev dependencies for Metro config ([#182](https://github.com/MetaMask/connect-monorepo/pull/182))
- Bump workspace dependencies:
  - @metamask/connect-evm@0.5.0
  - @metamask/connect-multichain@0.6.0

### Fixed

- Make sure Multichain UI card is rendered after Multichain connection established by aligning the `SDKProvider` with the browser playground's event-emitter pattern, broken after merging in [Connect Multichain Singleton PR](https://github.com/MetaMask/connect-monorepo/pull/157) which caused the React Native `SDKProvider`'s `transport.onNotification` callback to be silently dropped, preventing session and status updates from ever reaching the UI ([#181](https://github.com/MetaMask/connect-monorepo/pull/181))
- Fix JSON parse error on startup by replacing `createSyncStoragePersister` with `createAsyncStoragePersister` for React Native's async `AsyncStorage` API ([#182](https://github.com/MetaMask/connect-monorepo/pull/182))
- Fix Connect (Multichain) button not rendering by correcting `useSDK()` destructuring (`state` -> `status: state`) ([#182](https://github.com/MetaMask/connect-monorepo/pull/182))

## [0.1.1]

### Changed

- Bump workspace dependencies:
  - @metamask/connect-multichain@0.5.3
- **BREAKING**: Update connect/disconnect button labels to include connector names ("Connect" → "Connect (Multichain)", "Disconnect" → "Disconnect (Multichain)" / "Disconnect All") for clarity and consistency with other connector buttons ([#161](https://github.com/MetaMask/connect-monorepo/pull/161))
- Update to use hex chain ID format for `@metamask/connect-evm` API compatibility ([#150](https://github.com/MetaMask/connect-monorepo/pull/150))

## [0.1.0]

### Added

- Initial release

[Unreleased]: https://github.com/MetaMask/metamask-connect/compare/@metamask/react-native-playground@0.3.3...HEAD
[0.3.3]: https://github.com/MetaMask/metamask-connect/compare/@metamask/react-native-playground@0.3.2...@metamask/react-native-playground@0.3.3
[0.3.2]: https://github.com/MetaMask/metamask-connect/compare/@metamask/react-native-playground@0.3.1...@metamask/react-native-playground@0.3.2
[0.3.1]: https://github.com/MetaMask/metamask-connect/compare/@metamask/react-native-playground@0.3.0...@metamask/react-native-playground@0.3.1
[0.3.0]: https://github.com/MetaMask/metamask-connect/compare/@metamask/react-native-playground@0.2.1...@metamask/react-native-playground@0.3.0
[0.2.1]: https://github.com/MetaMask/metamask-connect/compare/@metamask/react-native-playground@0.2.0...@metamask/react-native-playground@0.2.1
[0.2.0]: https://github.com/MetaMask/metamask-connect/compare/@metamask/react-native-playground@0.1.3...@metamask/react-native-playground@0.2.0
[0.1.3]: https://github.com/MetaMask/metamask-connect/compare/@metamask/react-native-playground@0.1.2...@metamask/react-native-playground@0.1.3
[0.1.2]: https://github.com/MetaMask/metamask-connect/compare/@metamask/react-native-playground@0.1.1...@metamask/react-native-playground@0.1.2
[0.1.1]: https://github.com/MetaMask/metamask-connect/compare/@metamask/react-native-playground@0.1.0...@metamask/react-native-playground@0.1.1
[0.1.0]: https://github.com/MetaMask/metamask-connect/releases/tag/@metamask/react-native-playground@0.1.0
