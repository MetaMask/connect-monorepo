import { registerPackageVersion } from '@metamask/connect-multichain';

import pkg from '../package.json';

registerPackageVersion('connect-solana', pkg.version);

export { createSolanaClient } from './connect';
export type {
  SolanaClient,
  SolanaConnectOptions,
  SolanaNetwork,
  SolanaSupportedNetworks,
} from './types';
