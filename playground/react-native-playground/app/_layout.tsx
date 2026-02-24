import 'react-native-get-random-values';
import '../polyfills';
import { SDKProvider } from '../src/sdk/SDKProvider';
import { LegacyEVMSDKProvider } from '../src/sdk/LegacyEVMSDKProvider';
import { Slot, SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { deserialize, serialize, WagmiProvider } from 'wagmi';
import { wagmiConfig } from '../src/wagmi/config';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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

const persister = createAsyncStoragePersister({
  key: 'react-native-playground.cache',
  serialize,
  storage: AsyncStorage,
  deserialize,
});

export default function RootLayout() {
  useEffect(() => {
    const performCleanStartIfNeeded = async () => {
      try {
        // Check for the environment variable to trigger a hard reset
        if (process.env.EXPO_PUBLIC_CLEAR_STORAGE === 'true') {
          console.log('[Hard Reset] Wiping all data from AsyncStorage...');
          await AsyncStorage.clear();
          console.log('[Hard Reset] AsyncStorage has been cleared successfully.');
        }
      } catch (e) {
        console.error('[Hard Reset] Failed to clear AsyncStorage.', e);
      } finally {
        // Hide the splash screen once the storage check is complete
        await SplashScreen.hideAsync();
      }
    };

    performCleanStartIfNeeded();
  }, []); // The empty dependency array ensures this effect runs only once on mount.

  return (
    <WagmiProvider config={wagmiConfig}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        <SDKProvider>
          <LegacyEVMSDKProvider>
            <Slot />
          </LegacyEVMSDKProvider>
        </SDKProvider>
      </PersistQueryClientProvider>
    </WagmiProvider>
  );
}
