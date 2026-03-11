import { registerPackageVersion } from '@metamask/connect-multichain';

declare const __PACKAGE_VERSION__: string;

registerPackageVersion('connect-evm', __PACKAGE_VERSION__);

export { getInfuraRpcUrls } from './utils/infura';
export { createEVMClient, type MetamaskConnectEVM } from './connect';
export type { EIP1193Provider } from './provider';

export type * from './types';
