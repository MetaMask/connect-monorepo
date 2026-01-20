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
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
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

## API Reference

### `createSolanaClient(options)`

Creates a new Solana client instance.

#### Parameters

- `options.dapp.name` (required) - The name of your dapp
- `options.dapp.url` (optional) - The URL of your dapp
- `options.dapp.iconUrl` (optional) - The icon URL of your dapp
- `options.api.supportedNetworks` (optional) - Map of CAIP chain IDs to RPC URLs
- `options.debug` (optional) - Enable debug logging

#### Returns

A `SolanaClient` object with:

- `core` - The underlying MultichainCore instance
- `getWallet(walletName?)` - Returns a wallet-standard compatible wallet
- `registerWallet(walletName?)` - Registers the wallet with the wallet-standard registry
- `disconnect()` - Disconnects and revokes the session

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
