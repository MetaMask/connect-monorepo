# `@metamask/connect-evm`

> EIP-1193 compatible interface for connecting to MetaMask and interacting with Ethereum Virtual Machine (EVM) networks.

`@metamask/connect-evm` provides a modern replacement for MetaMask SDK V1, offering enhanced functionality and cross-platform compatibility. It wraps the Multichain SDK to provide a simplified, EIP-1193 compliant API for dapp developers.

## Features

- **EIP-1193 Provider Interface** - Seamless integration with existing dapp code using the standard Ethereum provider interface
- **Cross-Platform Support** - Works with browser extensions and mobile applications

## Installation

```bash
npm install @metamask/connect-evm
```

## Quick Start

```typescript
import { createMetamaskConnectEVM } from '@metamask/connect-evm';

// Create an SDK instance
const sdk = await createMetamaskConnectEVM({
  dapp: {
    name: 'My DApp',
    url: 'https://mydapp.com',
  },
});

// Connect to MetaMask
await sdk.connect({ chainId: 1 }); // Connect to Ethereum Mainnet

// Get the EIP-1193 provider
const provider = await sdk.getProvider();

// Request accounts
const accounts = await provider.request({
  method: 'eth_accounts',
});
```

## Usage

### Basic Connection

```typescript
import { createMetamaskConnectEVM } from '@metamask/connect-evm';

const sdk = await createMetamaskConnectEVM({
  dapp: {
    name: 'My DApp',
    url: 'https://mydapp.com',
  },
});

// Connect with default chain (mainnet)
const { accounts, chainId } = await sdk.connect();

// Connect to a specific chain
await sdk.connect({ chainId: 137 }); // Polygon

// Connect to a specific chain and account
await sdk.connect({ chainId: 1, account: '0x...' });
```

### Using the Provider Directly

```typescript
const provider = await sdk.getProvider();

// Send transaction
const txHash = await provider.request({
  method: 'eth_sendTransaction',
  params: [
    {
      from: accounts[0],
      to: '0x...',
      value: '0x...',
    },
  ],
});

// Call contract method
const result = await provider.request({
  method: 'eth_call',
  params: [
    {
      to: '0x...',
      data: '0x...',
    },
  ],
});
```

## Examples

Check out the [playground examples](../../playground/legacy-evm-react-vite-playground) for a complete React implementation.

## TypeScript

This package is written in TypeScript and includes full type definitions. No additional `@types` package is required.

## Development

This package is part of the MetaMask Connect monorepo. From the repo root:

```bash
# Run linting
yarn workspace @metamask/connect-evm run lint

# Run type checking
yarn workspace @metamask/connect-evm run check

# Format code
yarn workspace @metamask/connect-evm run format:fix

# Run tests
yarn workspace @metamask/connect-evm run test
```

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/metamask-connect-monorepo#readme).

## License

MIT
