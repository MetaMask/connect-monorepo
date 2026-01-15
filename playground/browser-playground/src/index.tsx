import React from 'react';
import ReactDOM from 'react-dom/client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { deserialize, serialize, WagmiProvider } from 'wagmi';

import './index.css';
import App from './App';
import { SDKProvider } from './sdk/SDKProvider';
import { LegacyEVMSDKProvider } from './sdk/LegacyEVMSDKProvider';
import { wagmiConfig } from './wagmi/config';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1_000 * 60 * 60 * 24, // 24 hours
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false,
      retry: 0,
    },
    mutations: { networkMode: 'offlineFirst' },
  },
});

const persister = createSyncStoragePersister({
  key: 'browser-playground.cache',
  serialize,
  storage: window.localStorage,
  deserialize,
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        <SDKProvider>
          <LegacyEVMSDKProvider>
            <App />
          </LegacyEVMSDKProvider>
        </SDKProvider>
      </PersistQueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
