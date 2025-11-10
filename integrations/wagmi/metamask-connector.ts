import {
  createMetamaskConnectEVM,
  type MetamaskConnectEVM,
} from '@metamask/connect-evm';

import type { MetaMaskSDKOptions } from '@metamask/sdk';

import {
  ChainNotConfiguredError,
  //type Connector,
  createConnector,
  ProviderNotFoundError,
} from '@wagmi/core';
import type {
  Compute,
  ExactPartial,
  OneOf,
  UnionCompute,
} from '@wagmi/core/internal';
import {
  type EIP1193Provider,
  getAddress,
  type ProviderConnectInfo,
  SwitchChainError,
} from 'viem';

export type MetaMaskParameters = UnionCompute<
  WagmiMetaMaskSDKOptions &
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

type WagmiMetaMaskSDKOptions = Compute<
  ExactPartial<
    Omit<
      MetaMaskSDKOptions,
      | '_source'
      | 'forceDeleteProvider'
      | 'forceInjectProvider'
      | 'injectProvider'
      | 'useDeeplink'
      | 'readonlyRPCMap'
    >
  > & {
    /** @deprecated */
    forceDeleteProvider?: MetaMaskSDKOptions['forceDeleteProvider'];
    /** @deprecated */
    forceInjectProvider?: MetaMaskSDKOptions['forceInjectProvider'];
    /** @deprecated */
    injectProvider?: MetaMaskSDKOptions['injectProvider'];
    /** @deprecated */
    useDeeplink?: MetaMaskSDKOptions['useDeeplink'];
  }
>;

metaMask.type = 'metaMask' as const;
export function metaMask(parameters: MetaMaskParameters = {}) {
  type Provider = EIP1193Provider;
  type Properties = {
    onConnect(connectInfo: ProviderConnectInfo): void;
    onDisplayUri(uri: string): void;
  };

  let metamask: MetamaskConnectEVM;

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
          //@ts-expect-error cool
          connect: this.onConnect.bind(this),
          disconnect: this.onDisconnect.bind(this),
        },
      });
    },
    //@ts-expect-error cool
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

      // TODO: return this again after changing portfolio
      // biome-ignore lint/correctness/noUnusedVariables: will be used in the future
      const accounts = result.accounts.map((account) => ({
        address: account,
        capabilities: {},
      }));

      return {
        accounts: result.accounts,
        chainId: result.chainId ?? _chainId,
      };
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

    //@ts-expect-error cool
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

      //@ts-expect-error cool
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
      const chainId = Number(chain);
      config.emitter.emit('change', { chainId });
    },
    async onConnect(connectInfo) {
      const data = {
        //@ts-expect-error fix types here ?
        accounts: connectInfo.accounts.map((account) => getAddress(account)),
        chainId: Number(connectInfo.chainId),
      };
      config.emitter.emit('connect', data);
    },
    async onDisconnect() {
      config.emitter.emit('disconnect');
    },
    async onDisplayUri(uri) {
      config.emitter.emit('message', { type: 'display_uri', data: uri });
    },
  }));
}
