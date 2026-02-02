# `@metamask/connect-multichain`

> Core multichain connectivity library for MetaMask Connect SDK. Supports multiple blockchain networks including EVM chains (Ethereum, Polygon, etc.) and non-EVM chains (Solana, etc.).

This package provides support for connecting to MetaMask and using the [CAIP Multichain API](https://github.com/MetaMask/metamask-improvement-proposals/blob/main/MIPs/mip-5.md) which agnostically supports making requests to multiple blockchain ecosystems simultaneously.

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
import {
  createMultichainClient,
  getInfuraRpcUrls,
} from '@metamask/connect-multichain';

const sdk = await createMultichainClient({
  dapp: {
    name: 'My DApp',
    url: 'https://mydapp.com',
  },
  api: {
    supportedNetworks: {
      // use the `getInfuraRpcUrls` helper to generate a map of Infura RPC endpoints
      ...getInfuraRpcUrls(INFURA_API_KEY),
      // or specify your own CAIP Chain ID to rpc endpoint mapping
      'eip155:1': 'https://mainnet.example.io/rpc',
      'eip155:137': 'https://polygon-mainnet.example.io/rpc',
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
    preferExtension: true, // Prefer browser extension over mobile QR
    showInstallModal: false, // Show modal to install extension
    headless: false, // Set true for custom QR UI
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

## TypeScript

This package is written in TypeScript and includes full type definitions. No additional `@types` package is required.

## API Reference

### `createMultichainClient(options)`

Factory function to create a new Multichain SDK instance.

#### Parameters

| Option                      | Type                                          | Required | Description                                    |
| --------------------------- | --------------------------------------------- | -------- | ---------------------------------------------- |
| `dapp.name`                 | `string`                                      | Yes      | Name of your dApp                              |
| `api.supportedNetworks`     | `RpcUrlsMap`                                  | Yes      | Map of CAIP chain IDs to RPC URLs              |
| `dapp.url`                  | `string`                                      | No       | URL of your dApp                               |
| `dapp.iconUrl`              | `string`                                      | No       | Icon URL for your dApp                         |
| `dapp.base64Icon`           | `string`                                      | No       | Base64-encoded icon (alternative to iconUrl)   |
| `storage`                   | `StoreClient`                                 | No       | Custom storage adapter                         |
| `ui.factory`                | `BaseModalFactory`                            | No       | Custom modal factory                           |
| `ui.headless`               | `boolean`                                     | No       | Run without UI (for custom QR implementations) |
| `ui.preferExtension`        | `boolean`                                     | No       | Prefer browser extension (default: true)       |
| `ui.showInstallModal`       | `boolean`                                     | No       | Show installation modal                        |
| `mobile.preferredOpenLink`  | `(deeplink: string, target?: string) => void` | No       | Custom deeplink handler                        |
| `mobile.useDeeplink`        | `boolean`                                     | No       | Use `metamask://` instead of universal links   |
| `analytics.integrationType` | `string`                                      | No       | Integration type for analytics                 |
| `transport.extensionId`     | `string`                                      | No       | Custom extension ID                            |
| `transport.onNotification`  | `(notification: unknown) => void`             | No       | Notification handler                           |
| `debug`                     | `boolean`                                     | No       | Enable debug logging                           |

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

**Parameters**

| Name                | Type                | Required | Description                                                                                             |
| ------------------- | ------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `scopes`            | `Scope[]`           | Yes      | Array of CAIP-2 chain identifiers to request permission for                                             |
| `caipAccountIds`    | `CaipAccountId[]`   | Yes      | Array of CAIP-10 account identifiers to request (pass `[]` if no specific accounts should be requested) |
| `sessionProperties` | `SessionProperties` | No       | Additional session properties                                                                           |
| `forceRequest`      | `boolean`           | No       | Force a new connection request even if already connected                                                |

**Returns**

`Promise<void>`

```typescript
await sdk.connect(
  ['eip155:1', 'eip155:137'], // Chain scopes to request
  ['eip155:1:0x...'], // Specific accounts to request
);
```

##### `disconnect()`

Disconnects from the wallet and cleans up resources.

**Parameters**

None.

**Returns**

`Promise<void>`

```typescript
await sdk.disconnect();
```

##### `invokeMethod(options)`

Invokes an RPC method on a specific chain.

**Parameters**

| Name                     | Type        | Required | Description                                         |
| ------------------------ | ----------- | -------- | --------------------------------------------------- |
| `options.scope`          | `Scope`     | Yes      | The CAIP-2 chain identifier to invoke the method on |
| `options.request.method` | `string`    | Yes      | The RPC method name                                 |
| `options.request.params` | `unknown[]` | No       | The method parameters                               |

**Returns**

`Promise<Json>` - The result of the RPC method call.

```typescript
const result = await sdk.invokeMethod({
  scope: 'eip155:1',
  request: {
    method: 'eth_getBalance',
    params: ['0x...', 'latest'],
  },
});
```

#### Properties

| Property    | Type                  | Description                                                                                   |
| ----------- | --------------------- | --------------------------------------------------------------------------------------------- |
| `status`    | `ConnectionStatus`    | Connection status ( `'loaded'`, `'pending'`, `'connecting'`, `'connected'`, `'disconnected'`) |
| `provider`  | `MultichainApiClient` | Multichain API client                                                                         |
| `transport` | `ExtendedTransport`   | Active transport layer                                                                        |

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

**Parameters**

| Name      | Type       | Required | Description                                               |
| --------- | ---------- | -------- | --------------------------------------------------------- |
| `event`   | `string`   | Yes      | The event name to listen for                              |
| `handler` | `Function` | Yes      | The callback function to invoke when the event is emitted |

**Returns**

`void`

##### `off(event, handler)`

Removes an event handler.

**Parameters**

| Name      | Type       | Required | Description                          |
| --------- | ---------- | -------- | ------------------------------------ |
| `event`   | `string`   | Yes      | The event name to stop listening for |
| `handler` | `Function` | Yes      | The callback function to remove      |

**Returns**

`void`

##### `emit(event, args)`

Emits an event to all registered handlers.

**Parameters**

| Name    | Type     | Required | Description                             |
| ------- | -------- | -------- | --------------------------------------- |
| `event` | `string` | Yes      | The event name to emit                  |
| `args`  | `any`    | No       | Arguments to pass to the event handlers |

**Returns**

`void`

---

### Utilities

#### `getInfuraRpcUrls(infuraApiKey)`

Generates Infura RPC URLs for common networks keyed by CAIP Chain ID.

**Parameters**

| Name           | Type     | Required | Description         |
| -------------- | -------- | -------- | ------------------- |
| `infuraApiKey` | `string` | Yes      | Your Infura API key |

**Returns**

A Record of CAIP chain IDs to Infura RPC URLs. Includes Ethereum, Linea, Polygon, Optimism, Arbitrum, Palm, Avalanche, Aurora, and Celo networks.

```typescript
import { getInfuraRpcUrls } from '@metamask/connect-multichain';

const rpcUrls = getInfuraRpcUrls('YOUR_INFURA_KEY');
// {
//   'eip155:1': 'https://mainnet.infura.io/v3/YOUR_KEY',
//   'eip155:137': 'https://polygon-mainnet.infura.io/v3/YOUR_KEY',
//   'eip155:11155111': 'https://sepolia.infura.io/v3/YOUR_KEY',
//   ...
// }
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

## Standards

- [CAIP-25](https://chainagnostic.org/CAIPs/caip-25) (please see CAIP Multichain API)
- [CAIP-27](https://chainagnostic.org/CAIPs/caip-27)
- [CAIP-2](https://chainagnostic.org/CAIPs/caip-2)
- [CAIP-10](https://chainagnostic.org/CAIPs/caip-10)
- [CAIP-217](https://chainagnostic.org/CAIPs/caip-217)
- [CAIP-316](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-316.md)
- [CAIP-312](https://chainagnostic.org/CAIPs/caip-312)
- [CAIP-311](https://chainagnostic.org/CAIPs/caip-311)
- [CAIP-285](https://chainagnostic.org/CAIPs/caip-285)
- [CAIP Multichain API](https://github.com/MetaMask/metamask-improvement-proposals/blob/main/MIPs/mip-5.md)

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/connect-monorepo#readme).

## License

MIT
