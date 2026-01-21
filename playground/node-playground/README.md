# Node Playground

An interactive CLI playground for the MetaMask Connect SDK, demonstrating both multichain API and legacy EVM connector capabilities in a Node.js environment.

## Overview

This playground provides a terminal-based interface for testing MetaMask connections from Node.js applications. It supports:

- **Multichain API**: Connect to multiple chains (Ethereum + Solana) with unified session management
- **Legacy EVM Connector**: Traditional EVM-only connection with chain switching support
- **Message Signing**: Test `personal_sign` on Ethereum and `signMessage` on Solana
- **Chain Switching**: Switch between networks when using the Legacy EVM connector

## Prerequisites

- Node.js (>=20.19.0)
- Yarn (v4.1.1+)
- [nvm](https://github.com/nvm-sh/nvm) (recommended for Node version management)

## Installation

From the **monorepo root**:

```bash
# Ensure correct Node version
nvm use

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
yarn workspace @metamask/node-playground start connect
```

Or from this directory:

```bash
yarn start connect
```

## Features

### Connection Options

When you start the playground, you can choose between:

1. **Multichain API** - Connects to Ethereum Mainnet and Solana Mainnet simultaneously
2. **Legacy EVM Connector** - Connects to Ethereum Mainnet with traditional EVM methods

### Available Actions

Once connected, the available actions depend on your connector type:

**Multichain API:**
- Sign Ethereum Message (`personal_sign`)
- Sign Solana Message (`signMessage`)
- Disconnect

**Legacy EVM Connector:**
- Sign Ethereum Message (`personal_sign`)
- Switch Chain (Ethereum, Polygon, Linea, Sepolia)
- Disconnect

### How It Works

1. Start the playground and select a connection type
2. A QR code will appear - scan it with MetaMask Mobile
3. Once connected, your accounts will be displayed grouped by chain
4. Choose an action from the menu to test SDK functionality
5. Signatures and results are displayed in the terminal

## Project Structure

```
node-playground/
├── src/
│   └── index.ts          # Main CLI application
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

The playground uses:
- `@metamask/connect-multichain` - For multichain API connections
- `@metamask/connect-evm` - For legacy EVM connections
- `inquirer` - Interactive CLI prompts
- `chalk` - Terminal styling
- `ora` - Loading spinners

## Contributing

See the [main repository contributing guide](../../docs/contributing.md) for development setup and guidelines.
