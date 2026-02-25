/* eslint-disable no-restricted-globals -- React Native polyfills window */
/* eslint-disable no-negated-condition -- Clearer pattern for undefined checks */
/* eslint-disable import-x/no-unassigned-import -- Polyfill import */

// Ensure polyfills are loaded first (especially window.addEventListener)
import '../../polyfills';

import { Linking } from 'react-native';
import { createConfig, http } from 'wagmi';
import { mainnet, sepolia, optimism, celo } from 'wagmi/chains';

// Auto-generated file with @ts-nocheck - types are ignored
import { metaMask } from './metamask-connector';

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, optimism, celo],
  connectors: [
    metaMask({
      dapp: {
        name: 'react-native-playground',
        url: 'https://playground.metamask.io', // verify if protocol is required
      },
      // React Native: use Linking.openURL for deeplinks instead of window.location.href
      mobile: {
        preferredOpenLink: (deeplink: string) => {
          Linking.openURL(deeplink).catch((error) => {
            console.error('Failed to open deeplink:', error);
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
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    config: typeof wagmiConfig;
  }
}
