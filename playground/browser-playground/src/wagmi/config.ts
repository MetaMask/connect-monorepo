import { createConfig, http } from 'wagmi';
import { mainnet, sepolia, optimism, celo } from 'wagmi/chains';

import { metaMask } from './metamask-connector';

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, optimism, celo],
  connectors: [
    metaMask({
      dapp: {
        name: window.location.hostname,
        url: window.location.href,
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
