// Basic types redefined to avoid importing @metamask/utils due to Buffer dependency
import type { MultichainCore } from '@metamask/connect-multichain';

export type Hex = `0x${string}`;
export type Address = Hex;
export type CaipAccountId = `${string}:${string}:${string}`;
export type CaipChainId = `${string}:${string}`;

export type EIP1193ProviderEvents = {
  connect: [{ chainId: Hex; accounts: Address[] }];
  disconnect: [];
  accountsChanged: [Address[]];
  chainChanged: [Hex];
  message: [{ type: string; data: unknown }];
  /**
   * Emitted when a QR code URI is available for display.
   * This allows consumers to show their own custom QR code UI.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  display_uri: [string];
  connectAndSign: [
    { accounts: readonly Address[]; chainId: Hex; signResponse: string },
  ];
  connectWith: [
    {
      accounts: readonly Address[];
      chainId: Hex;
      connectWithResponse: unknown;
    },
  ];
};

export type EventHandlers = {
  connect: (result: { chainId: string; accounts: Address[] }) => void;
  disconnect: () => void;
  accountsChanged: (accounts: Address[]) => void;
  chainChanged: (chainId: Hex) => void;
  displayUri: (uri: string) => void;
  connectAndSign: (result: {
    accounts: readonly Address[];
    chainId: Hex;
    signResponse: string;
  }) => void;
  connectWith: (result: {
    accounts: readonly Address[];
    chainId: Hex;
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
  params: [chainId?: Hex, account?: string];
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

// JSON-RPC types for legacy compatibility (sendAsync/send)
// eslint-disable-next-line @typescript-eslint/naming-convention -- T is standard type parameter
export type JsonRpcRequest<T = unknown> = {
  id?: number | string;
  jsonrpc?: '2.0';
  method: string;
  params?: T;
};

// eslint-disable-next-line @typescript-eslint/naming-convention -- T is standard type parameter
export type JsonRpcResponse<T = unknown> = {
  id: number | string;
  jsonrpc: '2.0';
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

// eslint-disable-next-line @typescript-eslint/naming-convention -- T is standard type parameter
export type JsonRpcCallback<T = unknown> = (
  error: Error | null,
  response: JsonRpcResponse<T> | null,
) => void;
