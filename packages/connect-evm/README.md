# `@metamask/connect-evm`

> EIP-1193 compatible interface for connecting to MetaMask and interacting with Ethereum Virtual Machine (EVM) networks.

`@metamask/connect-evm` provides a modern replacement for MetaMask SDK V1, offering enhanced functionality and cross-platform compatibility. It wraps the Multichain SDK to provide a simplified, EIP-1193 compliant API for dapp developers.

## Features

- **EIP-1193 Provider Interface** - Seamless integration with existing dapp code using the standard Ethereum provider interface
- **Cross-Platform Support** - Works with browser extensions and mobile applications
- **React Native Support** - Native mobile deeplink handling via `preferredOpenLink` option

## Installation

```bash
yarn add @metamask/connect-evm
```

or

```bash
npm install @metamask/connect-evm
```

## Usage

### Quick Start

```typescript
import { createEVMClient, getInfuraRpcUrls } from '@metamask/connect-evm';

const client = await createEVMClient({
  dapp: {
    name: 'My DApp',
    url: 'https://mydapp.com',
  },
  api: {
    supportedNetworks: {
      // use the `getInfuraRpcUrls` helper to generate a map of Infura RPC endpoints
      ...getInfuraRpcUrls(INFURA_API_KEY),
      // or specify your own CAIP Chain ID to rpc endpoint mapping
      // Hex chain IDs mapped to RPC URLs
      '0x1': 'https://mainnet.infura.io/v3/YOUR_KEY', // Ethereum Mainnet
      '0x89': 'https://polygon-mainnet.infura.io/v3/YOUR_KEY', // Polygon
    },
  },
});

// Connect to MetaMask
let accounts, chainId;
try {
  ({ accounts, chainId } = await client.connect({ chainIds: ['0x1', '0x89'] })); // Connect to Ethereum Mainnet and Polygon
} catch (error) {
  if (error.code === 4001) {
    console.log('User rejected the connection request');
  } else if (error.code === -32002) {
    console.log('Connection request already pending');
  }
}
console.log({ accounts }); // The connected accounts where the first account is the selected account
console.log({ chainId }); // The currently active chainId

// Get the EIP-1193 provider
const provider = client.getProvider();

// Sign a message
const signedMessage = await provider.request({
  method: 'personal_sign',
  params: ['0x0', accounts[0]],
});
```

### React Native Support

When using `@metamask/connect-evm` in React Native, the standard browser deeplink mechanism (`window.location.href`) doesn't work. Instead, you can provide a custom `preferredOpenLink` function via the `mobile` option to handle deeplinks using React Native's `Linking` API.

```typescript
import { Linking } from 'react-native';
import { createEVMClient } from '@metamask/connect-evm';

const client = await createEVMClient({
  dapp: {
    name: 'My React Native DApp',
    url: 'https://mydapp.com',
  },
  api: {
    // Chain IDs are specified in hex format
    supportedNetworks: {
      '0x1': 'https://mainnet.infura.io/v3/YOUR_KEY',
    },
  },
  // React Native: use Linking.openURL for deeplinks
  mobile: {
    preferredOpenLink: (deeplink: string) => {
      Linking.openURL(deeplink).catch((err) => {
        console.error('Failed to open deeplink:', err);
      });
    },
  },
});
```

The `mobile.preferredOpenLink` option is checked before falling back to browser-based deeplink methods, making it the recommended approach for React Native applications.

### Using the Provider Directly

```typescript
const provider = client.getProvider();

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

Check out the [playground examples](../../playground/browser-playground) for a complete React implementation.

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

## TypeScript

This package is written in TypeScript and includes full type definitions. No additional `@types` package is required.

## API Reference

### `createEVMClient(options)`

Factory function to create a new MetaMask Connect EVM instance.

#### Parameters

| Option                     | Type                                          | Required | Description                                          |
| -------------------------- | --------------------------------------------- | -------- | ---------------------------------------------------- |
| `dapp.name`                | `string`                                      | Yes      | Name of your dApp                                    |
| `api.supportedNetworks`    | `Record<Hex, string>`                         | Yes      | Map of hex chain IDs to RPC URLs                     |
| `dapp.url`                 | `string`                                      | No       | URL of your dApp                                     |
| `dapp.iconUrl`             | `string`                                      | No       | Icon URL for your dApp                               |
| `ui.headless`              | `boolean`                                     | No       | Run without UI (for custom QR implementations)       |
| `ui.preferExtension`       | `boolean`                                     | No       | Prefer browser extension over mobile (default: true) |
| `ui.showInstallModal`      | `boolean`                                     | No       | Show installation modal for desktop                  |
| `mobile.preferredOpenLink` | `(deeplink: string, target?: string) => void` | No       | Custom deeplink handler                              |
| `mobile.useDeeplink`       | `boolean`                                     | No       | Use `metamask://` instead of universal links         |
| `transport.extensionId`    | `string`                                      | No       | Custom extension ID                                  |
| `transport.onNotification` | `(notification: unknown) => void`             | No       | Notification handler                                 |
| `eventHandlers`            | `Partial<EventHandlers>`                      | No       | Event handlers for provider events                   |
| `debug`                    | `boolean`                                     | No       | Enable debug logging                                 |

#### Returns

`Promise<MetamaskConnectEVM>` - A fully initialized SDK instance.

```typescript
const client = await createEVMClient({
  dapp: { name: 'My DApp', url: 'https://mydapp.com' },
  api: {
    supportedNetworks: {
      '0x1': 'https://mainnet.infura.io/v3/KEY',
      '0x89': 'https://polygon-mainnet.infura.io/v3/KEY',
    },
  },
  eventHandlers: {
    accountsChanged: (accounts) => console.log('Accounts:', accounts),
    chainChanged: (chainId) => console.log('Chain:', chainId),
  },
  debug: true,
});
```

---

### `MetamaskConnectEVM`

The main SDK class providing EVM connectivity.

#### Methods

##### `connect(options?)`

Connects to MetaMask wallet.

**Parameters**

| Name                   | Type      | Required | Description                                                                              |
| ---------------------- | --------- | -------- | ---------------------------------------------------------------------------------------- |
| `options.chainIds`     | `Hex[]`   | No       | Array of hex chain IDs to request permission for (defaults to `['0x1']` if not provided) |
| `options.account`      | `string`  | No       | Specific account address to connect                                                      |
| `options.forceRequest` | `boolean` | No       | Force a new connection request even if already connected                                 |

**Returns**

`Promise<{ accounts: Address[]; chainId: Hex }>` - The connected accounts and active chain ID.

```typescript
const { accounts, chainId } = await client.connect({
  chainIds: ['0x1', '0x89'], // Ethereum Mainnet and Polygon
  account: '0x...',
  forceRequest: false,
});
```

##### `connectAndSign(options)`

Connects and immediately signs a message using `personal_sign`.

**Parameters**

| Name               | Type     | Required | Description                                         |
| ------------------ | -------- | -------- | --------------------------------------------------- |
| `options.message`  | `string` | Yes      | The message to sign after connecting                |
| `options.chainIds` | `Hex[]`  | No       | Hex chain IDs to connect to (defaults to `['0x1']`) |

**Returns**

`Promise<string>` - The signature as a hex string.

```typescript
const signature = await client.connectAndSign({
  message: 'Sign this message',
  chainIds: ['0x1'],
});
```

##### `connectWith(options)`

Connects and immediately invokes a method with specified parameters.

**Parameters**

| Name                   | Type                                             | Required | Description                                                                             |
| ---------------------- | ------------------------------------------------ | -------- | --------------------------------------------------------------------------------------- |
| `options.method`       | `string`                                         | Yes      | The RPC method name to invoke                                                           |
| `options.params`       | `unknown[] \| ((account: Address) => unknown[])` | Yes      | Method parameters, or a function that receives the connected account and returns params |
| `options.chainIds`     | `Hex[]`                                          | No       | Hex chain IDs to connect to (defaults to `['0x1']`)                                     |
| `options.account`      | `string`                                         | No       | Specific account to connect                                                             |
| `options.forceRequest` | `boolean`                                        | No       | Force a new connection request                                                          |

**Returns**

`Promise<unknown>` - The result of the method invocation.

```typescript
const result = await client.connectWith({
  method: 'eth_sendTransaction',
  params: (account) => [
    {
      from: account,
      to: '0x...',
      value: '0x1',
    },
  ],
  chainIds: ['0x1'],
});
```

##### `disconnect()`

Disconnects from the wallet and cleans up resources.

**Parameters**

None.

**Returns**

`Promise<void>`

```typescript
await client.disconnect();
```

##### `switchChain(options)`

Switches to a different chain. Will attempt to add the chain if not configured in the wallet.

**Parameters**

| Name                         | Type                        | Required | Description                                               |
| ---------------------------- | --------------------------- | -------- | --------------------------------------------------------- |
| `options.chainId`            | `Hex`                       | Yes      | The hex chain ID to switch to                             |
| `options.chainConfiguration` | `AddEthereumChainParameter` | No       | Chain configuration to use if the chain needs to be added |

**Returns**

`Promise<void>`

```typescript
await client.switchChain({
  chainId: '0x89',
  chainConfiguration: {
    chainId: '0x89',
    chainName: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com'],
  },
});
```

##### `getProvider()`

Returns the EIP-1193 provider instance.

**Parameters**

None.

**Returns**

`EIP1193Provider` - The EIP-1193 compliant provider.

```typescript
const provider = client.getProvider();
```

##### `getChainId()`

Returns the currently selected chain ID.

**Parameters**

None.

**Returns**

`Hex | undefined` - The currently selected chain ID as a hex string, or undefined if not connected.

```typescript
const chainId = client.getChainId(); // e.g., '0x1'
```

##### `getAccount()`

Returns the currently selected account.

**Parameters**

None.

**Returns**

`Address | undefined` - The currently selected account address, or undefined if not connected.

```typescript
const account = client.getAccount(); // e.g., '0x...'
```

#### Properties

| Property          | Type                   | Description                                                                                   |
| ----------------- | ---------------------- | --------------------------------------------------------------------------------------------- |
| `accounts`        | `Address[]`            | Currently permitted accounts                                                                  |
| `selectedAccount` | `Address \| undefined` | Currently selected account                                                                    |
| `selectedChainId` | `Hex \| undefined`     | Currently selected chain ID (hex)                                                             |
| `status`          | `ConnectionStatus`     | Connection status ( `'loaded'`, `'pending'`, `'connecting'`, `'connected'`, `'disconnected'`) |

---

### `EIP1193Provider`

EIP-1193 compliant provider for making Ethereum JSON-RPC requests.

#### Methods

##### `request(args)`

Makes an Ethereum JSON-RPC request.

**Parameters**

| Name          | Type      | Required | Description           |
| ------------- | --------- | -------- | --------------------- |
| `args.method` | `string`  | Yes      | The RPC method name   |
| `args.params` | `unknown` | No       | The method parameters |

**Returns**

`Promise<unknown>` - The result of the RPC call.

```typescript
const result = await provider.request({
  method: 'eth_getBalance',
  params: ['0x...', 'latest'],
});
```

##### `sendAsync(request, callback?)` _(deprecated)_

Legacy method for JSON-RPC requests with callback support.

**Parameters**

| Name              | Type               | Required | Description                |
| ----------------- | ------------------ | -------- | -------------------------- |
| `request.method`  | `string`           | Yes      | The RPC method name        |
| `request.params`  | `unknown`          | No       | The method parameters      |
| `request.id`      | `number \| string` | No       | Request ID (defaults to 1) |
| `request.jsonrpc` | `'2.0'`            | No       | JSON-RPC version           |
| `callback`        | `JsonRpcCallback`  | No       | Optional callback function |

**Returns**

`Promise<JsonRpcResponse> | void` - Returns a promise if no callback is provided, otherwise void.

```typescript
provider.sendAsync(
  { method: 'eth_accounts', params: [] },
  (error, response) => {
    if (error) console.error(error);
    else console.log(response.result);
  },
);
```

##### `send(request, callback)` _(deprecated)_

Legacy synchronous-style method for JSON-RPC requests.

**Parameters**

| Name             | Type              | Required | Description                               |
| ---------------- | ----------------- | -------- | ----------------------------------------- |
| `request.method` | `string`          | Yes      | The RPC method name                       |
| `request.params` | `unknown`         | No       | The method parameters                     |
| `callback`       | `JsonRpcCallback` | Yes      | Callback function to receive the response |

**Returns**

`void`

#### Events

The provider extends `EventEmitter` and emits standard EIP-1193 events:

| Event             | Payload                           | Description                            |
| ----------------- | --------------------------------- | -------------------------------------- |
| `connect`         | `{ chainId: string }`             | Emitted when connected                 |
| `disconnect`      | -                                 | Emitted when disconnected              |
| `accountsChanged` | `Address[]`                       | Emitted when accounts change           |
| `chainChanged`    | `Hex`                             | Emitted when chain changes             |
| `message`         | `{ type: string, data: unknown }` | Emitted for provider messages          |
| `display_uri`     | `string`                          | Emitted with QR code URI for custom UI |

```typescript
provider.on('accountsChanged', (accounts) => {
  console.log('New accounts:', accounts);
});

provider.on('chainChanged', (chainId) => {
  console.log('New chain:', chainId);
});

provider.on('display_uri', (uri) => {
  // Display custom QR code with this URI
});
```

#### Properties

| Property          | Type                   | Description                                        |
| ----------------- | ---------------------- | -------------------------------------------------- |
| `accounts`        | `Address[]`            | Currently permitted accounts                       |
| `selectedAccount` | `Address \| undefined` | Currently selected account                         |
| `selectedChainId` | `Hex \| undefined`     | Currently selected chain ID                        |
| `chainId`         | `Hex \| undefined`     | Alias for `selectedChainId` (legacy compatibility) |

---

### `getInfuraRpcUrls(infuraApiKey)`

Helper function to generate EVM Infura RPC URLs for common networks keyed by hex chain ID.

**Parameters**

| Name           | Type     | Required | Description         |
| -------------- | -------- | -------- | ------------------- |
| `infuraApiKey` | `string` | Yes      | Your Infura API key |

**Returns**

A map of hex chain IDs to Infura RPC URLs. See https://docs.metamask.io/services

```typescript
import { getInfuraRpcUrls } from '@metamask/connect-evm';

const rpcUrls = getInfuraRpcUrls('YOUR_INFURA_KEY');
// Returns: { '0x1': 'https://mainnet.infura.io/v3/KEY', ... }
```

---

### Types

#### `EventHandlers`

```typescript
type EventHandlers = {
  connect: (result: { chainId: Hex }) => void;
  disconnect: () => void;
  accountsChanged: (accounts: Address[]) => void;
  chainChanged: (chainId: Hex) => void;
  displayUri: (uri: string) => void;
  connectAndSign: (result: {
    accounts: Address[];
    chainId: Hex;
    signResponse: string;
  }) => void;
  connectWith: (result: {
    accounts: Address[];
    chainId: Hex;
    connectWithResponse: unknown;
  }) => void;
};
```

#### `AddEthereumChainParameter`

```typescript
type AddEthereumChainParameter = {
  chainId?: string;
  chainName?: string;
  nativeCurrency?: {
    name?: string;
    symbol?: string;
    decimals?: number;
  };
  rpcUrls?: string[];
  blockExplorerUrls?: string[];
  iconUrls?: string[];
};
```

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/connect-monorepo#readme).

## License

MIT
