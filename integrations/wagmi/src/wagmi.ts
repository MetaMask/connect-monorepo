import { createConfig, http } from 'wagmi';
import { celo, mainnet, optimism, sepolia } from 'wagmi/chains';

import { metaMask } from '../metamask-connector';

export const config = createConfig({
  chains: [mainnet, sepolia, optimism, celo],
  connectors: [
    metaMask({ dapp: { name: 'Wagmi Demo', url: 'http://localhost:5173' } }),
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
    config: typeof config;
  }
}
