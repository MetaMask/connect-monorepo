import { MetamaskConnectEVM, createEVMClient } from '@metamask/connect/evm';
import type { EIP1193Provider } from '@metamask/connect/evm';
import { getInfuraRpcUrls } from '@metamask/connect-multichain';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

const LegacyEVMSDKContext = createContext<
  | {
      sdk: MetamaskConnectEVM | undefined;
      connected: boolean;
      provider: EIP1193Provider | undefined;
      chainId: string | undefined;
      accounts: string[];
      connect: (chainIds: number[]) => Promise<void>;
      disconnect: () => Promise<void>;
    }
  | undefined
>(undefined);

export const LegacyEVMSDKProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [sdk, setSDK] = useState<MetamaskConnectEVM>();
  const [connected, setConnected] = useState(false);
  const [provider, setProvider] = useState<EIP1193Provider>();
  const [chainId, setChainId] = useState<string>();
  const [accounts, setAccounts] = useState<string[]>([]);
  const sdkRef = useRef<Promise<MetamaskConnectEVM>>(undefined);

  useEffect(() => {
    if (!sdkRef.current) {
      const setupSDK = async () => {
        const infuraApiKey = process.env.INFURA_API_KEY || '';
        const supportedNetworks = infuraApiKey
          ? getInfuraRpcUrls(infuraApiKey)
          : {
              // Fallback public RPC endpoints if no Infura key is provided
              'eip155:1': 'https://eth.llamarpc.com',
              'eip155:5': 'https://goerli.infura.io/v3/demo',
              'eip155:11155111': 'https://sepolia.infura.io/v3/demo',
              'eip155:137': 'https://polygon-rpc.com',
            };

        const clientSDK = await createEVMClient({
          dapp: {
            name: 'playground',
            url: 'https://playground.metamask.io',
          },
          api: {
            supportedNetworks,
          },
        });
        const providerInstance = await clientSDK.getProvider();

        if (providerInstance) {
          providerInstance.on('connect', () => {
            setConnected(true);
          });

          providerInstance.on('disconnect', () => {
            setConnected(false);
            setAccounts([]);
            setChainId(undefined);
          });

          providerInstance.on('chainChanged', (newChainId: string) => {
            setChainId(newChainId);
          });

          providerInstance.on('accountsChanged', (newAccounts: string[]) => {
            setAccounts(newAccounts);
          });

          setSDK(clientSDK);
          setProvider(providerInstance);
        }

        return clientSDK;
      };

      sdkRef.current = setupSDK();
    }
  }, []);

  const connect = useCallback(async (chainIds: number[]) => {
    try {
      if (!sdkRef.current) {
        throw new Error('SDK not initialized');
      }
      const sdkInstance = await sdkRef.current;
      // Ensure at least one chain ID is provided, default to mainnet if empty
      const chainIdsToUse = chainIds.length > 0 ? chainIds : [1];
      await sdkInstance.connect({ chainIds: chainIdsToUse });
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (!sdkRef.current) {
        throw new Error('SDK not initialized');
      }
      const sdkInstance = await sdkRef.current;
      await sdkInstance.disconnect();
      setConnected(false);
      setAccounts([]);
      setChainId(undefined);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }, []);

  return (
    <LegacyEVMSDKContext.Provider
      value={{
        sdk,
        connected,
        provider,
        chainId,
        accounts,
        connect,
        disconnect,
      }}
    >
      {children}
    </LegacyEVMSDKContext.Provider>
  );
};

export const useLegacyEVMSDK = () => {
  const context = useContext(LegacyEVMSDKContext);
  if (context === undefined) {
    throw new Error(
      'useLegacyEVMSDK must be used within a LegacyEVMSDKProvider',
    );
  }
  return context;
};
