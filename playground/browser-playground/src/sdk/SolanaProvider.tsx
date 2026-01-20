import { createSolanaClient, type SolanaClient } from '@metamask/connect-solana';
import { METAMASK_PROD_CHROME_ID } from '@metamask/playground-ui';
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import '@solana/wallet-adapter-react-ui/styles.css';

const SOLANA_DEVNET_ENDPOINT = 'https://api.devnet.solana.com';
const SOLANA_MAINNET_ENDPOINT = 'https://api.mainnet-beta.solana.com';

type SolanaSDKContextType = {
  client: SolanaClient | null;
  isRegistered: boolean;
  endpoint: string;
  setEndpoint: (endpoint: string) => void;
};

const SolanaSDKContext = createContext<SolanaSDKContextType | undefined>(
  undefined,
);

/**
 * Provider that initializes the Solana client and registers the MetaMask wallet.
 */
const SolanaClientInitializer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [client, setClient] = useState<SolanaClient | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [endpoint, setEndpoint] = useState(SOLANA_DEVNET_ENDPOINT);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    createSolanaClient({
      dapp: {
        name: 'MetaMask Connect Playground',
        url: window.location.origin,
      },
      api: {
        supportedNetworks: {},
      },
    })
      .then((solanaClient) => {
        setClient(solanaClient);
        return solanaClient.registerWallet();
      })
      .then(() => {
        setIsRegistered(true);
      })
      .catch((error) => {
        console.error('Failed to initialize Solana client:', error);
      });
  }, []);

  const contextValue = useMemo(
    () => ({ client, isRegistered, endpoint, setEndpoint }),
    [client, isRegistered, endpoint],
  );

  return (
    <SolanaSDKContext.Provider value={contextValue}>
      <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
        <WalletProvider wallets={[]} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </SolanaSDKContext.Provider>
  );
};

/**
 * Main Solana provider that wraps the app with all necessary providers.
 */
export const SolanaWalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <SolanaClientInitializer>{children}</SolanaClientInitializer>;
};

/**
 * Hook to access the Solana SDK context.
 */
export const useSolanaSDK = () => {
  const context = useContext(SolanaSDKContext);
  if (context === undefined) {
    throw new Error('useSolanaSDK must be used within a SolanaWalletProvider');
  }
  return context;
};

/**
 * Hook to access Solana wallet functionality.
 * Re-exports @solana/wallet-adapter-react hooks for convenience.
 */
export { useConnection, useWallet };
