import { registerPackageVersion } from '@metamask/connect-multichain';

declare const __PACKAGE_VERSION__: string;

registerPackageVersion('connect-solana', __PACKAGE_VERSION__);

export { createSolanaClient } from './connect';
export type {
  SolanaClient,
  SolanaConnectOptions,
  SolanaNetwork,
  SolanaSupportedNetworks,
} from './types';
