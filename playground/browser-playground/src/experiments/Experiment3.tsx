/**
 * Experiment 3: Multichain + EVM (Different Types)
 *
 * Goal: Test that different SDK types are isolated
 *
 * Setup:
 * - One createMultichainClient
 * - One createEVMClient
 * - Same dapp.name for both
 *
 * Validates:
 * - Connect Multichain → EVM NOT connected
 * - Connect EVM → Multichain NOT connected
 * - Disconnect Multichain → EVM unaffected
 * - Different storage key prefixes visible
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { MultichainCore, SessionData, Scope } from '@metamask/connect-multichain';
import { createMultichainClient } from '@metamask/connect-multichain';
import type { MetamaskConnectEVM } from '@metamask/connect-evm';
import { createEVMClient } from '@metamask/connect-evm';
import { ConnectionCard, ActionButton } from './shared';

const DAPP_CONFIG = {
  name: 'Experiment App',
  url: 'https://experiment.metamask.io',
};

// Infura-free public RPC endpoints
const SUPPORTED_NETWORKS_CAIP = {
  'eip155:1': 'https://eth.llamarpc.com',
  'eip155:11155111': 'https://rpc.sepolia.org',
};

const SUPPORTED_NETWORKS_HEX = {
  '0x1': 'https://eth.llamarpc.com',
  '0xaa36a7': 'https://rpc.sepolia.org',
} as const;

type MultichainState = {
  status: 'disconnected' | 'connecting' | 'connected';
  session?: SessionData | undefined;
  error?: string | undefined;
};

type EVMState = {
  status: 'disconnected' | 'connecting' | 'connected';
  accounts: string[];
  chainId?: string | undefined;
  error?: string | undefined;
};

export function Experiment3() {
  const multichainRef = useRef<MultichainCore | null>(null);
  const evmRef = useRef<MetamaskConnectEVM | null>(null);

  const [multichainState, setMultichainState] = useState<MultichainState>({
    status: 'disconnected',
  });
  const [evmState, setEvmState] = useState<EVMState>({
    status: 'disconnected',
    accounts: [],
  });
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize both SDKs
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Initialize Multichain client
        const multichainClient = await createMultichainClient({
          dapp: DAPP_CONFIG,
          api: { supportedNetworks: SUPPORTED_NETWORKS_CAIP },
          // instanceId auto-generated: 'experiment-app-multichain'
        });

        if (!mounted) return;
        multichainRef.current = multichainClient;

        // Listen for multichain session changes
        multichainClient.on(
          'wallet_sessionChanged',
          (session: unknown) => {
            const sessionData = session as SessionData | undefined;
            if (sessionData && Object.keys(sessionData.sessionScopes || {}).length > 0) {
              setMultichainState({ status: 'connected', session: sessionData });
            } else {
              setMultichainState({ status: 'disconnected' });
            }
          },
        );

        // Check if multichain already connected (session comes via event)
        if (multichainClient.status === 'connected') {
          setMultichainState({ status: 'connected' });
        }

        // Initialize EVM client
        const evmClient = await createEVMClient({
          dapp: DAPP_CONFIG,
          api: { supportedNetworks: SUPPORTED_NETWORKS_HEX },
          // instanceId auto-generated: 'experiment-app-evm'
        });

        if (!mounted) return;
        evmRef.current = evmClient;

        const provider = evmClient.getProvider();

        // Listen for EVM events
        provider.on('connect', () => {
          setEvmState({
            status: 'connected',
            accounts: evmClient.accounts as string[],
            chainId: evmClient.selectedChainId ?? undefined,
          });
        });

        provider.on('disconnect', () => {
          setEvmState({ status: 'disconnected', accounts: [] });
        });

        provider.on('accountsChanged', (accounts: unknown) => {
          setEvmState((prev) => ({ ...prev, accounts: accounts as string[] }));
        });

        provider.on('chainChanged', (chainId: unknown) => {
          setEvmState((prev) => ({ ...prev, chainId: chainId as string }));
        });

        // Check if EVM already connected
        if (evmClient.status === 'connected' && evmClient.accounts.length > 0) {
          setEvmState({
            status: 'connected',
            accounts: evmClient.accounts as string[],
            chainId: evmClient.selectedChainId ?? undefined,
          });
        }

        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize SDKs:', error);
        setIsInitializing(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Multichain connect/disconnect
  const connectMultichain = useCallback(async () => {
    if (!multichainRef.current) return;
    setMultichainState((prev) => ({ ...prev, status: 'connecting' }));
    try {
      // connect requires (scopes, caipAccountIds)
      await multichainRef.current.connect(['eip155:1'] as Scope[], []);
    } catch (error) {
      setMultichainState({
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }, []);

  const disconnectMultichain = useCallback(async () => {
    if (!multichainRef.current) return;
    await multichainRef.current.disconnect();
    setMultichainState({ status: 'disconnected' });
  }, []);

  // EVM connect/disconnect
  const connectEVM = useCallback(async () => {
    if (!evmRef.current) return;
    setEvmState((prev) => ({ ...prev, status: 'connecting' }));
    try {
      const result = await evmRef.current.connect({ chainIds: ['0x1'] });
      setEvmState({
        status: 'connected',
        accounts: result.accounts,
        chainId: result.chainId,
      });
    } catch (error) {
      setEvmState({
        status: 'disconnected',
        accounts: [],
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }, []);

  const disconnectEVM = useCallback(async () => {
    if (!evmRef.current) return;
    await evmRef.current.disconnect();
    setEvmState({ status: 'disconnected', accounts: [] });
  }, []);

  // Extract multichain accounts - cast the sessionScopes values properly
  const multichainAccounts: string[] = [];
  if (multichainState.session?.sessionScopes) {
    for (const scopeData of Object.values(multichainState.session.sessionScopes)) {
      const accounts = (scopeData as { accounts?: string[] }).accounts;
      if (accounts) {
        multichainAccounts.push(...accounts);
      }
    }
  }

  const multichainChainId = multichainState.session?.sessionScopes
    ? Object.keys(multichainState.session.sessionScopes)[0]
    : '';

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Initializing SDKs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Experiment Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-purple-800 mb-2">
          Experiment 3: Multichain + EVM (Different Types)
        </h2>
        <p className="text-sm text-purple-700">
          This experiment tests that Multichain and EVM clients are{' '}
          <strong>isolated</strong> from each other. Connecting one should NOT
          affect the other.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="p-2 bg-white rounded border border-purple-200">
            <p className="text-xs text-gray-600">
              <strong>Multichain instanceId:</strong>
            </p>
            <code className="text-xs text-blue-600">
              experiment-app-multichain
            </code>
          </div>
          <div className="p-2 bg-white rounded border border-purple-200">
            <p className="text-xs text-gray-600">
              <strong>EVM instanceId:</strong>
            </p>
            <code className="text-xs text-green-600">experiment-app-evm</code>
          </div>
        </div>
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Multichain */}
        <ConnectionCard
          title="Multichain Client"
          subtitle="createMultichainClient()"
          status={multichainState.status}
          instanceId="experiment-app-multichain"
          accounts={multichainAccounts}
          chainId={multichainChainId || undefined}
          error={multichainState.error}
        >
          {multichainState.status === 'disconnected' && (
            <ActionButton onClick={connectMultichain}>Connect</ActionButton>
          )}
          {multichainState.status === 'connecting' && (
            <ActionButton onClick={() => {}} disabled>
              Connecting...
            </ActionButton>
          )}
          {multichainState.status === 'connected' && (
            <ActionButton onClick={disconnectMultichain} variant="danger">
              Disconnect
            </ActionButton>
          )}
        </ConnectionCard>

        {/* EVM */}
        <ConnectionCard
          title="EVM Client"
          subtitle="createEVMClient()"
          status={evmState.status}
          instanceId="experiment-app-evm"
          accounts={evmState.accounts}
          chainId={evmState.chainId || undefined}
          error={evmState.error}
        >
          {evmState.status === 'disconnected' && (
            <ActionButton onClick={connectEVM}>Connect</ActionButton>
          )}
          {evmState.status === 'connecting' && (
            <ActionButton onClick={() => {}} disabled>
              Connecting...
            </ActionButton>
          )}
          {evmState.status === 'connected' && (
            <ActionButton onClick={disconnectEVM} variant="danger">
              Disconnect
            </ActionButton>
          )}
        </ConnectionCard>
      </div>

      {/* Checklist */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3">
          Isolation Checklist
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" />
            <span>
              Connect Multichain → EVM status stays{' '}
              <strong>Disconnected</strong>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" />
            <span>
              Connect EVM (new QR scan) → Multichain status unchanged
            </span>
          </li>
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" />
            <span>
              Storage shows <strong>two different prefixes</strong>:{' '}
              <code>experiment-app-multichain:</code> and{' '}
              <code>experiment-app-evm:</code>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" />
            <span>
              Disconnect Multichain → EVM stays <strong>Connected</strong>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" />
            <span>
              Disconnect EVM → Multichain unaffected (if still connected)
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
