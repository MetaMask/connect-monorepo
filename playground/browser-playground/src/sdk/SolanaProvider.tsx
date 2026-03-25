import { createSolanaClient } from '@metamask/connect-solana';
import { SolanaProvider as FrameworkKitSolanaProvider } from '@solana/react-hooks';
import type React from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

const SOLANA_DEVNET_ENDPOINT = 'https://api.devnet.solana.com';
const SOLANA_MAINNET_ENDPOINT = 'https://api.mainnet-beta.solana.com';

type SolanaInitContextValue = { isSolanaInitializing: boolean };
const SolanaInitContext = createContext<SolanaInitContextValue>({
  isSolanaInitializing: true,
});

export function useSolanaInit(): SolanaInitContextValue {
  return useContext(SolanaInitContext);
}

/**
 * Provider that initializes the Solana client and registers the MetaMask wallet,
 * then wraps children with the framework-kit SolanaProvider for RPC and wallet hooks.
 *
 * Wallet persistence (auto-reconnect on refresh) is disabled while createSolanaClient
 * resolves. This prevents a race where the framework-kit's WalletPersistence component
 * tries to auto-connect before the MetaMask wallet-standard connector is registered.
 * Once initialization completes, persistence is enabled with autoConnect so the
 * framework-kit can find the connector and restore the session.
 */
const SolanaClientInitializer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initRef = useRef(false);
  const [isSolanaInitializing, setIsSolanaInitializing] = useState(true);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    createSolanaClient({
      dapp: {
        name: 'MetaMask Connect Playground',
        url: window.location.origin,
      },
      api: {
        supportedNetworks: {
          devnet: SOLANA_DEVNET_ENDPOINT,
          mainnet: SOLANA_MAINNET_ENDPOINT,
        },
      },
    })
      .catch((error) => {
        console.error('Failed to initialize Solana client:', error);
      })
      .finally(() => {
        setIsSolanaInitializing(false);
      });
  }, []);

  return (
    <SolanaInitContext.Provider value={{ isSolanaInitializing }}>
      <FrameworkKitSolanaProvider
        config={{ endpoint: SOLANA_DEVNET_ENDPOINT }}
        walletPersistence={
          isSolanaInitializing ? false : { autoConnect: true }
        }
      >
        {children}
      </FrameworkKitSolanaProvider>
    </SolanaInitContext.Provider>
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
