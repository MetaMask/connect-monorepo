// Re-export all constants
export { WINDOW_POST_MESSAGE_ID, METAMASK_PROD_CHROME_ID } from './config';

export { FEATURED_NETWORKS, getNetworkName } from './networks';

export {
  METHODS_REQUIRING_PARAM_INJECTION,
  injectParams,
  KnownWalletRpcMethods,
  WalletEip155Methods,
  Eip155Notifications,
  Eip155Methods,
} from './methods';
