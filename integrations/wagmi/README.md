# Wagmi MetaMask Connector

A reference implementation of [Metamask's Wagmi connector](https://github.com/wevm/wagmi/blob/main/packages/connectors/src/metaMask.ts) and a port of [Wagmi's React Playground](https://github.com/wevm/wagmi/tree/main/playgrounds/vite-react).

## Setup

> [!IMPORTANT]
> Follow the steps on the root [README](../../README.md) first.

- `yarn dev` to run the app in localhost.
- `yarn dev --host` to run and listen on all addresses, including LAN and public IP (useful for mobile physical devices)

## React Native Support

The wagmi connector supports React Native via the `mobile.preferredOpenLink` option. This is required because React Native doesn't have `window.location.href` for opening deeplinks.

### Configuration

```typescript
import { Linking } from 'react-native';
import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { metaMask } from './metamask-connector';

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    metaMask({
      dapp: {
        name: 'My React Native DApp',
        url: 'https://mydapp.com',
      },
      // React Native: use Linking.openURL for deeplinks
      mobile: {
        preferredOpenLink: (deeplink: string) => {
          Linking.openURL(deeplink).catch((err) => {
            console.error('Failed to open deeplink:', err);
          });
        },
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});
```

### How It Works

When the wagmi connector initiates a connection to MetaMask, `connect-multichain` needs to open a deeplink to the MetaMask mobile app. The `mobile.preferredOpenLink` function is called with the deeplink URL, allowing you to use React Native's `Linking.openURL()` instead of the browser's `window.location.href`.
