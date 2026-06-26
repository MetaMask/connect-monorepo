# React Native Playground

A React Native test dapp for the MetaMask Connect SDK built with Expo, demonstrating multichain API, legacy EVM, and wagmi connector capabilities on mobile devices.

## Overview

This playground provides a mobile testing environment for MetaMask connections. It supports:

- **Multichain API**: Connect to multiple chains simultaneously (Ethereum, Linea, Polygon, Solana, etc.)
- **Legacy EVM Connector**: Backwards-compatible connection for EVM chains
- **Wagmi Integration**: Test the wagmi connector in a React Native context
- **Cross-platform**: Runs on iOS, Android, and Web

## Prerequisites

- Node.js (>=20.19.0)
- Yarn (v4.1.1+)
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android development)

## Installation

From the **monorepo root**:

```bash
# Install all dependencies
yarn install

# Build workspace packages
yarn build
```

## Configuration

```bash
cp .env.example .env
```

Then fill out the resulting `.env` file:

```env
EXPO_PUBLIC_INFURA_API_KEY=your_infura_api_key
```

## Running the App

### iOS

```bash
yarn ios
```

### Android

```bash
yarn android
```

### Web

```bash
yarn web
```

## Features

### Multichain Connection

Connect to multiple blockchain networks in a single session:

- Ethereum Mainnet & Testnets
- Layer 2 networks (Linea, Arbitrum, Polygon, etc.)
- Solana

### Legacy EVM Connector

Toggle between multichain and legacy EVM modes to test backwards compatibility with existing dapps.

### Wagmi Connector

Test the wagmi integration for React Native applications with MetaMask Mobile deeplink support.

### Method Invocation

- Dropdown selector for available RPC methods per network
- Editable JSON request editor with collapsible UI
- Parameter injection for methods requiring addresses/chainIds
- Support for EVM methods (`eth_*`, `personal_sign`, etc.)
- Support for Solana methods (`signMessage`, `signTransaction`, etc.)

## Project Structure

```
react-native-playground/
├── app/                           # Expo Router pages
│   ├── _layout.tsx                # Root layout
│   └── index.tsx                  # Main screen
├── src/
│   ├── components/
│   │   ├── DynamicInputs.tsx      # Checkbox selection UI
│   │   ├── FeaturedNetworks.tsx   # Network selection component
│   │   ├── LegacyEVMCard.tsx      # Legacy EVM connector card
│   │   ├── ScopeCard.tsx          # Network scope with method invocation
│   │   └── WagmiCard.tsx          # Wagmi connector card
│   ├── helpers/
│   │   ├── SignHelpers.ts         # Signing utilities
│   │   └── solana-method-signatures.ts # Solana transaction generation
│   ├── sdk/
│   │   ├── SDKProvider.tsx        # Multichain SDK context
│   │   ├── LegacyEVMSDKProvider.tsx # Legacy EVM SDK context
│   │   └── index.ts
│   ├── styles/
│   │   └── shared.ts              # Shared StyleSheet styles
│   └── wagmi/
│       ├── config.ts              # Wagmi configuration
│       └── metamask-connector.ts  # Auto-generated connector
├── scripts/
│   ├── copy-wagmi-connector.js    # Copies wagmi connector from integrations/
│   └── README.md                  # Script documentation
├── polyfills.ts                   # React Native polyfills (window, Event, etc.)
├── assets/                        # App icons and splash screens
└── app.json                       # Expo configuration
```

## Shared Code

This playground uses `@metamask/playground-ui` for shared constants, helpers, and types. See the [playground-ui README](../playground-ui/README.md) for details.

## Auto-Generated Files

The `src/wagmi/metamask-connector.ts` file is **auto-generated** from `integrations/wagmi/metamask-connector.ts`. See [scripts/README.md](./scripts/README.md) for details.

**Important**: Never edit `src/wagmi/metamask-connector.ts` directly. Edit `integrations/wagmi/metamask-connector.ts` instead.

## Polyfills

React Native doesn't have browser globals, so `polyfills.ts` provides:

- `window.location` - For SDK initialization
- `window.addEventListener/removeEventListener` - No-op functions for browser event APIs
- `Event` / `CustomEvent` classes - For wagmi and other libraries

See [scripts/README.md](./scripts/README.md) for detailed polyfill documentation.

## Environment Variables

| Variable                     | Description                   |
| ---------------------------- | ----------------------------- |
| `EXPO_PUBLIC_INFURA_API_KEY` | Infura API key for RPC access |

### CI Secrets (GitHub Actions)

The following secrets must be configured in the metamask-connect repository
settings for the APK CI build workflow:

| Secret           | Required | Description                                      |
| ---------------- | -------- | ------------------------------------------------ |
| `INFURA_API_KEY` | Yes      | Infura API key baked into the APK for RPC access |

The APK is signed with the Expo-generated debug keystore, which is sufficient
for a test dApp. If a dedicated release keystore is needed in the future,
additional signing config can be added to the workflow.

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Run `yarn install` from the workspace root
   - Run `yarn build` to build workspace dependencies

2. **Buffer is not defined**
   - The Buffer polyfill is configured in `polyfills.ts`
   - Ensure polyfills are imported before other modules

3. **Picker not working**
   - For iOS, run `npx pod-install` after installation

4. **Wagmi connector issues**
   - Ensure `yarn copy-wagmi-connector` has run (automatic with `yarn start`)
   - Check polyfills are properly configured

## Building for Production

### Android Release APK

The release APK is built automatically when the `@metamask/react-native-playground`
package is released. The `publish-release.yml` workflow detects whether the
playground's package-scoped tag (e.g., `@metamask/react-native-playground@0.1.2`)
was created on the current commit, and only then triggers the APK build. The APK
is uploaded to a GitHub Release under that same playground-specific tag.

**CI workflow** (`.github/workflows/build-rn-playground-apk.yml`):

- Triggered only when the playground package itself is released
- Can also be triggered manually via `workflow_dispatch`
- Builds the APK using Expo prebuild + Gradle
- Uploads as a GitHub Release asset on the playground tag and as a workflow artifact

**Manual build:**

```bash
# From the monorepo root (after yarn install && yarn build)
cd playground/react-native-playground
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
```

The output APK will be at:

```
android/app/build/outputs/apk/release/app-release.apk
```

**Fetching from downstream repos** (e.g., metamask-mobile):

```bash
# Fetch the APK for a specific playground version
TAG="@metamask/react-native-playground@0.1.2"
curl -fsSL -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/MetaMask/metamask-connect/releases/tags/$TAG" \
  | jq -r '.assets[] | select(.name | startswith("rn-playground-")) | .browser_download_url' \
  | xargs curl -fsSL -o rn-playground.apk
```

### iOS

iOS builds are currently out of scope for CI automation.

```bash
expo build:ios
```

## BrowserStack Integration for E2E Tests

The playground APK is used by the metamask-mobile Appwright E2E tests on
BrowserStack. Three upload approaches were evaluated:

| Approach                      | Description                                                                                     | Recommendation  |
| ----------------------------- | ----------------------------------------------------------------------------------------------- | --------------- |
| Upload in metamask-connect CI | Release pipeline uploads APK to BrowserStack; stores `bs://` URL as a release artifact          | Not recommended |
| Upload in metamask-mobile CI  | metamask-mobile downloads APK from GitHub Releases, uploads to BrowserStack before tests        | **Recommended** |
| Hybrid                        | metamask-connect publishes to GitHub Releases; metamask-mobile fetches, uploads, caches `bs://` | Acceptable      |

### Recommended approach: Upload in metamask-mobile CI

**Rationale:**

1. **Credential scoping** — BrowserStack credentials (`BROWSERSTACK_USERNAME`,
   `BROWSERSTACK_ACCESS_KEY`) remain scoped to the metamask-mobile repo where
   they are already configured and used for all other BrowserStack uploads.
   Adding them to metamask-connect would expand the secret surface area.

2. **Consistency** — The existing metamask-mobile pattern (build/download APK →
   upload to BrowserStack → run tests) already works for the MetaMask wallet
   APK via Bitrise. The playground APK follows the same pattern, just with
   GitHub Releases as the source instead of Bitrise.

3. **Freshness control** — BrowserStack apps expire after 30 days of inactivity.
   Uploading per-test-run guarantees the APK is always available regardless of
   metamask-connect release cadence.

4. **Version pinning** — metamask-mobile controls which playground version to
   test via `RN_PLAYGROUND_APK_VERSION` (env var or repo variable), enabling
   independent version management.

### Implementation

The `run-performance-e2e.yml` workflow in metamask-mobile includes a
`fetch-rn-playground-apk` job that:

1. Downloads the playground APK from metamask-connect GitHub Releases using
   `scripts/fetch-rn-playground-apk.sh`
2. Uploads it to BrowserStack via the App Automate REST API
3. Passes the resulting `bs://` URL to mm-connect test jobs via the
   `browserstack_playground_url` input

The Appwright BrowserStack provider (via the yarn patch in metamask-mobile)
reads `BROWSERSTACK_RN_PLAYGROUND_URL` from the environment and passes it as
`otherApps` in `bstack:options`, telling BrowserStack to pre-install the
playground APK alongside the MetaMask wallet on the test device.

## Contributing

See the [main repository contributing guide](../../docs/contributing.md) for development setup and guidelines.
