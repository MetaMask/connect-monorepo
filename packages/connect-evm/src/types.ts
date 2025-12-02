// Basic types redefined to avoid importing @metamask/utils due to Buffer dependency
import type { MultichainCore } from '@metamask/connect-multichain';

export type Hex = `0x${string}`;
export type Address = Hex;
export type CaipAccountId = `${string}:${string}:${string}`;
export type CaipChainId = `${string}:${string}`;

export type EIP1193ProviderEvents = {
  connect: [{ chainId: string }];
  disconnect: [];
  accountsChanged: [Address[]];
  chainChanged: [Hex];
  message: [{ type: string; data: unknown }];
  connectAndSign: [
    { accounts: readonly Address[]; chainId: number; signResponse: string },
  ];
  connectWith: [
    {
      accounts: readonly Address[];
      chainId: number;
      connectWithResponse: unknown;
    },
  ];
};

export type EventHandlers = {
  connect: (result: { chainId: string, accounts: Address[] }) => void;
  disconnect: () => void;
  accountsChanged: (accounts: Address[]) => void;
  chainChanged: (chainId: Hex) => void;
  connectAndSign: (result: {
    accounts: readonly Address[];
    chainId: number;
    signResponse: string;
  }) => void;
  connectWith: (result: {
    accounts: readonly Address[];
    chainId: number;
    connectWithResponse: unknown;
  }) => void;
};

export type MetamaskConnectEVMOptions = {
  core: MultichainCore;
  eventHandlers?: Partial<EventHandlers>;
  notificationQueue?: unknown[];
  supportedNetworks?: Record<CaipChainId, string>;
};

export type AddEthereumChainParameter = {
  chainId?: string;
  chainName?: string;
  nativeCurrency?: {
    name?: string;
    symbol?: string;
    decimals?: number;
  };
  rpcUrls?: string[];
  blockExplorerUrls?: string[];
  iconUrls?: string[];
};

// Specific provider request types
type ConnectRequest = {
  method: 'wallet_requestPermissions' | 'eth_requestAccounts';
  params: [chainId?: number, account?: string];
};

type RevokePermissionsRequest = {
  method: 'wallet_revokePermissions';
  params: unknown[];
};

type SwitchEthereumChainRequest = {
  method: 'wallet_switchEthereumChain';
  params: [{ chainId: string }];
};

type AddEthereumChainRequest = {
  method: 'wallet_addEthereumChain';
  params: [AddEthereumChainParameter];
};

type AccountsRequest = {
  method: 'eth_accounts' | 'eth_coinbase';
  params: [];
};

type GenericProviderRequest = {
  method: Exclude<
    string,
    | 'wallet_requestPermissions'
    | 'eth_requestAccounts'
    | 'eth_accounts'
    | 'eth_coinbase'
    | 'wallet_revokePermissions'
    | 'wallet_switchEthereumChain'
    | 'wallet_addEthereumChain'
  >;
  params?: unknown;
};

// Discriminated union for provider requests
export type ProviderRequest =
  | ConnectRequest
  | RevokePermissionsRequest
  | SwitchEthereumChainRequest
  | AddEthereumChainRequest
  | AccountsRequest
  | GenericProviderRequest;

export type ProviderRequestInterceptor = (
  req: ProviderRequest,
) => Promise<unknown>;
