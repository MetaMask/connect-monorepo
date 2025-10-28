export const IGNORED_METHODS = [
  'metamask_getProviderState',
  'metamask_sendDomainMetadata',
  'metamask_logWeb3ShimUsage',
  'wallet_registerOnboarding',
  'net_version',
  'wallet_getPermissions',
];

export const CONNECT_METHODS = [
  'wallet_requestPermissions',
  'eth_requestAccounts',
];

export const ACCOUNTS_METHODS = ['eth_accounts', 'eth_coinbase'];

export const INTERCEPTABLE_METHODS = [
  ...ACCOUNTS_METHODS,
  ...IGNORED_METHODS,
  ...CONNECT_METHODS,
  // These have bespoke handlers
  'wallet_revokePermissions',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
];

// Default chain ID for EIP-155
export const MAINNET_CHAIN_ID = '0x1';
