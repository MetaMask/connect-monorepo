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
- Expo CLI (`npx expo` works without a global install)

### Android

- [Android Studio](https://developer.android.com/studio) with:
  - Android SDK (API 36 recommended — the build will also auto-install NDK 27.1)
  - At least one AVD (Android Virtual Device) configured via **AVD Manager**
- `ANDROID_HOME` environment variable pointing to your SDK (e.g. `~/Library/Android/sdk`)

### iOS

- Xcode with iOS Simulator
- CocoaPods (`gem install cocoapods` or via Homebrew)

## Getting Started

All commands below assume you start from the **monorepo root** unless noted otherwise.

### 1. Install dependencies and build workspace packages

```bash
yarn install
yarn build
```

`yarn build` compiles the workspace packages (`connect-multichain`, `connect-evm`, etc.) that the playground depends on. You need to re-run this whenever you change code in those packages.

### 2. Create the environment file

```bash
cd playground/react-native-playground
cp .env.example .env
```

Then fill out the resulting `.env` file:

```env
EXPO_PUBLIC_INFURA_API_KEY=your_infura_api_key
```

> The Infura key is used for JSON-RPC calls. The app will launch without one, but RPC methods will fail.

### 3. Run on a device or emulator

There are two ways to run the app, depending on your needs:

#### Option A: Expo Dev Server (`yarn android` / `yarn ios`)

This starts the Expo dev server and opens the app in Expo Go (or an existing development build). Fast iteration, but requires Expo Go installed on the device/emulator.

```bash
# From playground/react-native-playground
yarn android   # or yarn ios, yarn web
```

#### Option B: Native Debug Build (`npx expo run:android`)

This generates the native project, compiles a debug APK via Gradle, installs it on the emulator, and starts Metro. Use this when you need a standalone build or don't have Expo Go.

```bash
# Start the emulator first (pick an AVD name from the list)
$ANDROID_HOME/emulator/emulator -list-avds
$ANDROID_HOME/emulator/emulator -avd <AVD_NAME> &

# Wait for boot
$ANDROID_HOME/platform-tools/adb wait-for-device

# Build, install, and launch
cd playground/react-native-playground
yarn copy-wagmi-connector
npx expo run:android
```

For iOS the equivalent is:

```bash
npx expo run:ios
```

> **First-time build expectations:** The initial `npx expo run:android` takes **8–12 minutes** because it runs `expo prebuild` to generate the `android/` directory, downloads Gradle 8.x and the NDK, then compiles all native modules (reanimated, gesture-handler, screens, etc.). Subsequent builds are much faster thanks to Gradle caching.

### 4. Verify the app is running

After the build completes you should see:

- The APK installed from `android/app/build/outputs/apk/debug/app-debug.apk`
- Metro bundler running on `http://localhost:8081`
- The playground app open on the emulator

Metro will stream JS bundle progress and app logs to the terminal.

## Running the App (Quick Reference)

| Platform | Dev server (Expo Go)     | Native build                |
| -------- | ------------------------ | --------------------------- |
| Android  | `yarn android`           | `npx expo run:android`      |
| iOS      | `yarn ios`               | `npx expo run:ios`          |
| Web      | `yarn web`               | N/A                         |

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

5. **Stale native build or prebuild issues**
   - Delete the generated native directories and re-run:
     ```bash
     rm -rf android ios
     npx expo run:android   # re-generates android/ and rebuilds
     ```

6. **Emulator not found / `adb` not on PATH**
   - Ensure `ANDROID_HOME` is set (e.g. `export ANDROID_HOME=~/Library/Android/sdk`)
   - Add platform-tools to PATH: `export PATH=$ANDROID_HOME/platform-tools:$PATH`
   - Create an AVD in Android Studio via **Tools → AVD Manager**

7. **Gradle build fails with SDK/NDK errors**
   - Open Android Studio → **SDK Manager** and install the matching SDK platform (API 36) and NDK 27.1
   - Accept licenses: `$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses`

## Building for Production

Use [EAS Build](https://docs.expo.dev/build/introduction/) for production builds:

```bash
npx eas build --platform android
npx eas build --platform ios
```

Or build locally with:

```bash
npx expo run:android --variant release
npx expo run:ios --configuration Release
```

## Contributing

See the [main repository contributing guide](../../docs/contributing.md) for development setup and guidelines.
