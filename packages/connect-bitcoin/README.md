# `@metamask/connect-bitcoin`

> Bitcoin wallet-standard integration for connecting to MetaMask via the Multichain API.

`@metamask/connect-bitcoin` provides a seamless way to integrate MetaMask as a Bitcoin wallet in your dapp using the [wallet-standard](https://github.com/wallet-standard/wallet-standard) protocol. It wraps `@metamask/bitcoin-wallet-standard` with MetaMask Connect to handle wallet discovery and session management automatically.

## Features

- **Wallet Standard Compatible** - Automatically registers MetaMask with the wallet-standard registry
- **Session Management** - Handles session creation and revocation internally
- **Cross-Platform Support** - Works with browser extensions and mobile applications

## Installation

```bash
yarn add @metamask/connect-bitcoin
```

or

```bash
npm install @metamask/connect-bitcoin
```

## Quick Start

```typescript
import { createBitcoinClient } from '@metamask/connect-bitcoin';

// Create a Bitcoin client
const client = await createBitcoinClient({
  dapp: {
    name: 'My Bitcoin DApp',
    url: 'https://mydapp.com',
  },
});

// Register MetaMask with the wallet-standard registry
// This makes MetaMask automatically discoverable by Bitcoin dapps
await client.registerWallet();
```

## Usage with Wallet standard

```tsx
import { createBitcoinClient } from '@metamask/connect-bitcoin';
import { type WalletAccount, getWallets } from '@wallet-standard/core';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    createBitcoinClient({
      dapp: {
        name: 'MetaMask Connect Playground',
        url: window.location.origin,
      },
      api: {
        supportedNetworks: {
          mainnet: BITCOIN_MAINNET_ENDPOINT,
        },
      },
    }).then(() => {
      // Bitcoin client initialized and wallet registered
      const wallets = getWallets().get()

      // Prompt wallet for connection
      const { accounts } = await wallets[0].features['bitcoin:connect'].connect()
      
      // Sign message
      const signedMessage = await wallets[0].features['bitcoin:signAndSendTransaction'].signMessage({
        account: accounts[0],
        message: 'Hello bitcoin'
      })
    })
  }, [])
}

```

## API Reference

### `createBitcoinClient(options)`

Creates a new Bitcoin client instance. By default, the wallet is automatically registered with the wallet-standard registry on creation.

#### Parameters

| Option                  | Type                      | Required | Description                                                            |
| ----------------------- | ------------------------- | -------- | ---------------------------------------------------------------------- |
| `dapp.name`             | `string`                  | Yes      | Name of your dApp                                                      |
| `dapp.url`              | `string`                  | No       | URL of your dApp                                                       |
| `dapp.iconUrl`          | `string`                  | No       | Icon URL for your dApp                                                 |
| `api.supportedNetworks` | `BitcoinSupportedNetworks` | No       | Map of network names (`mainnet`, `testnet`, `regtest`) to RPC URLs      |
| `debug`                 | `boolean`                 | No       | Enable debug logging                                                   |
| `skipAutoRegister`      | `boolean`                 | No       | Skip auto-registering the wallet during creation (defaults to `false`) |

#### Returns

`Promise<BitcoinClient>`

---

### `BitcoinClient`

The object returned by `createBitcoinClient`.

#### Properties

| Property | Type             | Description                            |
| -------- | ---------------- | -------------------------------------- |
| `core`   | `MultichainCore` | The underlying MultichainCore instance |

#### Methods

##### `getWallet()`

Returns a wallet-standard compatible MetaMask wallet instance.

**Returns**

`Wallet` - A [wallet-standard](https://github.com/wallet-standard/wallet-standard) compatible wallet.

##### `registerWallet()`

Registers the MetaMask wallet with the wallet-standard registry. This is a no-op if the wallet was already auto-registered during creation (i.e., `skipAutoRegister` was not set to `true`).

**Returns**

`Promise<void>`

##### `disconnect()`

Disconnects from the wallet and revokes the session.

**Returns**

`Promise<void>`

---

### Types

#### `BitcoinNetwork`

```typescript
type BitcoinNetwork = 'mainnet' | 'testnet' | 'regtest';
```

#### `BitcoinSupportedNetworks`

```typescript
type BitcoinSupportedNetworks = Partial<Record<BitcoinNetwork, string>>;
```

## TypeScript

This package is written in TypeScript and includes full type definitions.

## Development

This package is part of the MetaMask Connect monorepo. From the repo root:

```bash
# Build the package
yarn workspace @metamask/connect-bitcoin run build

# Run tests
yarn workspace @metamask/connect-bitcoin run test

# Run linting
yarn workspace @metamask/connect-bitcoin run lint
```

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/connect-monorepo#readme).

## License

MIT
