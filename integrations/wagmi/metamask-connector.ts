import {
  createMetamaskConnectEVM,
  MetamaskConnectEVMOptions,
  type MetamaskConnectEVM,
} from '@metamask/connect-evm';
import { MultichainCore, SessionData } from '@metamask/connect-multichain';

// import type {
//   MultichainCore,
//   SDKState,
//   SessionData,
// } from '@metamask/multichain-sdk';
// import type { MetaMaskSDKOptions } from '@metamask/sdk';

import {
  ChainNotConfiguredError,
  type Connector,
  createConnector,
  extractRpcUrls,
  ProviderNotFoundError,
} from '@wagmi/core';
import type {
  Compute,
  ExactPartial,
  OneOf,
  RemoveUndefined,
  UnionCompute,
} from '@wagmi/core/internal';
import {
  type AddEthereumChainParameter,
  type Address,
  type EIP1193Provider,
  getAddress,
  type Hex,
  hexToNumber,
  numberToHex,
  type ProviderConnectInfo,
  type ProviderRpcError,
  ResourceUnavailableRpcError,
  type RpcError,
  SwitchChainError,
  UserRejectedRequestError,
  withRetry,
  withTimeout,
} from 'viem';

type MetaMaskSDK = MultichainCore;

export type MetaMaskParameters = UnionCompute<
  MetaMaskSDKOptions &
    OneOf<
      | {
          /* Shortcut to connect and sign a message */
          connectAndSign?: string | undefined;
        }
      | {
          // TODO: Strongly type `method` and `params`
          /* Allow `connectWith` any rpc method */
          connectWith?: { method: string; params: unknown[] } | undefined;
        }
    >
>;

// type WagmiMetaMaskSDKOptions = Compute<
//   ExactPartial<
//     Omit<
//       MetaMaskSDKOptions,
//       | '_source'
//       | 'forceDeleteProvider'
//       | 'forceInjectProvider'
//       | 'injectProvider'
//       | 'useDeeplink'
//       | 'readonlyRPCMap'
//     >
//   > & {
//     /** @deprecated */
//     forceDeleteProvider?: MetaMaskSDKOptions['forceDeleteProvider'];
//     /** @deprecated */
//     forceInjectProvider?: MetaMaskSDKOptions['forceInjectProvider'];
//     /** @deprecated */
//     injectProvider?: MetaMaskSDKOptions['injectProvider'];
//     /** @deprecated */
//     useDeeplink?: MetaMaskSDKOptions['useDeeplink'];
//   }
// >;

type MetaMaskSDKOptions = MetamaskConnectEVMOptions;

metaMask.type = 'metaMask' as const;
export function metaMask(parameters: MetaMaskParameters = {}) {
  type Provider = EIP1193Provider;
  type Properties = {
    onConnect(connectInfo: ProviderConnectInfo): void;
    onDisplayUri(uri: string): void;
  };
  type Listener = Parameters<Provider['on']>[1];

  let metamask: MetamaskConnectEVM;
  let provider: Provider | undefined;
  let providerPromise: Promise<typeof provider>;

  let accountsChanged: Connector['onAccountsChanged'] | undefined;
  let chainChanged: Connector['onChainChanged'] | undefined;
  let connect: Connector['onConnect'] | undefined;
  let displayUri: ((uri: string) => void) | undefined;
  let disconnect: Connector['onDisconnect'] | undefined;
  let sessionData: SessionData | undefined;

  return createConnector<Provider, Properties>((config) => ({
    id: 'metaMaskSDK',
    name: 'MetaMask',
    rdns: ['io.metamask', 'io.metamask.mobile'],
    type: metaMask.type,
    async setup() {
      // TODO: Add wagmi parameters as the per the OG get provider method
      metamask = await createMetamaskConnectEVM({
        dapp: {
          name: parameters.dappMetadata?.name,
          url: parameters.dappMetadata?.url,
        },
        eventHandlers: {
          accountsChanged: this.onAccountsChanged.bind(this),
          chainChanged: this.onChainChanged.bind(this),
          connect: this.onConnect.bind(this),
          disconnect: this.onDisconnect.bind(this),
        },
      });

      console.log('SDK created', metamask);
    },
    async connect({ chainId, isReconnecting, withCapabilities } = {}) {
      // TODO (@wenfix): handle case where no chainId is provided
      const _chainId = chainId ?? 1;

      // TODO: Bind display_uri event?
      // TODO: Add connectAndSign and connectWith support, including events
      // TODO: Ensure correct local state chainID after connection
      // TODO: Fix types
      // TODO: Understand event binding during connect
      // TODO: Match error codes to wagmi errors

      // @ts-expect-error - null accounts should be supported
      const result = await metamask.connect({
        chainId: _chainId,
        account: undefined,
      } as { chainId: number; account: string });

      const accounts = result.accounts.map((account) => ({
        address: account,
        capabilities: {},
      }));

      const response = {
        accounts,
        chainId: result.chainId ?? _chainId,
      };

      config.emitter.emit('connect', response);

      return response;
    },

    async disconnect() {
      await metamask.disconnect();
    },

    async getAccounts() {
      return metamask.accounts;
    },

    async getChainId() {
      const chainId = await metamask.getChainId();
      if (chainId) {
        return Number(chainId);
      }
      // TODO: Handle case where chainId is not found
      return 1;
    },

    async getProvider() {
      const provider = await metamask.getProvider();
      if (!provider) {
        throw new ProviderNotFoundError();
      }
      return provider;
    },

    async isAuthorized() {
      // TODO: Ensure this works correctly on mobile
      const accounts = await this.getAccounts();
      return accounts.length > 0;
    },

    async switchChain({ addEthereumChainParameter, chainId }) {
      const chain = config.chains.find((x) => x.id === chainId);

      if (!chain) {
        throw new SwitchChainError(new ChainNotConfiguredError());
      }

      //TODO: Add validation?
      const chainConfiguration = addEthereumChainParameter ?? {
        chainId: `0x${chainId.toString(16)}`,
        rpcUrls: chain.rpcUrls.default?.http,
        nativeCurrency: chain.nativeCurrency,
        chainName: chain.name,
        blockExplorerUrls: chain.blockExplorers?.default.url,
      };

      console.log('Chain configuration', { chainConfiguration });

      console.log('Switching chain', {
        chain,
        chainId,
        addEthereumChainParameter,
      });

      metamask.switchChain({ chainId, chainConfiguration });

      return chain;
    },

    async onAccountsChanged(accounts) {
      //TODO: implement disconnects?
      config.emitter.emit('change', {
        accounts: accounts.map((account) => getAddress(account)),
      });
    },
    async onChainChanged(chain) {
      console.log('Chain changed method', { chain });
      const chainId = Number(chain);
      config.emitter.emit('change', { chainId });
    },
    async onConnect(connectInfo) {
      //handled internally
    },
    async onDisconnect(error) {
      //handled internally
    },
    async onDisplayUri(uri) {
      config.emitter.emit('message', { type: 'display_uri', data: uri });
    },
  }));
}
