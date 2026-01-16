// Ensure polyfills are loaded first (especially window.addEventListener)
import '../../polyfills';

import { Linking } from 'react-native';
import { createConfig, http } from 'wagmi';
import { mainnet, sepolia, optimism, celo } from 'wagmi/chains';

// Auto-generated file with @ts-nocheck - types are ignored
import { metaMask } from './metamask-connector';

// Use window polyfill for React Native
// The polyfill is set up in polyfills.ts
const windowHostname = typeof window !== 'undefined' ? window.location.hostname : 'react-native-playground';
const windowHref = typeof window !== 'undefined' ? window.location.href : 'react-native-playground://';

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, optimism, celo],
  connectors: [
    metaMask({
      dapp: {
        name: windowHostname,
        url: windowHref,
      },
      // React Native: use Linking.openURL for deeplinks instead of window.location.href
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
    [optimism.id]: http(),
    [celo.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
