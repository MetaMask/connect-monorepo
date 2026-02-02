import { MetamaskConnectEVM, createEVMClient } from '@metamask/connect/evm';
import type { EIP1193Provider } from '@metamask/connect/evm';
import { getInfuraRpcUrls } from '@metamask/connect-multichain';
import type { Hex } from '@metamask/utils';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  isProviderActive,
  setProviderActive,
  removeProviderActive,
} from '../utils/activeProviderStorage';

/**
 * Converts CAIP-2 keyed RPC URLs map to hex-keyed format.
 * Example: { 'eip155:1': 'url' } -> { '0x1': 'url' }
 */
function convertCaipToHexKeys(
  caipMap: Record<string, string>,
): Record<Hex, string> {
  return Object.entries(caipMap).reduce(
    (acc, [caipChainId, url]) => {
      // Extract the numeric part from CAIP-2 format (e.g., 'eip155:1' -> 1)
      const match = caipChainId.match(/^eip155:(\d+)$/);
      if (match?.[1]) {
        const decimalChainId = parseInt(match[1], 10);
        const hexChainId = `0x${decimalChainId.toString(16)}` as Hex;
        acc[hexChainId] = url;
      }
      return acc;
    },
    {} as Record<Hex, string>,
  );
}

const LegacyEVMSDKContext = createContext<
  | {
    sdk: MetamaskConnectEVM | undefined;
    connected: boolean;
    provider: EIP1193Provider | undefined;
    chainId: string | undefined;
    accounts: string[];
    error: Error | null;
    connect: (chainIds: Hex[]) => Promise<void>;
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
  const [error, setError] = useState<Error | null>(null);
  const sdkRef = useRef<Promise<MetamaskConnectEVM>>(undefined);

  useEffect(() => {
    if (!sdkRef.current) {
      const setupSDK = async () => {
        const infuraApiKey = process.env.INFURA_API_KEY || '';
        // Get CAIP-keyed RPC URLs and convert to hex-keyed format
        const caipNetworks = infuraApiKey
          ? getInfuraRpcUrls(infuraApiKey)
          : {
            // Fallback public RPC endpoints if no Infura key is provided
            'eip155:1': 'https://eth.llamarpc.com',
            'eip155:5': 'https://goerli.infura.io/v3/demo',
            'eip155:11155111': 'https://sepolia.infura.io/v3/demo',
            'eip155:137': 'https://polygon-rpc.com',
          };
        const supportedNetworks = convertCaipToHexKeys(caipNetworks);

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

          // Check if legacy-evm was previously active and restore connection state
          // This handles page refresh scenarios where the SDK may have restored
          // the session but didn't emit a connect event
          if (isProviderActive('legacy-evm')) {
            // Check if the SDK actually has a valid session
            if (clientSDK.accounts.length > 0) {
              setConnected(true);
              setAccounts(clientSDK.accounts);
              if (clientSDK.selectedChainId) {
                setChainId(clientSDK.selectedChainId);
              }
            } else {
              // SDK doesn't have accounts, clear stale localStorage state
              removeProviderActive('legacy-evm');
            }
          }
        }

        return clientSDK;
      };

      sdkRef.current = setupSDK();
    }
  }, []);

  const connect = useCallback(async (chainIds: Hex[]) => {
    setError(null);
    try {
      if (!sdkRef.current) {
        throw new Error('SDK not initialized');
      }
      const sdkInstance = await sdkRef.current;
      // Ensure at least one chain ID is provided, default to mainnet if empty
      const chainIdsToUse = chainIds.length > 0 ? chainIds : ['0x1' as Hex];
      await sdkInstance.connect({ chainIds: chainIdsToUse });
      setProviderActive('legacy-evm');
    } catch (err) {
      console.error('Failed to connect:', err);
      setError(err as Error);
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
      removeProviderActive('legacy-evm');
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
        error,
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
