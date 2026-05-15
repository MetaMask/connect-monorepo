# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0]

### Uncategorized

- chore(analytics): drop MobileSDKConnectV2 types from generated schema ([#274](https://github.com/MetaMask/connect-monorepo/pull/274))
- chore: align sub-package licenses with root ConsenSys 2022 license ([#241](https://github.com/MetaMask/connect-monorepo/pull/241))
- chore: turborepo ([#239](https://github.com/MetaMask/connect-monorepo/pull/239))

### Added

- Add optional `failure_reason` property to `MMConnectProperties` in `schema.ts`, attached by producers on `mmconnect_wallet_action_failed` and `mmconnect_connection_failed`. Mirrors [`metamask-sdk-analytics-api#31`](https://github.com/consensys-vertical-apps/metamask-sdk-analytics-api/pull/31). ([#290](https://github.com/MetaMask/connect-monorepo/pull/290))
- Add optional `error_code` (integer) and `error_message_sample` (string, max 200 chars) properties to `MMConnectProperties` in `schema.ts`. Producers attach them on the two `*_failed` events as raw-code / sanitised-message companions to `failure_reason`. Mirrors [`metamask-sdk-analytics-api#32`](https://github.com/consensys-vertical-apps/metamask-sdk-analytics-api/pull/32). ([#290](https://github.com/MetaMask/connect-monorepo/pull/290))

### Removed

- Removed `MobileSDKConnectV2Payload` / `MobileSDKConnectV2Properties` from `schema.ts` and the `EventV2` oneOf; the `mobile/sdk-connect-v2` namespace has no emitters after [`metamask-mobile#27864`](https://github.com/MetaMask/metamask-mobile/pull/27864) and [`metamask-mobile#28322`](https://github.com/MetaMask/metamask-mobile/pull/28322), and the V2 endpoint is being updated to reject the namespace in [`metamask-sdk-analytics-api#29`](https://github.com/consensys-vertical-apps/metamask-sdk-analytics-api/pull/29). Internal types only — no change to the public API.

## [0.4.0]

### Changed

- use merged integration types in analytics ([#223](https://github.com/MetaMask/connect-monorepo/pull/223))

## [0.3.0]

### Changed

- **BREAKING** `MMConnectProperties.mmconnect_versions` type changed from `string` to `Record<string, string>` ([#206](https://github.com/MetaMask/connect-monorepo/pull/206))

## [0.2.0]

### Added

- Added `v2/events/` endpoint to `schema.ts` ([#46](https://github.com/MetaMask/connect-monorepo/pull/46))

### Changed

- **BREAKING** Updated `analytics.ts` to point towards `v2/events` endpoint and update payload accordingly ([#46](https://github.com/MetaMask/connect-monorepo/pull/46))

## [0.1.1]

### Added

- Add changelog formatting script ([#44](https://github.com/MetaMask/connect-monorepo/pull/44))

### Changed

- Align package versions ([#48](https://github.com/MetaMask/connect-monorepo/pull/48))

## [0.1.0]

### Added

- Initial release

[Unreleased]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/analytics@0.5.0...HEAD
[0.5.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/analytics@0.4.0...@metamask/analytics@0.5.0
[0.4.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/analytics@0.3.0...@metamask/analytics@0.4.0
[0.3.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/analytics@0.2.0...@metamask/analytics@0.3.0
[0.2.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/analytics@0.1.1...@metamask/analytics@0.2.0
[0.1.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/analytics@0.1.0...@metamask/analytics@0.1.1
[0.1.0]: https://github.com/MetaMask/connect-monorepo/releases/tag/@metamask/analytics@0.1.0
