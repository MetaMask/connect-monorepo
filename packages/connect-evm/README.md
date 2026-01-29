# `@metamask/connect-evm`

> EIP-1193 compatible interface for connecting to MetaMask and interacting with Ethereum Virtual Machine (EVM) networks.

`@metamask/connect-evm` provides a modern replacement for MetaMask SDK V1, offering enhanced functionality and cross-platform compatibility. It wraps the Multichain SDK to provide a simplified, EIP-1193 compliant API for dapp developers.

## Features

- **EIP-1193 Provider Interface** - Seamless integration with existing dapp code using the standard Ethereum provider interface
- **Cross-Platform Support** - Works with browser extensions and mobile applications
- **React Native Support** - Native mobile deeplink handling via `preferredOpenLink` option

## Installation

```bash
npm install @metamask/connect-evm
```

## Quick Start

```typescript
import { createEVMClient } from '@metamask/connect-evm';

// Create an SDK instance
const sdk = await createEVMClient({
  dapp: {
    name: 'My DApp',
    url: 'https://mydapp.com',
  },
  api: {
    supportedNetworks: {
      'eip155:1': 'https://mainnet.infura.io/v3/YOUR_KEY',
    },
  },
});

// Connect to MetaMask
await sdk.connect({ chainIds: [1] }); // Connect to Ethereum Mainnet

// Get the EIP-1193 provider
const provider = sdk.getProvider();

// Request accounts
const accounts = await provider.request({
  method: 'eth_accounts',
});
```

## Usage

### Basic Connection

```typescript
import { createEVMClient, getInfuraRpcUrls } from '@metamask/connect-evm';

const sdk = await createEVMClient({
  dapp: {
    name: 'My DApp',
    url: 'https://mydapp.com',
  },
  api: {
    supportedNetworks: {
      // use the `getInfuraRpcUrls` helper to generate a map of Infura RPC endpoints
      ...getInfuraRpcUrls(INFURA_API_KEY),
      // or specify your own CAIP Chain ID to rpc endpoint mapping
      'eip155:1': 'https://mainnet.example.io/rpc'
      'eip155:137': 'https://polygon-mainnet.example.io/rpc'
    },
  },
});

// Connect with multiple chains
const { accounts, chainId } = await sdk.connect({ chainIds: [1, 137] });

// Connect to a specific chain and account
await sdk.connect({ chainIds: [1], account: '0x...' });
```

### React Native Support

When using `@metamask/connect-evm` in React Native, the standard browser deeplink mechanism (`window.location.href`) doesn't work. Instead, you can provide a custom `preferredOpenLink` function via the `mobile` option to handle deeplinks using React Native's `Linking` API.

```typescript
import { Linking } from 'react-native';
import { createEVMClient } from '@metamask/connect-evm';

const sdk = await createEVMClient({
  dapp: {
    name: 'My React Native DApp',
    url: 'https://mydapp.com',
  },
  api: {
    supportedNetworks: {
      'eip155:1': 'https://mainnet.infura.io/v3/YOUR_KEY',
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
}); // Note: see @connect-multichain for more details
```

The `mobile.preferredOpenLink` option is checked before falling back to browser-based deeplink methods, making it the recommended approach for React Native applications.

### Using the Provider Directly

```typescript
const provider = sdk.getProvider();

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

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `dapp.name` | `string` | Yes | Name of your dApp |
| `dapp.url` | `string` | No | URL of your dApp |
| `dapp.iconUrl` | `string` | No | Icon URL for your dApp |
| `api.supportedNetworks` | `Record<string, string>` | Yes | Map of CAIP chain IDs to RPC URLs |
| `ui.headless` | `boolean` | No | Run without UI (for custom QR implementations) |
| `ui.preferExtension` | `boolean` | No | Prefer browser extension over mobile (default: true) |
| `ui.showInstallModal` | `boolean` | No | Show installation modal for desktop |
| `eventHandlers` | `Partial<EventHandlers>` | No | Event handlers for provider events |
| `debug` | `boolean` | No | Enable debug logging |

#### Returns

`Promise<MetamaskConnectEVM>` - A fully initialized SDK instance.

```typescript
const sdk = await createEVMClient({
  dapp: { name: 'My DApp', url: 'https://mydapp.com' },
  api: {
    supportedNetworks: {
      'eip155:1': 'https://mainnet.infura.io/v3/KEY',
      'eip155:137': 'https://polygon-mainnet.infura.io/v3/KEY',
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

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options.chainIds` | `number[]` | Yes | Array of chain IDs to request permission for |
| `options.account` | `string` | No | Specific account address to connect |
| `options.forceRequest` | `boolean` | No | Force a new connection request even if already connected |

**Returns**

`Promise<{ accounts: Address[]; chainId: number }>` - The connected accounts and active chain ID.

```typescript
const { accounts, chainId } = await sdk.connect({
  chainIds: [1, 137],
  account: '0x...',
  forceRequest: false,
});
```

##### `connectAndSign(options)`

Connects and immediately signs a message using `personal_sign`.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options.message` | `string` | Yes | The message to sign after connecting |
| `options.chainIds` | `number[]` | No | Chain IDs to connect to (defaults to mainnet) |

**Returns**

`Promise<string>` - The signature as a hex string.

```typescript
const signature = await sdk.connectAndSign({
  message: 'Sign this message',
  chainIds: [1],
});
```

##### `connectWith(options)`

Connects and immediately invokes a method with specified parameters.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options.method` | `string` | Yes | The RPC method name to invoke |
| `options.params` | `unknown[] \| ((account: Address) => unknown[])` | Yes | Method parameters, or a function that receives the connected account and returns params |
| `options.chainIds` | `number[]` | No | Chain IDs to connect to (defaults to mainnet) |
| `options.account` | `string` | No | Specific account to connect |
| `options.forceRequest` | `boolean` | No | Force a new connection request |

**Returns**

`Promise<unknown>` - The result of the method invocation.

```typescript
const result = await sdk.connectWith({
  method: 'eth_sendTransaction',
  params: (account) => [{
    from: account,
    to: '0x...',
    value: '0x1',
  }],
  chainIds: [1],
});
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

##### `switchChain(options)`

Switches to a different chain. Will attempt to add the chain if not configured in the wallet.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options.chainId` | `number \| Hex` | Yes | The chain ID to switch to |
| `options.chainConfiguration` | `AddEthereumChainParameter` | No | Chain configuration to use if the chain needs to be added |

**Returns**

`Promise<void>`

```typescript
await sdk.switchChain({
  chainId: 137,
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
const provider = sdk.getProvider();
```

##### `getChainId()`

Returns the currently selected chain ID.

**Parameters**

None.

**Returns**

`Hex | undefined` - The currently selected chain ID as a hex string, or undefined if not connected.

```typescript
const chainId = sdk.getChainId(); // e.g., '0x1'
```

##### `getAccount()`

Returns the currently selected account.

**Parameters**

None.

**Returns**

`Address | undefined` - The currently selected account address, or undefined if not connected.

```typescript
const account = sdk.getAccount(); // e.g., '0x...'
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `accounts` | `Address[]` | Currently permitted accounts |
| `selectedAccount` | `Address \| undefined` | Currently selected account |
| `selectedChainId` | `Hex \| undefined` | Currently selected chain ID (hex) |
| `status` | `ConnectionStatus` | Connection status (`'pending'`, `'connecting'`, `'connected'`, `'disconnected'`) |

---

### `EIP1193Provider`

EIP-1193 compliant provider for making Ethereum JSON-RPC requests.

#### Methods

##### `request(args)`

Makes an Ethereum JSON-RPC request.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `args.method` | `string` | Yes | The RPC method name |
| `args.params` | `unknown` | No | The method parameters |

**Returns**

`Promise<unknown>` - The result of the RPC call.

```typescript
const result = await provider.request({
  method: 'eth_getBalance',
  params: ['0x...', 'latest'],
});
```

##### `sendAsync(request, callback?)` *(deprecated)*

Legacy method for JSON-RPC requests with callback support.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `request.method` | `string` | Yes | The RPC method name |
| `request.params` | `unknown` | No | The method parameters |
| `request.id` | `number \| string` | No | Request ID (defaults to 1) |
| `request.jsonrpc` | `'2.0'` | No | JSON-RPC version |
| `callback` | `JsonRpcCallback` | No | Optional callback function |

**Returns**

`Promise<JsonRpcResponse> | void` - Returns a promise if no callback is provided, otherwise void.

```typescript
provider.sendAsync(
  { method: 'eth_accounts', params: [] },
  (error, response) => {
    if (error) console.error(error);
    else console.log(response.result);
  }
);
```

##### `send(request, callback)` *(deprecated)*

Legacy synchronous-style method for JSON-RPC requests.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `request.method` | `string` | Yes | The RPC method name |
| `request.params` | `unknown` | No | The method parameters |
| `callback` | `JsonRpcCallback` | Yes | Callback function to receive the response |

**Returns**

`void`

#### Events

The provider extends `EventEmitter` and emits standard EIP-1193 events:

| Event | Payload | Description |
|-------|---------|-------------|
| `connect` | `{ chainId: string }` | Emitted when connected |
| `disconnect` | - | Emitted when disconnected |
| `accountsChanged` | `Address[]` | Emitted when accounts change |
| `chainChanged` | `Hex` | Emitted when chain changes |
| `message` | `{ type: string, data: unknown }` | Emitted for provider messages |
| `display_uri` | `string` | Emitted with QR code URI for custom UI |

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

| Property | Type | Description |
|----------|------|-------------|
| `accounts` | `Address[]` | Currently permitted accounts |
| `selectedAccount` | `Address \| undefined` | Currently selected account |
| `selectedChainId` | `Hex \| undefined` | Currently selected chain ID |
| `chainId` | `Hex \| undefined` | Alias for `selectedChainId` (legacy compatibility) |

---

### `getInfuraRpcUrls(infuraApiKey)`

Helper function to generate Infura RPC URLs for common networks.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `infuraApiKey` | `string` | Yes | Your Infura API key |

**Returns**

`RpcUrlsMap` - A map of CAIP chain IDs to Infura RPC URLs. Includes Ethereum, Linea, Polygon, Optimism, Arbitrum, Palm, Avalanche, Aurora, and Celo networks.

```typescript
import { getInfuraRpcUrls } from '@metamask/connect-evm';

const rpcUrls = getInfuraRpcUrls('YOUR_INFURA_KEY');
// Returns: { 'eip155:1': 'https://mainnet.infura.io/v3/KEY', ... }
```

---

### Types

#### `Hex`

Hexadecimal string type: `` `0x${string}` ``

#### `Address`

Ethereum address type (alias for `Hex`)

#### `CaipChainId`

CAIP-2 chain identifier: `` `${string}:${string}` ``

#### `CaipAccountId`

CAIP-10 account identifier: `` `${string}:${string}:${string}` ``

#### `EventHandlers`

```typescript
type EventHandlers = {
  connect: (result: { chainId: string; accounts: Address[] }) => void;
  disconnect: () => void;
  accountsChanged: (accounts: Address[]) => void;
  chainChanged: (chainId: Hex) => void;
  displayUri: (uri: string) => void;
  connectAndSign: (result: { accounts: Address[]; chainId: number; signResponse: string }) => void;
  connectWith: (result: { accounts: Address[]; chainId: number; connectWithResponse: unknown }) => void;
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
