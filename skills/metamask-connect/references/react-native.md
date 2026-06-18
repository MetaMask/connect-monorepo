# MetaMask Connect — React Native Polyfills & Config

Required polyfills and configuration for the MetaMask Connect SDK in React Native: per-package polyfill matrix, import order, `Buffer`/`window`/`Event` shims, Metro `extraNodeModules`, `preferredOpenLink`, and persistence. This is the canonical reference for the RN setup workflows. For always-on core guardrails see [conventions.md](conventions.md).

## Contents

- [Per-Package Polyfill Requirements](#per-package-polyfill-requirements)
- [Import Order (Critical)](#import-order-critical)
- [react-native-get-random-values](#react-native-get-random-values)
- [Buffer Polyfill](#buffer-polyfill)
- [window Object Polyfill](#window-object-polyfill)
- [Event and CustomEvent Polyfills](#event-and-customevent-polyfills)
- [Metro extraNodeModules](#metro-extranodemodules)
- [preferredOpenLink (Required)](#preferredopenlink-required)
- [Async Storage for Persistence](#async-storage-for-persistence)

## Per-Package Polyfill Requirements

Different integrations need different polyfills. Do not blindly copy the full set:

| Polyfill                         | connect-evm / connect-solana (standalone)               | + wagmi                              |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------ |
| `react-native-get-random-values` | RN < 0.72 only (see below)                              | RN < 0.72 only                       |
| `Buffer`                         | Safety net only (self-polyfilled by connect-multichain) | Safety net only                      |
| `window` object                  | **Required** for correct deeplink/platform detection    | **Required**                         |
| `Event`                          | Not required                                            | **Required** (wagmi uses DOM events) |
| `CustomEvent`                    | Not required                                            | **Required** (wagmi uses DOM events) |

## Import Order (Critical)

```typescript
// Entry file (_layout.tsx / index.js) — order is critical
import 'react-native-get-random-values'; // MUST be first (if used)
import './polyfills'; // window shim, and Event/CustomEvent if using wagmi
```

Incorrect order causes `crypto.getRandomValues is not a function` at runtime.

## react-native-get-random-values

- Required only for **React Native < 0.72** — Hermes 0.72+ exposes `globalThis.crypto.getRandomValues` natively
- Still recommended as an explicit safety net — especially if any dependency has its own minimum RN version assumptions
- Must be the **very first import** in the entry file, before anything that touches crypto

## Buffer Polyfill

- `@metamask/connect-multichain` self-polyfills `Buffer` via its React Native entry point — not needed for the SDK itself
- Still recommended to set `global.Buffer = Buffer` in `polyfills.ts` as a safety net for peer deps (e.g. `eciesjs`, `@solana/web3.js`) that may load before connect-multichain
- Install: `npm install buffer`

## window Object Polyfill

- **Required** for correct platform and deeplink behaviour — `getPlatformType()` in connect-multichain inspects `window` and `global.navigator.product` to decide between the deeplink path and the install-modal path
- All `window.*` accesses inside the SDK are guarded, so code will not crash without it, but `isSecure()` returns the wrong value and deeplinks will not trigger
- Provide at minimum: `location`, `addEventListener`, `removeEventListener`, `dispatchEvent`

## Event and CustomEvent Polyfills

- **Not required** by the connect-\* packages themselves — the SDK uses `eventemitter3` for all internal eventing; DOM `Event`/`CustomEvent` are never constructed in React Native code paths
- **Required when using wagmi** — wagmi core dispatches DOM events internally
- Add only if your integration uses wagmi:

```typescript
class EventPolyfill {
  /* ... */
}
class CustomEventPolyfill extends EventPolyfill {
  detail: any; /* ... */
}
global.Event = EventPolyfill as any;
global.CustomEvent = CustomEventPolyfill as any;
```

## Metro extraNodeModules

- The MetaMask Connect SDK has transitive dependencies on Node.js built-in modules
- Metro cannot resolve them without explicit shims in `metro.config.js`
- **`stream`** must map to `readable-stream` (not `stream-browserify`) — it is the only built-in that needs a real implementation
- Map every other referenced built-in to an **empty stub module** (`module.exports = {};`) — they are referenced by transitive deps but never called at runtime in React Native (this matches the SDK's own react-native-playground):

```javascript
// metro.config.js
const path = require('path');
const emptyModule = path.resolve(__dirname, 'src', 'empty-module.js'); // module.exports = {};

resolver: {
  extraNodeModules: {
    stream: require.resolve('readable-stream'),
    crypto: emptyModule,
    http: emptyModule,
    https: emptyModule,
    net: emptyModule,
    tls: emptyModule,
    zlib: emptyModule,
    os: emptyModule,
    dns: emptyModule,
    assert: emptyModule,
    url: emptyModule,
    path: emptyModule,
    fs: emptyModule,
  },
}
```

- Only `readable-stream` needs to be installed — do not install `react-native-crypto`, `@tradle/react-native-http`, `https-browserify`, or `os-browserify`; they are obsolete for this SDK

## preferredOpenLink (Required)

- `mobile.preferredOpenLink` must be set in React Native for deeplinks to open MetaMask Mobile
- Pass: `(deeplink: string) => Linking.openURL(deeplink)`
- Without this, connection attempts via MWP will hang — no deeplink is triggered

## Async Storage for Persistence

- Browser localStorage is not available in React Native
- Use `@react-native-async-storage/async-storage` for session persistence
- With wagmi: use `createAsyncStoragePersister` from `@tanstack/query-async-storage-persister`
- Without wagmi: the MetaMask Connect SDK handles persistence internally when AsyncStorage is provided
