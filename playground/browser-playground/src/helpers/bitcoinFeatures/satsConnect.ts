import type { BitcoinProvider } from 'sats-connect';

export const BitcoinSatsConnect = 'sats-connect:';

export type BitcoinSatsConnectFeature = {
  [BitcoinSatsConnect]: {
    provider: BitcoinProvider;
  };
};
