# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added an **Analytics test bench** collapsible panel with one button per `failure_reason` classifier branch, plus a local `yarn analytics:echo` server that stands in for the analytics endpoint. See the playground README for the manual-testing walkthrough. ([#290](https://github.com/MetaMask/connect-monorepo/pull/290))
- Add network checkboxes for HyperEVM Mainnet (`eip155:999`), MegaETH Mainnet (`eip155:4326`), Monad Mainnet (`eip155:143`), Sei Mainnet (`eip155:1329`), and Tempo Mainnet (`eip155:4217`) to the multichain connect form ([#295](https://github.com/MetaMask/connect-monorepo/pull/295))

## [0.7.2]

### Changed

- Bump workspace dependencies:
  - @metamask/connect-evm@1.2.0
  - @metamask/connect-multichain@0.13.0

## [0.7.1]

### Changed

- Bump workspace dependencies:
  - @metamask/connect-evm@1.1.0
  - @metamask/connect-multichain@0.13.0

## [0.7.0]

### Changed

- Update `LegacyEVMSDKProvider` to unwrap `.signature` from the new `connectAndSign` return value, which now returns `{ accounts, chainId, signature }` instead of a bare string ([#266](https://github.com/MetaMask/connect-monorepo/pull/266))
- Update wagmi `metamask-connector` to unwrap `.signature` / `.result` from the new `connectAndSign` / `connectWith` return values ([#266](https://github.com/MetaMask/connect-monorepo/pull/266))
- Use any Solana provider that announces itself as `MetaMask` instead of preferring `MetaMask Connect` ([#275](https://github.com/MetaMask/connect-monorepo/pull/275))
- Bump workspace dependencies:
  - @metamask/connect-evm@1.0.0
  - @metamask/connect-solana@1.0.0

## [0.6.6]

### Added

- Add `Content-Security-Policy` meta tag to simulate host-page CSP constraints during local testing ([#268](https://github.com/MetaMask/connect-monorepo/pull/268))

### Changed

- Bump workspace dependencies:
  - @metamask/connect-evm@0.11.2
  - @metamask/connect-multichain@0.12.1

## [0.6.5]

### Changed

- Bump workspace dependencies:
  - @metamask/connect-evm@0.11.1

## [0.6.4]

### Changed

- Bump workspace dependencies:
  - @metamask/connect-evm@0.11.0

## [0.6.3]

### Changed

- Bump workspace dependencies:
  - @metamask/connect-evm@0.10.0
  - @metamask/connect-multichain@0.12.0

### Fixed

- Fix `@metamask/connect/evm` import path to use `@metamask/connect-evm` directly ([#263](https://github.com/MetaMask/connect-monorepo/pull/263))

## [0.6.2]

### Fixed

- Fix potential stale closure in `handleCheckboxChange` and unconditional `useEffect` on session change ([#257](https://github.com/MetaMask/connect-monorepo/pull/257))

## [0.6.1]

### Added

- Add global `localhost` scopes ([#250](https://github.com/MetaMask/connect-monorepo/pull/250))

### Changed

- Bump workspace dependencies: @metamask/connect-evm@0.9.1, @metamask/connect-multichain@0.11.1

## [0.6.0]

### Changed

- Change LegacyEVM card's `sendTransaction` to have an address field and default it to the connected address ([#247](https://github.com/MetaMask/connect-monorepo/pull/247))
- Add `localhost` to wagmi's configured chains ([#246](https://github.com/MetaMask/connect-monorepo/pull/246))
- Bump wagmi from `^2.19.2` to `^3.5.0` and apply v3 migration changes: use `useConnectors()` instead of `useConnect().connectors`, `useChains()` instead of `useSwitchChain().chains`, and rename `useAccount` to `useConnection` ([#233](https://github.com/MetaMask/connect-monorepo/pull/233))
- Bump `@wagmi/core` from `^2.22.1` to `^3.4.0` ([#233](https://github.com/MetaMask/connect-monorepo/pull/233))
- Bump `@tanstack/react-query` from `>=5.45.1` to `^5.90.21` ([#233](https://github.com/MetaMask/connect-monorepo/pull/233))
- Bump `@tanstack/react-query-persist-client`, `@tanstack/query-sync-storage-persister`, and `@tanstack/react-query-devtools` from `5.0.5` to latest (`^5.90.24` / `^5.91.3`) ([#233](https://github.com/MetaMask/connect-monorepo/pull/233))

## [0.5.1]

### Changed

- Bump workspace dependencies:
  - @metamask/connect-evm@0.9.0
  - @metamask/connect-multichain@0.11.0

## [0.5.0]

### Changed

- Update `getInfuraRpcUrls` calls to use new options object parameter ([#211](https://github.com/MetaMask/connect-monorepo/pull/211))

## [0.4.2]

### Added

- Add `integrationType: wagmi` to wagmi metamask connector([#215](https://github.com/MetaMask/connect-monorepo/pull/215/))

## [0.4.1]

### Added

- Add Connect button that calls legacy EVM `connectAndSign` method ([#205](https://github.com/MetaMask/connect-monorepo/pull/205))

### Changed

- Bump workspace dependencies:
  - @metamask/connect-evm@0.7.0
  - @metamask/connect-multichain@0.9.0

## [0.4.0]

### Added

- Add `Connect (window.ethereum)` button ([#198](https://github.com/MetaMask/connect-monorepo/pull/198/))

### Changed

- Update wagmi MetaMask connector ([#202](https://github.com/MetaMask/connect-monorepo/pull/202))

## [0.3.1]

### Changed

- Bump workspace dependencies:
  - @metamask/connect-multichain@0.7.0

## [0.3.0]

### Added

- Add disconnect buttons to cards ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))
- Add `data-testid` attributes to Solana components ([#174](https://github.com/MetaMask/connect-monorepo/pull/174))
- Add `data-testid` attributes to Legacy EVM and Wagmi disconnect buttons ([#174](https://github.com/MetaMask/connect-monorepo/pull/174))

### Changed

- Patch `@solana/wallet-adapter-react` to work with android native browser ([#174](https://github.com/MetaMask/connect-monorepo/pull/174))
- Remove manual registration of `connect-solana` ([#178](https://github.com/MetaMask/connect-monorepo/pull/178))
- Bump workspace dependencies:
  - @metamask/connect-evm@0.5.0
  - @metamask/connect-multichain@0.6.0
  - @metamask/connect-solana@0.2.0

### Removed

- Remove the explicit ActiveProviderStorage pattern. Now all providers (cards) are "Active" even without user input to connect to a specific ecosystem ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))

### Fixed

- Fixes EVM Provider setChainId and setAccounts to also use the connect event ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))
- Multichain Card and button properly reflect initial instantiation connecting status ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))

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

[Unreleased]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.7.2...HEAD
[0.7.2]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.7.1...@metamask/browser-playground@0.7.2
[0.7.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.7.0...@metamask/browser-playground@0.7.1
[0.7.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.6.6...@metamask/browser-playground@0.7.0
[0.6.6]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.6.5...@metamask/browser-playground@0.6.6
[0.6.5]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.6.4...@metamask/browser-playground@0.6.5
[0.6.4]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.6.3...@metamask/browser-playground@0.6.4
[0.6.3]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.6.2...@metamask/browser-playground@0.6.3
[0.6.2]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.6.1...@metamask/browser-playground@0.6.2
[0.6.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.6.0...@metamask/browser-playground@0.6.1
[0.6.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.5.1...@metamask/browser-playground@0.6.0
[0.5.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.5.0...@metamask/browser-playground@0.5.1
[0.5.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.4.2...@metamask/browser-playground@0.5.0
[0.4.2]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.4.1...@metamask/browser-playground@0.4.2
[0.4.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.4.0...@metamask/browser-playground@0.4.1
[0.4.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.3.1...@metamask/browser-playground@0.4.0
[0.3.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.3.0...@metamask/browser-playground@0.3.1
[0.3.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.2.0...@metamask/browser-playground@0.3.0
[0.2.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.1.1...@metamask/browser-playground@0.2.0
[0.1.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/browser-playground@0.1.0...@metamask/browser-playground@0.1.1
[0.1.0]: https://github.com/MetaMask/connect-monorepo/releases/tag/@metamask/browser-playground@0.1.0
