# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Uncategorized

- feat: implement display_uri event support ([#130](https://github.com/MetaMask/connect-monorepo/pull/130))
- refactor: update wagmi connector after PR tweak (https://github.com/wevm/wagmi/pull/4960) ([#129](https://github.com/MetaMask/connect-monorepo/pull/129))
- docs: update the existing playground documentation to reflect the new playground structure and usage instructions ([#127](https://github.com/MetaMask/connect-monorepo/pull/127))
- refactor: implement playground testing alignment specification across both the browser and react native playgrounds ([#126](https://github.com/MetaMask/connect-monorepo/pull/126))
- chore: rename ConnectMultichain class variable state to status + type SDKState to ConnectionStatus ([#125](https://github.com/MetaMask/connect-monorepo/pull/125))
- refactor: create shared ui component package for playgrounds ([#120](https://github.com/MetaMask/connect-monorepo/pull/120))
- feat: implement wagmi connector support in react native playground ([#118](https://github.com/MetaMask/connect-monorepo/pull/118))
- docs: add some docs around auto generated wagmi connector + cursor rule that can catch itself ([#116](https://github.com/MetaMask/connect-monorepo/pull/116))
- feat: implement wagmi connector support in browser playground ([#115](https://github.com/MetaMask/connect-monorepo/pull/115))
- feat: add support to Legacy EVM connector via UI toggle to browser playground ([#99](https://github.com/MetaMask/connect-monorepo/pull/99))
- refactor: re-structure playground by runtime environment (wip) ([#98](https://github.com/MetaMask/connect-monorepo/pull/98))

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
