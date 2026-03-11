import { registerPackageVersion } from '@metamask/connect-multichain';

import pkg from '../package.json';

registerPackageVersion('connect-evm', pkg.version);

export { getInfuraRpcUrls } from './utils/infura';
export { createEVMClient, type MetamaskConnectEVM } from './connect';
export type { EIP1193Provider } from './provider';

export type * from './types';
