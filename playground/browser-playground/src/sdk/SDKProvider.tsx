/* eslint-disable */

import {
  createMultichainClient,
  getInfuraRpcUrls,
  type InvokeMethodOptions,
  type MultichainCore,
  type Scope,
  type ConnectionStatus,
  type SessionData,
} from '@metamask/connect-multichain';
import { METAMASK_PROD_CHROME_ID } from '@metamask/playground-ui';
import type { CaipAccountId } from '@metamask/utils';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

const SDKContext = createContext<
  | {
      session: SessionData | undefined;
      status: ConnectionStatus;
      error: Error | null;
      connect: (
        scopes: Scope[],
        caipAccountIds: CaipAccountId[],
      ) => Promise<void>;
      disconnect: () => Promise<void>;
      invokeMethod: (options: InvokeMethodOptions) => Promise<any>;
    }
  | undefined
>(undefined);

export const SDKProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<ConnectionStatus>('pending');
  const [session, setSession] = useState<SessionData | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  const sdkRef = useRef<Promise<MultichainCore>>(undefined);

  useEffect(() => {
    if (!sdkRef.current) {
      sdkRef.current = createMultichainClient({
        dapp: {
          name: 'playground',
          url: 'https://playground.metamask.io',
        },
        api: {
          supportedNetworks: getInfuraRpcUrls(process.env.INFURA_API_KEY || ''),
        },
        transport: {
          extensionId: METAMASK_PROD_CHROME_ID,
        },
      });

      // TODO: Check if we can get rid of transport.onNotification constructor param
      sdkRef.current.then((sdkInstance) => {
        sdkInstance.on('wallet_sessionChanged', (session: unknown) => {
          setSession(session as SessionData);
        });
        sdkInstance.on('stateChanged', (status: unknown) => {
          setStatus(status as ConnectionStatus);
        });
      });
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (!sdkRef.current) {
        throw new Error('SDK not initialized');
      }
      const sdkInstance = await sdkRef.current;
      setSession(undefined);
      return sdkInstance.disconnect();
    } catch (error) {
      setError(error as Error);
    }
  }, []);

  const connect = useCallback(
    async (scopes: Scope[], caipAccountIds: CaipAccountId[]) => {
      try {
        if (!sdkRef.current) {
          throw new Error('SDK not initialized');
        }
        const sdkInstance = await sdkRef.current;
        // Track this provider as active BEFORE connecting
        // This ensures the onNotification handler will accept the session
        await sdkInstance.connect(scopes, caipAccountIds);
      } catch (error) {
        // If connection fails, remove the active provider tracking
        setError(error as Error);
      }
    },
    [],
  );

  const invokeMethod = useCallback(async (options: InvokeMethodOptions) => {
    try {
      if (!sdkRef.current) {
        throw new Error('SDK not initialized');
      }
      const sdkInstance = await sdkRef.current;
      return sdkInstance.invokeMethod(options);
    } catch (error) {
      setError(error as Error);
    }
  }, []);

  return (
    <SDKContext.Provider
      value={{
        session,
        status,
        error,
        connect,
        disconnect,
        invokeMethod,
      }}
    >
      {children}
    </SDKContext.Provider>
  );
};

export const useSDK = () => {
  const context = useContext(SDKContext);
  if (context === undefined) {
    throw new Error('useSDK must be used within a SDKProvider');
  }
  return context;
};
