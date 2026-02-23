# `@metamask/connect-solana`

> Solana wallet-standard integration for connecting to MetaMask via the Multichain API.

`@metamask/connect-solana` provides a seamless way to integrate MetaMask as a Solana wallet in your dapp using the [wallet-standard](https://github.com/wallet-standard/wallet-standard) protocol. It wraps `@metamask/solana-wallet-standard` with MetaMask Connect to handle wallet discovery and session management automatically.

## Features

- **Wallet Standard Compatible** - Automatically registers MetaMask with the wallet-standard registry
- **Seamless Integration** - Works with `@solana/wallet-adapter-react` out of the box
- **Session Management** - Handles session creation and revocation internally
- **Cross-Platform Support** - Works with browser extensions and mobile applications

## Installation

```bash
yarn add @metamask/connect-solana
```

or

```bash
npm install @metamask/connect-solana
```

## Quick Start

```typescript
import { createSolanaClient } from '@metamask/connect-solana';

// Create a Solana client
const client = await createSolanaClient({
  dapp: {
    name: 'My Solana DApp',
    url: 'https://mydapp.com',
  },
});

// Register MetaMask with the wallet-standard registry
// This makes MetaMask automatically discoverable by Solana dapps
await client.registerWallet();
```

## Usage with Solana Wallet Adapter

The most common use case is integrating with `@solana/wallet-adapter-react`:

```tsx
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import { createSolanaClient } from '@metamask/connect-solana';
import { useEffect } from 'react';

import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  useEffect(() => {
    // Register MetaMask wallet on app initialization
    createSolanaClient({
      dapp: {
        name: 'My Solana DApp',
        url: window.location.origin,
      },
    }).then((client) => {
      client.registerWallet();
    });
  }, []);

  return (
    <ConnectionProvider endpoint="https://api.devnet.solana.com">
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <WalletMultiButton />
          {/* Your app content */}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### ⚠️ Wallet Adapter support

> **Note:** There is a known issue with `@solana/wallet-adapter-react` that prevents connecting to MetaMask when using the Wallet Standard provider from `@metamask/connect-solana` in Chrome on Android.
>
> See this [patch file](../../.yarn/patches/@solana-wallet-adapter-react-npm-0.15.39-86277fdcc0.patch) for details.

## API Reference

### `createSolanaClient(options)`

Creates a new Solana client instance. By default, the wallet is automatically registered with the wallet-standard registry on creation.

#### Parameters

| Option                       | Type                      | Required | Description                                                                 |
| ---------------------------- | ------------------------- | -------- | --------------------------------------------------------------------------- |
| `dapp.name`                  | `string`                  | Yes      | Name of your dApp                                                           |
| `dapp.url`                   | `string`                  | No       | URL of your dApp                                                            |
| `dapp.iconUrl`               | `string`                  | No       | Icon URL for your dApp                                                      |
| `api.supportedNetworks`      | `SolanaSupportedNetworks` | No       | Map of network names (`mainnet`, `devnet`, `testnet`) to RPC URLs           |
| `debug`                      | `boolean`                 | No       | Enable debug logging                                                        |
| `skipAutoRegister`           | `boolean`                 | No       | Skip auto-registering the wallet during creation (defaults to `false`)      |

#### Returns

`Promise<SolanaClient>`

---

### `SolanaClient`

The object returned by `createSolanaClient`.

#### Properties

| Property | Type             | Description                          |
| -------- | ---------------- | ------------------------------------ |
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

#### `SolanaNetwork`

```typescript
type SolanaNetwork = 'mainnet' | 'devnet' | 'testnet';
```

#### `SolanaSupportedNetworks`

```typescript
type SolanaSupportedNetworks = Partial<Record<SolanaNetwork, string>>;
```

## TypeScript

This package is written in TypeScript and includes full type definitions.

## Development

This package is part of the MetaMask Connect monorepo. From the repo root:

```bash
# Build the package
yarn workspace @metamask/connect-solana run build

# Run tests
yarn workspace @metamask/connect-solana run test

# Run linting
yarn workspace @metamask/connect-solana run lint
```

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/connect-monorepo#readme).

## License

MIT
