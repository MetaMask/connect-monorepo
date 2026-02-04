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
import { ExperimentsApp } from './experiments';

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

// Check if we're on the experiments page
// Uses URL search param: ?experiments or ?experiments=true
const isExperimentsPage =
  window.location.search.includes('experiments') ||
  window.location.pathname.includes('experiments');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

// Experiments page doesn't need the SDK providers (it creates its own)
if (isExperimentsPage) {
  root.render(
    <React.StrictMode>
      <ExperimentsApp />
    </React.StrictMode>,
  );
} else {
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
}
