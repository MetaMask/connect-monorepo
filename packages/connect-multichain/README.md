# `@metamask/connect-multichain`

> Core multichain connectivity library for MetaMask Connect SDK. Supports multiple blockchain networks including EVM chains (Ethereum, Polygon, etc.) and non-EVM chains (Solana, etc.).

This package provides the underlying multichain infrastructure for connecting dApps to MetaMask across various blockchain ecosystems.

## Installation

```bash
yarn add @metamask/connect-multichain
```

or

```bash
npm install @metamask/connect-multichain
```

## Quick Start

```typescript
import { createMultichainClient } from '@metamask/connect-multichain';

const sdk = await createMultichainClient({
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

// Connect to MetaMask with specific chain scopes
await sdk.connect(['eip155:1', 'eip155:137'], []);

// Invoke methods on specific chains
const blockNumber = await sdk.invokeMethod({
  scope: 'eip155:1',
  request: {
    method: 'eth_blockNumber',
    params: [],
  },
});
```

## Usage

### Browser (Web)

```typescript
import { createMultichainClient } from '@metamask/connect-multichain';

const sdk = await createMultichainClient({
  dapp: {
    name: 'My Web DApp',
    url: 'https://mydapp.com',
    iconUrl: 'https://mydapp.com/icon.png',
  },
  api: {
    supportedNetworks: {
      'eip155:1': 'https://mainnet.infura.io/v3/YOUR_KEY',
    },
  },
  ui: {
    preferExtension: true,    // Prefer browser extension over mobile QR
    showInstallModal: false,  // Show modal to install extension
    headless: false,          // Set true for custom QR UI
  },
});
```

### Node.js

```typescript
import { createMultichainClient } from '@metamask/connect-multichain';

const sdk = await createMultichainClient({
  dapp: {
    name: 'My Node App',
    url: 'https://mydapp.com',
  },
  api: {
    supportedNetworks: {
      'eip155:1': 'https://mainnet.infura.io/v3/YOUR_KEY',
    },
  },
});

// Connect will display QR code in terminal
await sdk.connect(['eip155:1'], []);
```

### React Native

```typescript
import { Linking } from 'react-native';
import { createMultichainClient } from '@metamask/connect-multichain';

const sdk = await createMultichainClient({
  dapp: {
    name: 'My RN App',
    url: 'https://mydapp.com',
  },
  api: {
    supportedNetworks: {
      'eip155:1': 'https://mainnet.infura.io/v3/YOUR_KEY',
    },
  },
  mobile: {
    preferredOpenLink: (deeplink) => {
      Linking.openURL(deeplink);
    },
  },
});
```

## API Reference

### `createMultichainClient(options)`

Factory function to create a new Multichain SDK instance.

#### Parameters

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `dapp.name` | `string` | Yes | Name of your dApp |
| `dapp.url` | `string` | No | URL of your dApp |
| `dapp.iconUrl` | `string` | No | Icon URL for your dApp |
| `dapp.base64Icon` | `string` | No | Base64-encoded icon (alternative to iconUrl) |
| `api.supportedNetworks` | `RpcUrlsMap` | Yes | Map of CAIP chain IDs to RPC URLs |
| `storage` | `StoreClient` | No | Custom storage adapter |
| `ui.factory` | `BaseModalFactory` | No | Custom modal factory |
| `ui.headless` | `boolean` | No | Run without UI (for custom QR implementations) |
| `ui.preferExtension` | `boolean` | No | Prefer browser extension (default: true) |
| `ui.showInstallModal` | `boolean` | No | Show installation modal |
| `mobile.preferredOpenLink` | `(deeplink: string, target?: string) => void` | No | Custom deeplink handler |
| `mobile.useDeeplink` | `boolean` | No | Use `metamask://` instead of universal links |
| `analytics.integrationType` | `string` | No | Integration type for analytics |
| `transport.extensionId` | `string` | No | Custom extension ID |
| `transport.onNotification` | `(notification: unknown) => void` | No | Notification handler |

#### Returns

`Promise<MetaMaskConnectMultichain>` - A fully initialized SDK instance.

```typescript
const sdk = await createMultichainClient({
  dapp: { name: 'My DApp', url: 'https://mydapp.com' },
  api: {
    supportedNetworks: {
      'eip155:1': 'https://mainnet.infura.io/v3/KEY',
      'eip155:137': 'https://polygon-mainnet.infura.io/v3/KEY',
    },
  },
});
```

---

### `MetaMaskConnectMultichain`

The main SDK class extending `MultichainCore`.

#### Methods

##### `connect(scopes, caipAccountIds, sessionProperties?, forceRequest?)`

Connects to MetaMask with specified chain scopes.

```typescript
await sdk.connect(
  ['eip155:1', 'eip155:137'],  // Chain scopes to request
  ['eip155:1:0x...'],          // Optional: Specific accounts to request
  undefined,                    // Optional: Session properties
  false                         // Optional: Force new connection
);
```

##### `disconnect()`

Disconnects from the wallet and cleans up resources.

```typescript
await sdk.disconnect();
```

##### `invokeMethod(options)`

Invokes an RPC method on a specific chain.

```typescript
const result = await sdk.invokeMethod({
  scope: 'eip155:1',
  request: {
    method: 'eth_getBalance',
    params: ['0x...', 'latest'],
  },
});
```

##### `openDeeplinkIfNeeded()`

Opens the MetaMask mobile app via deeplink if needed (for mobile web flows).

```typescript
sdk.openDeeplinkIfNeeded();
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `status` | `ConnectionStatus` | Connection status |
| `provider` | `MultichainApiClient` | Multichain API client |
| `transport` | `ExtendedTransport` | Active transport layer |
| `transportType` | `TransportType` | Type of transport (`'browser'` or `'mwp'`) |
| `storage` | `StoreClient` | Storage client |

#### Events

```typescript
// Session changes
sdk.on('wallet_sessionChanged', (session) => {
  console.log('Session updated:', session);
});

// QR code display (for custom UI)
sdk.on('display_uri', (uri) => {
  console.log('Display QR code:', uri);
});

// Connection state changes
sdk.on('stateChanged', (status) => {
  console.log('Status:', status);
});
```

---

### `MultichainCore`

Abstract base class providing core multichain functionality.

#### Methods

##### `on(event, handler)`

Registers an event handler.

##### `off(event, handler)`

Removes an event handler.

##### `emit(event, args)`

Emits an event to all registered handlers.

---

### Types

#### `Scope`

CAIP-2 chain identifier (e.g., `'eip155:1'`, `'solana:mainnet'`).

```typescript
type Scope = `${string}:${string}`;
```

#### `ConnectionStatus`

```typescript
type ConnectionStatus = 'pending' | 'connecting' | 'connected' | 'disconnected' | 'loaded';
```

#### `TransportType`

```typescript
enum TransportType {
  Browser = 'browser',
  MWP = 'mwp',
}
```

#### `DappSettings`

```typescript
type DappSettings = {
  name: string;
  url?: string;
} & ({ iconUrl?: string } | { base64Icon?: string });
```

#### `MultichainOptions`

```typescript
type MultichainOptions = {
  dapp: DappSettings;
  api: {
    supportedNetworks: RpcUrlsMap;
  };
  analytics?: { integrationType: string };
  storage: StoreClient;
  ui: {
    factory: BaseModalFactory;
    headless?: boolean;
    preferExtension?: boolean;
    showInstallModal?: boolean;
  };
  mobile?: {
    preferredOpenLink?: (deeplink: string, target?: string) => void;
    useDeeplink?: boolean;
  };
  transport?: {
    extensionId?: string;
    onNotification?: (notification: unknown) => void;
  };
};
```

#### `InvokeMethodOptions`

```typescript
type InvokeMethodOptions = {
  scope: Scope;
  request: {
    method: string;
    params?: unknown[];
  };
};
```

#### `SessionData`

Session data returned from the wallet containing permissioned scopes and accounts.

#### `RpcUrlsMap`

```typescript
type RpcUrlsMap = Record<Scope, string>;
```

---

### Utilities

#### `getInfuraRpcUrls(infuraApiKey)`

Generates Infura RPC URLs for common networks.

```typescript
import { getInfuraRpcUrls } from '@metamask/connect-multichain';

const rpcUrls = getInfuraRpcUrls('YOUR_INFURA_KEY');
// {
//   'eip155:1': 'https://mainnet.infura.io/v3/YOUR_KEY',
//   'eip155:5': 'https://goerli.infura.io/v3/YOUR_KEY',
//   'eip155:137': 'https://polygon-mainnet.infura.io/v3/YOUR_KEY',
//   ...
// }
```

#### `getWalletActionAnalyticsProperties(options, storage, invokeOptions)`

Helper for generating analytics properties for wallet actions.

#### `isRejectionError(error)`

Checks if an error is a user rejection error.

```typescript
import { isRejectionError } from '@metamask/connect-multichain';

try {
  await sdk.connect(['eip155:1'], []);
} catch (error) {
  if (isRejectionError(error)) {
    console.log('User rejected the connection');
  }
}
```

---

### Errors

The package exports various error classes for handling specific error conditions:

- `ProtocolError` - Base protocol error
- `StorageError` - Storage operation errors
- `RpcError` - RPC request errors

```typescript
import { ProtocolError } from '@metamask/connect-multichain';

try {
  await sdk.connect(['eip155:1'], []);
} catch (error) {
  if (error instanceof ProtocolError) {
    console.log('Protocol error:', error.code, error.message);
  }
}
```

---

### Platform Detection

#### `getPlatformType()`

Detects the current platform.

```typescript
import { getPlatformType, PlatformType } from '@metamask/connect-multichain';

const platform = getPlatformType();
// PlatformType.DesktopWeb | PlatformType.MobileWeb | PlatformType.ReactNative | ...
```

#### `PlatformType`

```typescript
enum PlatformType {
  DesktopWeb = 'web-desktop',
  MobileWeb = 'web-mobile',
  ReactNative = 'react-native',
  NodeJS = 'nodejs',
  MetaMaskMobileWebview = 'in-app-browser',
}
```

## Headless Mode

For custom QR code implementations, use headless mode:

```typescript
const sdk = await createMultichainClient({
  dapp: { name: 'My DApp' },
  api: { supportedNetworks: { 'eip155:1': 'https://...' } },
  ui: { headless: true },
});

// Listen for QR code URIs
sdk.on('display_uri', (uri) => {
  // Display your custom QR code with this URI
  displayMyCustomQRCode(uri);
});

await sdk.connect(['eip155:1'], []);
```

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/connect-monorepo#readme).
