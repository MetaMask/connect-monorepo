# Browser Playground

A browser-based test dapp for the MetaMask Connect

## Overview

This playground is part of the MetaMask Connect monorepo and provides a comprehensive testing environment for:

- **Multichain API**: Connect to multiple chains simultaneously (Ethereum, Linea, Polygon, Solana, etc.)
- **Legacy EVM Connector**: Backwards-compatible connection for EVM chains
- **Wagmi Integration**: Test the wagmi connector for React applications

## Prerequisites

- Node.js (>=20.19.0)
- Yarn (v4.1.1+)

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
INFURA_API_KEY=your_infura_api_key
```

## Usage

From the **monorepo root**:

```bash
yarn workspace @metamask/browser-playground start
```

Or from this directory:

```bash
yarn start
```

This launches the development server at `http://localhost:3000`.

## Features

### Multichain Connection

Connect to multiple blockchain networks in a single session:

- Ethereum Mainnet & Testnets
- Layer 2 networks (Linea, Arbitrum, Polygon, etc.)
- Solana

### Legacy EVM Connector

Toggle between multichain and legacy EVM modes to test backwards compatibility with existing dapps.

### Wagmi Connector

Test the wagmi integration for React applications with persistent sessions and multichain support.

## Project Structure

```
browser-playground/
├── src/
│   ├── App.tsx                    # Main application component
│   ├── components/
│   │   ├── DynamicInputs.tsx      # Checkbox selection UI
│   │   ├── FeaturedNetworks.tsx   # Network selection component
│   │   ├── LegacyEVMCard.tsx      # Legacy EVM connector card
│   │   ├── ScopeCard.tsx          # Network scope with method invocation
│   │   ├── WagmiCard.tsx          # Wagmi connector card
│   │   └── WalletList.tsx         # Wallet selection component
│   ├── helpers/                   # Platform-specific helpers
│   ├── sdk/
│   │   ├── SDKProvider.tsx        # Multichain SDK context
│   │   ├── LegacyEVMSDKProvider.tsx # Legacy EVM SDK context
│   │   └── index.ts
│   └── wagmi/
│       ├── config.ts              # Wagmi configuration
│       └── metamask-connector.ts  # Auto-generated connector
├── scripts/
│   ├── copy-wagmi-connector.js    # Copies wagmi connector from integrations/
│   └── README.md                  # Script documentation
└── public/
```

## Shared Code

This playground uses `@metamask/playground-ui` for shared constants, helpers, and types. See the [playground-ui README](../playground-ui/README.md) for details.

## Auto-Generated Files

The `src/wagmi/metamask-connector.ts` file is **auto-generated** from `integrations/wagmi/metamask-connector.ts`. See [scripts/README.md](./scripts/README.md) for details on why and how this works.

**Important**: Never edit `src/wagmi/metamask-connector.ts` directly. Edit `integrations/wagmi/metamask-connector.ts` instead.

## Contributing

See the [main repository contributing guide](../../docs/contributing.md) for development setup and guidelines.
