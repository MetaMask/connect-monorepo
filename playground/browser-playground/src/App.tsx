import { useState, useEffect, useCallback } from 'react';
import type { Scope, SessionData } from '@metamask/connect-multichain';
import { hexToNumber, type CaipAccountId, type Hex } from '@metamask/utils';
import {
  useWalletConnection,
  useWalletSession,
  useDisconnectWallet,
  useSolanaClient,
} from '@solana/react-hooks';
import { useConnection, useConnect } from 'wagmi';
import {
  FEATURED_NETWORKS,
  convertCaipChainIdsToHex,
  TEST_IDS,
} from '@metamask/playground-ui';
import { useSDK } from './sdk';
import { useLegacyEVMSDK } from './sdk/LegacyEVMSDKProvider';
import DynamicInputs, { INPUT_LABEL_TYPE } from './components/DynamicInputs';
import { ScopeCard } from './components/ScopeCard';
import { LegacyEVMCard } from './components/LegacyEVMCard';
import { WagmiCard } from './components/WagmiCard';
import { SolanaWalletCard } from './components/SolanaWalletCard';
import { useSolanaSelectedAccount } from './hooks/useSolanaSelectedAccount';
import { installSolanaDisconnectRecursionGuard } from './utils/installSolanaDisconnectRecursionGuard';
import { Buffer } from 'buffer';

global.Buffer = Buffer;

const CONNECT_AND_SIGN_MESSAGE = 'Hello from MetaMask Connect Playground!';
const METAMASK_SOLANA_CONNECTOR_ID = 'wallet-standard:metamask';

function App() {
  const [customScopes, setCustomScopes] = useState<string[]>(['eip155:1']);
  const [caipAccountIds, setCaipAccountIds] = useState<CaipAccountId[]>([]);

  const [wagmiError, setWagmiError] = useState<Error | null>(null);
  const [legacySignature, setLegacySignature] = useState<string | null>(null);

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
    error: legacyError,
    connect: legacyConnect,
    connectAndSign: legacyConnectAndSign,
    disconnect: legacyDisconnect,
  } = useLegacyEVMSDK();
  const { address: wagmiAddress, isConnected: wagmiConnected } =
    useConnection();
  const {
    connectors,
    connectAsync: wagmiConnectAsync,
    status: wagmiStatus,
  } = useConnect();

  const { connect: connectSolanaWallet, connectors: solanaConnectors } =
    useWalletConnection();
  const solanaClient = useSolanaClient();
  const solanaSession = useWalletSession();
  const disconnectSolanaWallet = useDisconnectWallet();
  const solanaConnected = solanaSession !== undefined;
  const solanaPublicKey = useSolanaSelectedAccount(solanaSession);

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
    installSolanaDisconnectRecursionGuard(solanaClient);
  }, [solanaClient]);

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

  const connectLegacyEVMAndSign = useCallback(async () => {
    setLegacySignature(null);
    const selectedScopesArray = customScopes.filter((scope) => scope.length);
    const chainIds = convertCaipChainIdsToHex(selectedScopesArray) as Hex[];
    const signature = await legacyConnectAndSign(
      CONNECT_AND_SIGN_MESSAGE,
      chainIds,
    );
    setLegacySignature(signature);
  }, [customScopes, legacyConnectAndSign]);

  const connectWagmi = useCallback(async () => {
    // Clear any previous error
    setWagmiError(null);

    const selectedScopesArray = customScopes.filter((scope) => scope.length);
    // Convert CAIP-2 chain IDs to hex, filtering out Solana and other non-EVM networks
    // Then convert hex chain IDs to numbers for the connect method
    const chainIds = convertCaipChainIdsToHex(selectedScopesArray).map((id) =>
      hexToNumber(id),
    );
    // Use first chain or default to mainnet (1), ensuring it's a valid wagmi chain
    const chainId = (chainIds[0] || 1) as 1 | 10 | 11155111 | 42220;

    const metaMaskConnector = connectors.find((c) => c.id === 'metaMaskSDK');
    if (metaMaskConnector) {
      try {
        await wagmiConnectAsync({
          connector: metaMaskConnector,
          chainId,
        });
      } catch (err) {
        console.error('Wagmi connection error:', err);
        setWagmiError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [customScopes, connectors, wagmiConnectAsync]);

  const connectSolana = useCallback(async () => {
    const metamaskConnector = solanaConnectors.find(
      (c) => c.id === METAMASK_SOLANA_CONNECTOR_ID,
    );
    if (metamaskConnector) {
      await connectSolanaWallet(metamaskConnector.id);
    } else {
      console.error(
        'MetaMask Connect wallet not found. Available connectors:',
        solanaConnectors.map((c) => c.id),
      );
    }
  }, [solanaConnectors, connectSolanaWallet]);

  const connectWindowEthereum = useCallback(() => {
    (window as any).ethereum?.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }],
    });
  }, []);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const isDisconnected =
    status === 'disconnected' || status === 'pending' || status === 'loaded';

  const disconnect = useCallback(async () => {
    await sdkDisconnect();
    disconnectSolanaWallet();
  }, [sdkDisconnect, disconnectSolanaWallet]);

  const availableOptions = Object.keys(FEATURED_NETWORKS).reduce<
    { name: string; value: string }[]
  >((all, networkName) => {
    const networkCaipValue =
      FEATURED_NETWORKS[networkName as keyof typeof FEATURED_NETWORKS];
    all.push({ name: networkName, value: networkCaipValue });
    return all;
  }, []);

  return (
    <div
      data-testid={TEST_IDS.app.container}
      className="min-h-screen bg-gray-50 flex justify-center"
    >
      <div className="max-w-6xl w-full p-8">
        <h1
          data-testid={TEST_IDS.app.title}
          className="text-slate-800 text-4xl font-bold mb-8 text-center"
        >
          MetaMask MultiChain API Test Dapp
        </h1>
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
                className="bg-gray-500 text-white px-5 py-2 rounded text-base hover:bg-gray-600 transition-colors"
              >
                Connecting (Multichain)
              </button>
            )}

            {isDisconnected && (
              <button
                type="button"
                data-testid={TEST_IDS.app.btnConnect()}
                onClick={connect}
                className="bg-blue-500 text-white px-5 py-2 rounded text-base hover:bg-blue-600 transition-colors"
              >
                Connect (Multichain)
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

            {!legacyConnected && (
              <button
                type="button"
                data-testid={TEST_IDS.legacyEvm.btnConnectAndSign}
                onClick={connectLegacyEVMAndSign}
                className="bg-green-700 text-white px-5 py-2 rounded text-base hover:bg-green-800 transition-colors"
              >
                Connect &amp; Sign (Legacy EVM)
              </button>
            )}

            {!wagmiConnected && (
              <button
                type="button"
                data-testid={TEST_IDS.app.btnConnect('wagmi')}
                onClick={connectWagmi}
                disabled={wagmiStatus === 'pending'}
                className="bg-yellow-500 text-white px-5 py-2 rounded text-base hover:bg-yellow-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {wagmiStatus === 'pending'
                  ? 'Connecting...'
                  : 'Connect (Wagmi)'}
              </button>
            )}

            {!solanaConnected && (
              <button
                type="button"
                data-testid={TEST_IDS.app.btnConnect('solana')}
                onClick={connectSolana}
                disabled={solanaConnectors.length === 0}
                className="bg-purple-500 text-white px-5 py-2 rounded text-base hover:bg-purple-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {solanaConnectors.length === 0
                  ? 'Initializing Solana...'
                  : 'Connect (Solana)'}
              </button>
            )}

            <button
              type="button"
              data-testid={TEST_IDS.app.btnConnectWindowEthereum}
              onClick={connectWindowEthereum}
              className="bg-orange-500 text-white px-5 py-2 rounded text-base hover:bg-orange-600 transition-colors"
            >
              Connect (window.ethereum)
            </button>

            {isConnected && scopesHaveChanged() && (
              <button
                type="button"
                data-testid={TEST_IDS.app.btnReconnect}
                onClick={connect}
                className="bg-blue-500 text-white px-5 py-2 rounded text-base hover:bg-blue-600 transition-colors"
              >
                {' '}
                Reconnect (Multichain){' '}
              </button>
            )}

            {(isConnected ||
              legacyConnected ||
              wagmiConnected ||
              solanaConnected) && (
              <button
                type="button"
                data-testid={TEST_IDS.app.btnDisconnect}
                onClick={disconnect}
                className="bg-red-500 text-white px-5 py-2 rounded text-base hover:bg-red-600 transition-colors"
              >
                Disconnect All
              </button>
            )}
          </div>
        </section>
        {(error || legacyError || wagmiError) && (
          <section
            data-testid={TEST_IDS.app.sectionError}
            className="bg-white rounded-lg p-8 mb-6 shadow-sm"
          >
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            {error && (
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">Multichain:</span>{' '}
                {error.message.toString()}
                {(error as any).code && (
                  <span className="ml-2 text-sm text-gray-500">
                    (code: {(error as any).code})
                  </span>
                )}
              </p>
            )}
            {legacyError && (
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">Legacy EVM:</span>{' '}
                {legacyError.message.toString()}
                {(legacyError as any).code && (
                  <span className="ml-2 text-sm text-gray-500">
                    (code: {(legacyError as any).code})
                  </span>
                )}
              </p>
            )}
            {wagmiError && (
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">Wagmi:</span>{' '}
                {wagmiError.message.toString()}
                {(wagmiError as any).code && (
                  <span className="ml-2 text-sm text-gray-500">
                    (code: {(wagmiError as any).code})
                  </span>
                )}
              </p>
            )}
          </section>
        )}
        {legacySignature && (
          <section className="bg-white rounded-lg p-8 mb-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              connectAndSign Result
            </h2>
            <p className="text-xs text-gray-500 mb-1">
              Message: &quot;{CONNECT_AND_SIGN_MESSAGE}&quot;
            </p>
            <p className="font-mono text-sm text-green-700 break-all">
              {legacySignature}
            </p>
          </section>
        )}

        <section
          data-testid={TEST_IDS.app.sectionConnected}
          className="bg-white rounded-lg p-8 mb-6 shadow-sm"
        >
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
                  disconnect={legacyDisconnect}
                />
              </div>
            </section>
          )}
          {wagmiConnected && wagmiAddress && (
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
        {solanaConnected && solanaPublicKey && (
          <section className="bg-white rounded-lg p-8 mb-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Solana Wallet Standard
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SolanaWalletCard />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
