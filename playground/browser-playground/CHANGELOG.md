# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add Solana wallet standard integration  ([#123](https://github.com/MetaMask/connect-monorepo/pull/123))

### Changed

- Update to use renamed API functions: `createMetamaskConnect` → `createMultichainClient` and `createMetamaskConnectEVM` → `createEVMClient` ([#114](https://github.com/MetaMask/connect-monorepo/pull/114))
- Remove `enable` flag from `analytics` config object for `createMetamaskConnect` constructor ([#92](https://github.com/MetaMask/connect-monorepo/pull/92))
- Bump `@types/jest` from ^28.1.6 to ^29.5.14 ([#11](https://github.com/MetaMask/connect-monorepo/pull/11))
- Bump `@types/node` from ^18.18 to ^22.9.0 ([#11](https://github.com/MetaMask/connect-monorepo/pull/11))
- Bump `@types/react` from ^19.1.8 to ~19.1.10 ([#11](https://github.com/MetaMask/connect-monorepo/pull/11))
- Bump `@yarnpkg/types` from ^4.0.0-rc.52 to ^4.0.0 ([#11](https://github.com/MetaMask/connect-monorepo/pull/11))
- Bump `depcheck` from ^1.4.3 to ^1.4.7 ([#11](https://github.com/MetaMask/connect-monorepo/pull/11))
- Bump `jest` from ^28.1.3 to ^29.6.4 ([#11](https://github.com/MetaMask/connect-monorepo/pull/11))
- Bump `prettier` from ^2.7.1 to ^3.3.3 ([#11](https://github.com/MetaMask/connect-monorepo/pull/11))
- Bump `prettier-plugin-packagejson` from ^2.3.0 to ^2.4.5 ([#11](https://github.com/MetaMask/connect-monorepo/pull/11))
- Bump `ts-node` from ^10.7.0 to ^10.9.1 ([#11](https://github.com/MetaMask/connect-monorepo/pull/11))
- Bump `typescript` from ~5.2.2 to ~5.9.2 ([#11](https://github.com/MetaMask/connect-monorepo/pull/11))

### Fixed

- Make sure TailwindCSS configs look at package's local config instead of a parent monorepo config ([#25](https://github.com/MetaMask/connect-monorepo/pull/25))

[Unreleased]: https://github.com/MetaMask/connect-monorepo/
