# `@metamask/connect`

Unified entry point for MetaMask Connect SDK packages. This package re-exports both EVM and Multichain functionality from their respective packages for convenient access.

## Installation

```bash
yarn add @metamask/connect
```

or

```bash
npm install @metamask/connect
```

## Usage

### EVM (Ethereum) Connections

```typescript
import { createEVMClient } from '@metamask/connect/evm';

const sdk = await createEVMClient({
  dapp: {
    name: 'My DApp',
    url: 'https://mydapp.com',
  },
  api: {
    supportedNetworks: {
      'eip155:1': 'https://mainnet.infura.io/v3/YOUR_KEY',
      'eip155:137': 'https://polygon-mainnet.infura.io/v3/YOUR_KEY',
    },
  },
});

// Connect to MetaMask
const { accounts, chainId } = await sdk.connect({ chainIds: [1] });

// Get the EIP-1193 provider
const provider = sdk.getProvider();

// Make requests
const balance = await provider.request({
  method: 'eth_getBalance',
  params: [accounts[0], 'latest'],
});
```

### Multichain Connections

```typescript
import { createMultichainClient } from '@metamask/connect/multichain';

const sdk = await createMultichainClient({
  dapp: {
    name: 'My DApp',
    url: 'https://mydapp.com',
  },
  api: {
    supportedNetworks: {
      'eip155:1': 'https://mainnet.infura.io/v3/YOUR_KEY',
      'solana:mainnet': 'https://api.mainnet-beta.solana.com',
    },
  },
});

// Connect with multiple chain scopes
await sdk.connect(['eip155:1', 'solana:mainnet'], []);

// Invoke methods on specific chains
const result = await sdk.invokeMethod({
  scope: 'eip155:1',
  request: {
    method: 'eth_blockNumber',
    params: [],
  },
});
```

## API Reference

### EVM Exports

This package re-exports all functionality from `@metamask/connect-evm`:

- `createEVMClient` - Factory function to create an EVM SDK instance
- `MetamaskConnectEVM` - The main EVM SDK class
- `EIP1193Provider` - EIP-1193 compliant provider interface
- `getInfuraRpcUrls` - Helper to generate Infura RPC URLs

See [@metamask/connect-evm](../connect-evm/README.md) for detailed API documentation.

### Multichain Exports

This package re-exports all functionality from `@metamask/connect-multichain`:

- `createMultichainClient` - Factory function to create a Multichain SDK instance
- `MetaMaskConnectMultichain` - The main Multichain SDK class
- Various domain types, utilities, and error classes

See [@metamask/connect-multichain](../connect-multichain/README.md) for detailed API documentation.

## Package Structure

```
@metamask/connect
├── /evm        → Re-exports from @metamask/connect-evm
└── /multichain → Re-exports from @metamask/connect-multichain
```

## When to Use Which

| Use Case | Import Path |
|----------|-------------|
| Ethereum/EVM dApps with standard EIP-1193 provider | `@metamask/connect/evm` |
| Multi-chain dApps (Ethereum + Solana, etc.) | `@metamask/connect/multichain` |
| Direct package imports (smaller bundle) | `@metamask/connect-evm` or `@metamask/connect-multichain` |

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/connect-monorepo#readme).
