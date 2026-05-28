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

export const CHAIN_METHODS = ['eth_chainId'];

export const INTERCEPTABLE_METHODS = [
  ...ACCOUNTS_METHODS,
  ...IGNORED_METHODS,
  ...CONNECT_METHODS,
  ...CHAIN_METHODS,
  // These have bespoke handlers
  'wallet_revokePermissions',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
];

/**
 * Session property key used to signal that the connection originated from an
 * EIP-1193-compatible client (i.e. `@metamask/connect-evm`).
 *
 * Wallets receiving a `wallet_createSession` request can use this property to
 * apply EIP-1193-specific UX (e.g. rendering a network picker on the dapp
 * connection bar) that does not apply to pure Multichain API connections or
 * other provider types like Solana Wallet Standard.
 */
export const EIP1193_COMPATIBLE_SESSION_PROPERTY = 'eip1193-compatible';

/**
 * Session properties sent on every `wallet_createSession` request issued by
 * `@metamask/connect-evm` to identify the connection as EIP-1193-compatible.
 */
export const CONNECT_EVM_SESSION_PROPERTIES = {
  [EIP1193_COMPATIBLE_SESSION_PROPERTY]: true,
} as const;
