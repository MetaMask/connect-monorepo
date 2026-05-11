# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Attach a `failure_reason` property to `mmconnect_wallet_action_failed` and `mmconnect_connection_failed` analytics events. The new `classifyFailureReason` helper tags transport timeouts, transport disconnects, EIP-1193 wallet errors (`4100 wallet_unauthorized`, `4200 wallet_method_unsupported`, `4902 unrecognised_chain`), and JSON-RPC wallet errors (`-32601 wallet_method_unsupported`, `-32602 wallet_invalid_params`, `-32603 wallet_internal_error`, plus the `-32000…-32099` server-error range), with an `unknown` fallback for anything else. The schema-side change lives in [`metamask-sdk-analytics-api#31`](https://github.com/consensys-vertical-apps/metamask-sdk-analytics-api/pull/31).

### Fixed

- `isRejectionError` now unwraps `RPCInvokeMethodErr` so a wallet-side `code: 4001` survives the SDK's transport-boundary wrapping and is correctly classified as a user rejection. Previously the outer `code: 53` masked the inner code, and rejections were only caught via the fragile message-substring fallback.
- Tightened the `isRejectionError` message heuristics so generic "user" mentions (e.g. "user operation reverted") are no longer treated as user rejections — only explicit phrases like "user rejected" / "user denied" / "user cancelled".
- `isRejectionError` no longer treats `code: 4100 Unauthorized` as a user rejection. `4100` is returned by the CAIP-25 permission layer when a method isn't in the granted scope (it fires before the method handler runs) — a permission/support signal, not a user decision. These cases now correctly surface as `mmconnect_wallet_action_failed` with `failure_reason: wallet_unauthorized`.
- `classifyFailureReason` now inspects the wallet JSON-RPC code before the `transport_disconnect` substring heuristic, so a wallet error like `{ code: 4900, message: 'Disconnected' }` no longer leaks into `transport_disconnect`. The `transport_disconnect` substrings have also been narrowed (`'transport disconnect'`, `'connection lost'`, `'socket closed'`, `'not connected'`) so they don't snag unrelated wallet messages that happen to contain "disconnect".
- Removed the `session_expired` `failure_reason` bucket. No producer in the monorepo throws an error whose message matches the regex it was checking for (`/session.*expired/i`); the branch was defensive-only and added cognitive load without surfacing any real signal. If/when a concrete session-expiration error path appears (e.g. a transport-layer 30-day session timeout), we'll wire it up against a real producer.

## [0.13.0]

### Uncategorized

- feat: cleanup EvmClient initPromise ([#281](https://github.com/MetaMask/connect-monorepo/pull/281))

### Changed

- Lazy-load MWP transport dependencies: `@metamask/mobile-wallet-protocol-core`, `@metamask/mobile-wallet-protocol-dapp-client`, and `eciesjs` are now dynamically imported only when MWP transport is actually used, allowing bundlers to code-split the entire MWP + crypto dependency tree for consumers who only use the browser extension flow ([#244](https://github.com/MetaMask/connect-monorepo/pull/244))
- Tighten `MultichainApiClientWrapperTransport` connected transport check on `wallet_getSession` and `wallet_invokeMethod`. Remove defined transport check on `wallet_revokeSession`. ([#280](https://github.com/MetaMask/connect-monorepo/pull/280))

## [0.12.1]

### Fixed

- The QR code modal no longer attempts to create a blob for the MetaMask icon and instead embeds it directly as a `data:` uri. This was breaking the QR code rendering on websites with CSP `connect-src` policy missing `blob:`. ([#273](https://github.com/MetaMask/connect-monorepo/pull/273))

## [0.12.0]

### Added

- Include `analytics.remote_session_id` in V2 connection metadata so the wallet can correlate dapp-side and wallet-side analytics events ([#256](https://github.com/MetaMask/connect-monorepo/pull/256))

## [0.11.1]

### Changed

- chore: align sub-package licenses with root ConsenSys 2022 license ([#241](https://github.com/MetaMask/connect-monorepo/pull/241))
- chore: turborepo ([#239](https://github.com/MetaMask/connect-monorepo/pull/239))

### Fixed

- `MWPTransport.connect()` now accepts and forwards a `forceRequest` option. When `true`, `onResumeSuccess` skips the `isSameScopesAndAccounts` check and unconditionally sends `wallet_createSession`, allowing consumers to re-prompt account selection on an existing MWP session. Previously `forceRequest` was silently ignored, causing `wallet_requestPermissions` to no-op on mobile. ([#243](https://github.com/MetaMask/connect-monorepo/pull/243))
- Fix platform detection for Hermes-based React Native apps: `isReactNative()` now checks `global.navigator.product` before `window.navigator.product`, so modern RN environments where `window` is undefined correctly resolve to `PlatformType.ReactNative` instead of `PlatformType.NonBrowser`. This restores analytics for all React Native consumers — analytics were silently disabled because `#setupAnalytics()` only calls `analytics.enable()` for browser and `ReactNative` platforms ([#238](https://github.com/MetaMask/connect-monorepo/pull/238))

## [0.11.0]

### Changed

- `DefaultTransport` now forwards all wallet notifications instead of filtering to only `metamask_chainChanged` and `metamask_accountsChanged`, matching `MWPTransport` behavior ([#230](https://github.com/MetaMask/connect-monorepo/pull/230))
- `stateChanged` is now emitted via the `EventEmitter` so `client.on('stateChanged', cb)` fires correctly ([#230](https://github.com/MetaMask/connect-monorepo/pull/230))
- `SDKEvents` type now includes explicit entries for `metamask_accountsChanged`, `metamask_chainChanged`, and `stateChanged` ([#230](https://github.com/MetaMask/connect-monorepo/pull/230))
- Mark `@react-native-async-storage/async-storage` peer dependency as optional — web/Node consumers no longer pull in the React Native toolchain ([#234](https://github.com/MetaMask/connect-monorepo/pull/234))
- `getInfuraRpcUrls` now includes Solana mainnet and devnet CAIP chain IDs in the generated RPC URL map ([#235](https://github.com/MetaMask/connect-monorepo/pull/235))
- Updated `infuraRpcUrls` to align with Infura's currently supported networks by removing deprecated testnets (Goerli variants, Mumbai, Palm testnet, Aurora) and adding new mainnet/testnet coverage across Base, Blast, zkSync, BSC/opBNB, Scroll, Mantle, Sei, Swellchain, Unichain, Hemi, MegaETH, Monad, and Celo Sepolia ([#237](https://github.com/MetaMask/connect-monorepo/pull/237))

### Fixed

- `RPCInvokeMethodErr` now carries the original numeric RPC code from the wallet (`rpcCode`) and the original wallet-facing message (`rpcMessage`) as separate fields, so higher layers can re-surface them without losing them inside internal error formatting. ([#232](https://github.com/MetaMask/connect-monorepo/pull/232))
- `RequestRouter` now propagates the numeric RPC error code from wallet response errors and transport exceptions into `RPCInvokeMethodErr`, ensuring the code is not dropped during error wrapping. ([#232](https://github.com/MetaMask/connect-monorepo/pull/232))
- `DefaultTransport` now attaches the numeric RPC code to errors produced from `window.postMessage` responses, so it survives the transport boundary. ([#232](https://github.com/MetaMask/connect-monorepo/pull/232))

## [0.10.0]

### Changed

- **BREAKING** `getInfuraRpcUrls` now accepts a single options object `{ infuraApiKey, caipChainIds? }` instead of a positional `infuraApiKey` string. The optional `caipChainIds` parameter filters the output to only the specified CAIP-2 chain IDs ([#211](https://github.com/MetaMask/connect-monorepo/pull/211))
- use merged integration types in analytics ([#223](https://github.com/MetaMask/connect-monorepo/pull/223))

### Fixed

- fix: Fix react-native-playground consumption of **PACKAGE_VERSION** build-time constant in connect packages ([#221](https://github.com/MetaMask/connect-monorepo/pull/221))

## [0.9.0]

### Added

- Add `versions` constructor option to `createMultichainClient` so chain-specific packages (`connect-evm`, `connect-solana`) can report their version in analytics events. Versions are merged into the singleton on each call, following the same pattern as `api.supportedNetworks`. ([#206](https://github.com/MetaMask/connect-monorepo/pull/206))

### Changed

- **BREAKING** `mmconnect_versions` analytics property is now a `Record<string, string>` keyed by package name instead of a plain version string ([#206](https://github.com/MetaMask/connect-monorepo/pull/206))

### Removed

- Stop passing `sdkVersion` to install and OTP modals ([#212](https://github.com/MetaMask/connect-monorepo/pull/212))

### Fixed

- Fix a bug where wallet_sessionChanged events were failing to propagate to the `ConnectMultichain` instance when the `DefaultTransport` is using the `WindowPostMessageTransport`. This was affecting Firefox, both iOS and Android in-app browsers ([#204](https://github.com/MetaMask/connect-monorepo/pull/204))

## [0.8.0]

### Added

- Enable `ConnectMultichain` to automatically handle `wallet_sessionChanged` events when MetaMask extension is detected (Desktop Chrome/Firefox, or Mobile In-App Browser) and `preferExtension: true` without needing the user to explicitly connect via `ConnectMultichain.connect()` ([#198](https://github.com/MetaMask/connect-monorepo/pull/198/))

### Changed

- Bump `@metamask/mobile-wallet-protocol-core` to `^0.4.0` ([#201](https://github.com/MetaMask/connect-monorepo/pull/201))
- Bump `@metamask/mobile-wallet-protocol-dapp-client` to `^0.3.0` ([#201](https://github.com/MetaMask/connect-monorepo/pull/201))

## [0.7.0]

### Changed

- Correct README documentation across `connect-solana`, `connect-evm`, and `connect-multichain` to match actual API behaviour. ([#194](https://github.com/MetaMask/connect-monorepo/pull/194))
- Redact logs ([#191](https://github.com/MetaMask/connect-monorepo/pull/191]))
- Pin eciesjs to exact version 0.4.17 ([#188](https://github.com/MetaMask/connect-monorepo/pull/188))

### Fixed

- Fix uncaught exception in `parseWalletError` when the wallet returns error codes outside the EIP-1193 provider range (1000–4999), such as standard JSON-RPC codes like `-32603` (Internal error). This prevented Solana request rejections from being handled gracefully. ([#189](https://github.com/MetaMask/connect-monorepo/pull/189))

## [0.6.0]

### Added

- When `ConnectMultichain.connect()` is called while a connection is already pending, the user is re-prompted with the pending connection deeplink. ([#176](https://github.com/MetaMask/connect-monorepo/pull/176))

### Changed

- Normalize non-http(s) dapp URLs to valid https URLs on React Native to prevent RPC middleware crashes ([#190](https://github.com/MetaMask/connect-monorepo/pull/190))
- **BREAKING** `createMultichainClient()` now returns a singleton. Any incoming constructor params on subsequent calls to `createMultichainClient()` will be applied to the existing singleton instance except for the `dapp`, `storage`, and `ui.factory` param options. ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))
- **BREAKING** `ConnectMultichain.openDeeplinkIfNeeded()` is renamed to `openSimpleDeeplinkIfNeeded()` ([#176](https://github.com/MetaMask/connect-monorepo/pull/176))
- `ConnectMultichain.connect()` now throws an `'Existing connection is pending. Please check your MetaMask Mobile app to continue.'` error if there is already an pending connection attempt. Previously it would abort that ongoing connection in favor of a new one. ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))
- `ConnectMultichain.connect()` adds newly requested scopes and accounts onto any existing permissions rather than fully replacing them. ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))
- `ConnectMultichain.disconnect()` accepts an optional array of scopes. When provided, only those scopes will be revoked from the existing permissions. If no scopes remain after a partial revoke, then the underly connection is fully discarded. If no scopes are specified ()`[]`), then all scopes will be removed. By default all scopes will be removed. ([#157](https://github.com/MetaMask/connect-monorepo/pull/157))

### Fixed

- `ConnectMultichain` now waits 10 seconds (rather than 2 minutes) when attempting to resume a pending connection on initial instantiation via `createMultichainClient()` ([#175](https://github.com/MetaMask/connect-monorepo/pull/175))
- Fix `beforeunload` event listener not being properly removed on disconnect due to `.bind()` creating different function references, causing a listener leak on each connect/disconnect cycle ([#170](https://github.com/MetaMask/connect-monorepo/pull/170))
- Rename `StoreAdapterWeb.DB_NAME` from `mmsdk` to `mmconnect` to prevent IndexedDB collisions when the legacy MetaMask SDK and MM Connect run in the same browser context ([#177](https://github.com/MetaMask/connect-monorepo/pull/177))
- Clean up stale MWP session from KVStore on connection rejection so subsequent QR code connection attempts are not blocked ([#180](https://github.com/MetaMask/connect-monorepo/pull/180))
- Fix bug with JSON-RPC requests where previously used `id` value could be re-used causing the wallet to ignore the request when a dapp was refreshed/reloaded. ([#183](https://github.com/MetaMask/connect-monorepo/pull/183))

## [0.5.3]

### Added

- `createMultichainClient()` now accepts an optional `debug` param option which enables console debug logs when set to `true`. Defaults to `false`. ([#149](https://github.com/MetaMask/connect-monorepo/pull/149))

### Fixed

- Fix QR rejection handling: properly propagate user rejection errors from MetaMask Mobile to the dApp ([#156](https://github.com/MetaMask/connect-monorepo/pull/156))
- Close QR modal automatically when user rejects connection ([#156](https://github.com/MetaMask/connect-monorepo/pull/156))
- Use `@metamask/rpc-errors` for EIP-1193 compliant error handling ([#156](https://github.com/MetaMask/connect-monorepo/pull/156))
- Fix `sessionProperties` not being passed to `wallet_createSession` when recreating a session after scope/account changes ([#123](https://github.com/MetaMask/connect-monorepo/pull/123))

## [0.5.2]

### Changed

- `ConnectMultichain.connect()` will send `sessionProperties` as undefined when called with an empty object `{}` in order to ensure that the initial `wallet_createSession` request does not fail immediately ([#138](https://github.com/MetaMask/connect-monorepo/pull/138))

## [0.5.1]

### Fixed

- fix: Resolve Buffer polyfill requirement for browser/React Native consumers ([#121](https://github.com/MetaMask/connect-monorepo/pull/121))

## [0.5.0]

### Added

- Add `display_uri` event emission for QR code links to support custom UI implementations ([#130](https://github.com/MetaMask/connect-monorepo/pull/130))
  - Emitted when QR code link is generated during connection
  - Emitted when QR code is regenerated on expiration
  - Emitted for deeplink connections on mobile web
- Add `onDisplayUri` callback to `InstallWidgetProps` for notifying when QR codes are generated/regenerated ([#130](https://github.com/MetaMask/connect-monorepo/pull/130))
- Add headless mode support that emits `display_uri` without rendering modal UI ([#130](https://github.com/MetaMask/connect-monorepo/pull/130))
- Add `sessionProperties` parameter to `connect()` method for passing custom session configuration to wallets([#80](https://github.com/MetaMask/connect-monorepo/pull/80))
- Introduce `MultichainApiClientWrapperTransport` to provide the provider interface before connection is established([#80](https://github.com/MetaMask/connect-monorepo/pull/80))

### Changed

- **BREAKING** Rename `state` property to `status` on `MultichainCore` for improved clarity ([#125](https://github.com/MetaMask/connect-monorepo/pull/125))
- **BREAKING** Rename `createMetamaskConnect` to `createMultichainClient` for a cleaner naming convention ([#114](https://github.com/MetaMask/connect-monorepo/pull/114))
- Provider is now always available via `sdk.provider` regardless of connection state (wrapper handles disconnected state internally)([#80](https://github.com/MetaMask/connect-monorepo/pull/80))

### Fixed

- Fix `wallet_sessionChanged` events subsequent to the initial connection not being persisted ([#100](https://github.com/MetaMask/connect-monorepo/pull/100))
- Fix hanging when attempting to resume a previous connection initialization in which the wallet does not send any response at all ([#103](https://github.com/MetaMask/connect-monorepo/pull/103))

## [0.4.0]

### Changed

- **BREAKING** Remove opt-out of analytics from `connect-multichain`. `MultichainOptions` removes the `enable` flag from `analytics` config object ([#92](https://github.com/MetaMask/connect-monorepo/pull/92))

### Fixed

- Fix potential listener leak on `MultichainCore.deeplinkConnect` and duplicate `dappClient.on('message')` on `MWPTransport` ([#81](https://github.com/MetaMask/connect-monorepo/pull/81))
- Reverted: Fix mobile deeplink bug that occurred when `MultichainSDK.connect()` was called and the transport was already connected ([#74](https://github.com/MetaMask/connect-monorepo/pull/74))
- Fix rejections of the initial permission approval for deeplink connections not correctly updating the connection status to disconnected ([#75](https://github.com/MetaMask/connect-monorepo/pull/75))
- Fix `connect()` not working for mobile deeplink and QR connections when a previous connection attempt gets stuck ([#85](https://github.com/MetaMask/connect-monorepo/pull/85))
- Fix `connect()` improperly wrapping errors resulting in them being serialized to `[object Object]` ([#86](https://github.com/MetaMask/connect-monorepo/pull/86))

## [0.3.2]

### Added

- Add connection id to simple deeplinks ([#63](https://github.com/MetaMask/connect-monorepo/pull/63))

## [0.3.1]

### Changed

- Bump `@metamask/multichain-api-client` to prevent `RPC request with id already seen.` error on extension when using firefox ([#60](https://github.com/MetaMask/connect-monorepo/pull/60))

### Fixed

- Fixed incorrect caching of error responses for some requests/events ([#59](https://github.com/MetaMask/connect-monorepo/pull/59))

## [0.3.0]

### Changed

- **BREAKING** Make the `dapp.name` and `dapp.url` properties required in `createMetamaskConnect()` ([#56](https://github.com/MetaMask/connect-monorepo/pull/56))
  - The `dapp.url` property is now always overwritten with the value of the page's url when MetaMask Connect is running in a browser context ([#56](https://github.com/MetaMask/connect-monorepo/pull/56))

### Fixed

- Fixed mobile deeplink bug that occurred when `MultichainSDK.connect()` was called and the transport was already connected ([#57](https://github.com/MetaMask/connect-monorepo/pull/57))

## [0.2.1]

### Added

- Updated analytics tracking of connection and request handling ([#46](https://github.com/MetaMask/connect-monorepo/pull/46))

## [0.2.0]

### Added

- Add `removeListener`, `once` and `listenerCount` function to internal `EventEmitter` ([#31](https://github.com/MetaMask/connect-monorepo/pull/31))
- Add changelog formatting script ([#44](https://github.com/MetaMask/connect-monorepo/pull/44))
- Add support for read only RPC calls ([#33](https://github.com/MetaMask/connect-monorepo/pull/33))

### Changed

- Align package versions ([#48](https://github.com/MetaMask/connect-monorepo/pull/48))
- Rename `preferDesktop` flag to `showInstallModal` ([#42](https://github.com/MetaMask/connect-monorepo/pull/42))
- `MetaMaskConnect.provider` will be defined if there is a previous session that can be restored. Previously `connect()` had to be called explicitly first. ([#21](https://github.com/MetaMask/connect-monorepo/pull/21))
- **BREAKING** Rename `readonlyRpcMap` to `supportedNetworks` ([#37](https://github.com/MetaMask/connect-monorepo/pull/37))
- **BREAKING** Remove api.infuraAPIKey SDK param. Export getInfuraRpcUrls. Add env to playgrounds ([#19](https://github.com/MetaMask/connect-monorepo/pull/19))

### Fixed

- Fix switch to Bowser’s default export to fix Vite build ([#26](https://github.com/MetaMask/connect-monorepo/pull/26))
- Fix reconnect `dappClient` on resumed session ([#43](https://github.com/MetaMask/connect-monorepo/pull/43))
- Fix install modal not rendering when called from Vite application ([#42](https://github.com/MetaMask/connect-monorepo/pull/42))
- Fix requests not being sent to the mobile wallet with proper wrapping metadata ([#28](https://github.com/MetaMask/connect-monorepo/pull/28))
- Fix connections made from within the MetaMask Mobile In-App Browser ([#21](https://github.com/MetaMask/connect-monorepo/pull/21))
- Bump `@metamask/multichain-api-client` to prevent JSON RPC request ID conflicts across disconnect/reconnect cycles ([#38](https://github.com/MetaMask/connect-monorepo/pull/38))
- Fix `wallet_revokeSession` not firing correctly when terminating a session using the default transport (In-App Browser / Extension) ([#41](https://github.com/MetaMask/connect-monorepo/pull/41))

## [0.1.0]

### Added

- Initial release

[Unreleased]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.13.0...HEAD
[0.13.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.12.1...@metamask/connect-multichain@0.13.0
[0.12.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.12.0...@metamask/connect-multichain@0.12.1
[0.12.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.11.1...@metamask/connect-multichain@0.12.0
[0.11.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.11.0...@metamask/connect-multichain@0.11.1
[0.11.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.10.0...@metamask/connect-multichain@0.11.0
[0.10.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.9.0...@metamask/connect-multichain@0.10.0
[0.9.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.8.0...@metamask/connect-multichain@0.9.0
[0.8.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.7.0...@metamask/connect-multichain@0.8.0
[0.7.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.6.0...@metamask/connect-multichain@0.7.0
[0.6.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.5.3...@metamask/connect-multichain@0.6.0
[0.5.3]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.5.2...@metamask/connect-multichain@0.5.3
[0.5.2]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.5.1...@metamask/connect-multichain@0.5.2
[0.5.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.5.0...@metamask/connect-multichain@0.5.1
[0.5.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.4.0...@metamask/connect-multichain@0.5.0
[0.4.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.3.2...@metamask/connect-multichain@0.4.0
[0.3.2]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.3.1...@metamask/connect-multichain@0.3.2
[0.3.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.3.0...@metamask/connect-multichain@0.3.1
[0.3.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.2.1...@metamask/connect-multichain@0.3.0
[0.2.1]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.2.0...@metamask/connect-multichain@0.2.1
[0.2.0]: https://github.com/MetaMask/connect-monorepo/compare/@metamask/connect-multichain@0.1.0...@metamask/connect-multichain@0.2.0
[0.1.0]: https://github.com/MetaMask/connect-monorepo/releases/tag/@metamask/connect-multichain@0.1.0
