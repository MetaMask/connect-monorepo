import { useState, useEffect, useCallback } from 'react';
import type { Scope, SessionData } from '@metamask/connect';
import { hexToNumber, type CaipAccountId, type Hex } from '@metamask/utils';
import { useAccount, useChainId, useConnect, useDisconnect } from 'wagmi';
import { FEATURED_NETWORKS, convertCaipChainIdsToHex, TEST_IDS } from '@metamask/playground-ui';
import { useSDK } from './sdk';
import { useLegacyEVMSDK } from './sdk/LegacyEVMSDKProvider';
import DynamicInputs, { INPUT_LABEL_TYPE } from './components/DynamicInputs';
import { ScopeCard } from './components/ScopeCard';
import { LegacyEVMCard } from './components/LegacyEVMCard';
import { WagmiCard } from './components/WagmiCard';
import {
  isProviderActive,
  setProviderActive,
  clearAllActiveProviders,
} from './utils/activeProviderStorage';
import { Buffer } from 'buffer';

global.Buffer = Buffer;

function App() {
  const [customScopes, setCustomScopes] = useState<string[]>(['eip155:1']);
  const [caipAccountIds, setCaipAccountIds] = useState<CaipAccountId[]>([]);

  // Track whether wagmi should be shown based on localStorage
  const [wagmiIsActiveProvider, setWagmiIsActiveProvider] = useState(() =>
    isProviderActive('wagmi'),
  );

  const {
    error,
    status,
    session,
    connect: sdkConnect,
    disconnect: sdkDisconnect,
  } = useSDK();
  const {
    connected: legacyConnected,
    provider: legacyProvider,
    chainId: legacyChainId,
    accounts: legacyAccounts,
    sdk: legacySDK,
    connect: legacyConnect,
    disconnect: legacyDisconnect,
  } = useLegacyEVMSDK();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const wagmiChainId = useChainId();
  const { connectors, connectAsync: wagmiConnectAsync, status: wagmiStatus } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  // On mount, check if wagmi is connected but not marked as active provider
  // If so, disconnect wagmi to clear stale state
  useEffect(() => {
    if (wagmiConnected && !isProviderActive('wagmi')) {
      // Wagmi thinks it's connected but our localStorage says it shouldn't be
      // Disconnect to clear stale state
      wagmiDisconnect();
    }
  }, []);

  const handleCheckboxChange = useCallback(
    (value: string, isChecked: boolean) => {
      if (isChecked) {
        setCustomScopes(Array.from(new Set([...customScopes, value])));
      } else {
        setCustomScopes(customScopes.filter((item) => item !== value));
      }
    },
    [customScopes],
  );

  useEffect(() => {
    if (session) {
      const scopes = Object.keys(session?.sessionScopes ?? {});
      setCustomScopes(scopes);

      // Accumulate all accounts from all scopes
      const allAccounts: CaipAccountId[] = [];
      for (const scope of scopes) {
        const { accounts } =
          session.sessionScopes?.[
            scope as keyof typeof session.sessionScopes
          ] ?? {};
        if (accounts && accounts.length > 0) {
          allAccounts.push(...accounts);
        }
      }
      setCaipAccountIds(allAccounts);
    }
  }, [session]);

  const scopesHaveChanged = useCallback(() => {
    if (!session) return false;
    const sessionScopes = Object.keys(session?.sessionScopes ?? {});
    const currentScopes = customScopes.filter((scope) => scope.length);
    if (sessionScopes.length !== currentScopes.length) return true;
    return (
      !sessionScopes.every((scope) => currentScopes.includes(scope)) ||
      !currentScopes.every((scope) => sessionScopes.includes(scope))
    );
  }, [session, customScopes]);

  const connect = useCallback(async () => {
    const selectedScopesArray = customScopes.filter((scope) => scope.length);
    const filteredAccountIds = caipAccountIds.filter(
      (addr) => addr.trim() !== '',
    );
    return sdkConnect(
      selectedScopesArray as Scope[],
      filteredAccountIds as CaipAccountId[],
    );
  }, [customScopes, caipAccountIds, sdkConnect]);

  const connectLegacyEVM = useCallback(async () => {
    const selectedScopesArray = customScopes.filter((scope) => scope.length);
    // Convert CAIP-2 chain IDs to hex, filtering out Solana and other non-EVM networks
    const chainIds = convertCaipChainIdsToHex(selectedScopesArray) as Hex[];
    await legacyConnect(chainIds);
  }, [customScopes, legacyConnect]);

  const connectWagmi = useCallback(async () => {
    const selectedScopesArray = customScopes.filter((scope) => scope.length);
    // Convert CAIP-2 chain IDs to hex, filtering out Solana and other non-EVM networks
    // Then convert hex chain IDs to numbers for the connect method
    const chainIds = convertCaipChainIdsToHex(selectedScopesArray).map(id => hexToNumber(id));
    // Use first chain or default to mainnet (1), ensuring it's a valid wagmi chain
    const chainId = (chainIds[0] || 1) as 1 | 10 | 11155111 | 42220;

    const metaMaskConnector = connectors.find((c) => c.id === 'metaMaskSDK');
    if (metaMaskConnector) {
      try {
        await wagmiConnectAsync({
          connector: metaMaskConnector,
          chainId,
        });
        setProviderActive('wagmi');
        setWagmiIsActiveProvider(true);
      } catch (error) {
        console.error('Wagmi connection error:', error);
      }
    }
  }, [customScopes, connectors, wagmiConnectAsync]);

  const isConnected = status === 'connected';
  const isDisconnected =
    status === 'disconnected' || status === 'pending' || status === 'loaded';

  const disconnect = useCallback(async () => {
    clearAllActiveProviders();
    setWagmiIsActiveProvider(false);

    // Disconnect all connections if connected
    if (isConnected) {
      await sdkDisconnect();
    }
    if (legacyConnected) {
      await legacyDisconnect();
    }
    if (wagmiConnected) {
      wagmiDisconnect();
    }
  }, [sdkDisconnect, legacyDisconnect, wagmiDisconnect, isConnected, legacyConnected, wagmiConnected]);

  const availableOptions = Object.keys(FEATURED_NETWORKS).reduce<
    { name: string; value: string }[]
  >((all, networkName) => {
    const networkCaipValue =
      FEATURED_NETWORKS[networkName as keyof typeof FEATURED_NETWORKS];
    all.push({ name: networkName, value: networkCaipValue });
    return all;
  }, []);

  const isConnecting = status === 'connecting';
  return (
    <div data-testid={TEST_IDS.app.container} className="min-h-screen bg-gray-50 flex justify-center">
      <div className="max-w-6xl w-full p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 data-testid={TEST_IDS.app.title} className="text-slate-800 text-4xl font-bold text-center flex-1">
            MetaMask MultiChain API Test Dapp
          </h1>
          <a
            href="?experiments"
            className="bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600 transition-colors"
          >
            Isolation Experiments →
          </a>
        </div>
        <section className="bg-white rounded-lg p-8 mb-6 shadow-sm">
          <div className="mb-4">
            <DynamicInputs
              availableOptions={availableOptions}
              inputArray={customScopes}
              handleCheckboxChange={handleCheckboxChange}
              label={INPUT_LABEL_TYPE.SCOPE}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {isConnecting && (
              <button
                type="button"
                data-testid={TEST_IDS.app.btnConnect()}
                onClick={connect}
                className="bg-blue-500 text-white px-5 py-2 rounded text-base hover:bg-blue-600 transition-colors"
              >
                Connecting
              </button>
            )}

            {isDisconnected && (
              <button
                type="button"
                data-testid={TEST_IDS.app.btnConnect()}
                onClick={connect}
                className="bg-blue-500 text-white px-5 py-2 rounded text-base hover:bg-blue-600 transition-colors"
              >
                Connect
              </button>
            )}

            {!legacyConnected && (
              <button
                type="button"
                data-testid={TEST_IDS.app.btnConnect('legacy')}
                onClick={connectLegacyEVM}
                className="bg-green-500 text-white px-5 py-2 rounded text-base hover:bg-green-600 transition-colors"
              >
                Connect (Legacy EVM)
              </button>
            )}

            {(!wagmiConnected || !wagmiIsActiveProvider) && (
              <button
                type="button"
                data-testid={TEST_IDS.app.btnConnect('wagmi')}
                onClick={connectWagmi}
                disabled={wagmiStatus === 'pending'}
                className="bg-purple-500 text-white px-5 py-2 rounded text-base hover:bg-purple-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {wagmiStatus === 'pending' ? 'Connecting...' : 'Connect (Wagmi)'}
              </button>
            )}

            {isConnected && (
              <button
                type="button"
                data-testid={scopesHaveChanged() ? TEST_IDS.app.btnReconnect : TEST_IDS.app.btnDisconnect}
                onClick={scopesHaveChanged() ? connect : disconnect}
                className="bg-blue-500 text-white px-5 py-2 rounded text-base hover:bg-blue-600 transition-colors"
              >
                {scopesHaveChanged()
                  ? `Re Establishing Connection`
                  : `Disconnect`}
              </button>
            )}

            {(isConnected || legacyConnected || wagmiConnected) && (
              <button
                type="button"
                data-testid={TEST_IDS.app.btnDisconnect}
                onClick={disconnect}
                className="bg-red-500 text-white px-5 py-2 rounded text-base hover:bg-red-600 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </section>
        {error && (
          <section data-testid={TEST_IDS.app.sectionError} className="bg-white rounded-lg p-8 mb-6 shadow-sm">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-700">{error.message.toString()}</p>
          </section>
        )}
        <section data-testid={TEST_IDS.app.sectionConnected} className="bg-white rounded-lg p-8 mb-6 shadow-sm">
          {Object.keys(session?.sessionScopes ?? {}).length > 0 && (
            <section data-testid={TEST_IDS.app.sectionScopes} className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Connected Networks
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(session?.sessionScopes ?? {}).map(
                  ([scope, details]) => {
                    return (
                      <ScopeCard
                        key={scope}
                        scope={scope as Scope}
                        details={details as SessionData['sessionScopes'][Scope]}
                      />
                    );
                  },
                )}
              </div>
            </section>
          )}
          {legacyConnected && legacyProvider && legacySDK && (
            <section className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Legacy EVM Connection
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <LegacyEVMCard
                  provider={legacyProvider}
                  chainId={legacyChainId}
                  accounts={legacyAccounts}
                  sdk={legacySDK}
                />
              </div>
            </section>
          )}
          {wagmiConnected && wagmiAddress && wagmiIsActiveProvider && (
            <section className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Wagmi Connection
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <WagmiCard />
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
