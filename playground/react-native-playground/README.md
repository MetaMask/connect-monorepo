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

### iOS

```bash
expo build:ios
```

### Android

```bash
expo build:android
```

## Contributing

See the [main repository contributing guide](../../docs/contributing.md) for development setup and guidelines.
