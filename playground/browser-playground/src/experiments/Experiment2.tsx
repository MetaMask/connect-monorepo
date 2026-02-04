/**
 * Experiment 2: Two Multichain Clients (Same Type)
 *
 * Goal: Test if two instances of the SAME SDK type share state (they should)
 *
 * Setup:
 * - Two createMultichainClient instances with SAME dapp.name
 * - They SHOULD share state (same instanceId)
 *
 * Validates:
 * - Connect on Client A → Client B also connected
 * - Disconnect on Client A → Client B also disconnected
 * - Same storage keys for both
 * - Multi-tab: Tab A and Tab B show same state
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { MultichainCore, SessionData, Scope } from '@metamask/connect';
import { createMultichainClient } from '@metamask/connect';
import { ConnectionCard, ActionButton } from './shared';

const DAPP_CONFIG = {
  name: 'Experiment App',
  url: 'https://experiment.metamask.io',
};

// Infura-free public RPC endpoints
const SUPPORTED_NETWORKS = {
  'eip155:1': 'https://eth.llamarpc.com',
  'eip155:11155111': 'https://rpc.sepolia.org',
};

type ClientState = {
  status: 'disconnected' | 'connecting' | 'connected';
  session?: SessionData | undefined;
  error?: string | undefined;
};

export function Experiment2() {
  // Client A
  const clientARef = useRef<MultichainCore | null>(null);
  const [stateA, setStateA] = useState<ClientState>({ status: 'disconnected' });

  // Client B
  const clientBRef = useRef<MultichainCore | null>(null);
  const [stateB, setStateB] = useState<ClientState>({ status: 'disconnected' });

  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize both SDK clients
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Create Client A
        const clientA = await createMultichainClient({
          dapp: DAPP_CONFIG,
          api: { supportedNetworks: SUPPORTED_NETWORKS },
          // instanceId will be auto-generated: 'experiment-app-multichain'
        });

        if (!mounted) return;
        clientARef.current = clientA;

        // Listen for Client A session changes
        clientA.on('wallet_sessionChanged', (session: unknown) => {
          const sessionData = session as SessionData | undefined;
          if (sessionData && Object.keys(sessionData.sessionScopes || {}).length > 0) {
            setStateA({ status: 'connected', session: sessionData });
          } else {
            setStateA({ status: 'disconnected' });
          }
        });

        // Check if Client A already connected
        if (clientA.status === 'connected') {
          setStateA({ status: 'connected' });
        }

        // Create Client B (with SAME dapp config - should share state)
        const clientB = await createMultichainClient({
          dapp: DAPP_CONFIG, // Same dapp.name!
          api: { supportedNetworks: SUPPORTED_NETWORKS },
          // instanceId will be auto-generated: 'experiment-app-multichain' (same as A)
        });

        if (!mounted) return;
        clientBRef.current = clientB;

        // Listen for Client B session changes
        clientB.on('wallet_sessionChanged', (session: unknown) => {
          const sessionData = session as SessionData | undefined;
          if (sessionData && Object.keys(sessionData.sessionScopes || {}).length > 0) {
            setStateB({ status: 'connected', session: sessionData });
          } else {
            setStateB({ status: 'disconnected' });
          }
        });

        // Check if Client B already connected
        if (clientB.status === 'connected') {
          setStateB({ status: 'connected' });
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

  // Client A connect/disconnect
  const connectA = useCallback(async () => {
    if (!clientARef.current) return;
    setStateA((prev) => ({ ...prev, status: 'connecting' }));
    try {
      await clientARef.current.connect(['eip155:1'] as Scope[], []);
    } catch (error) {
      setStateA({
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }, []);

  const disconnectA = useCallback(async () => {
    if (!clientARef.current) return;
    await clientARef.current.disconnect();
    setStateA({ status: 'disconnected' });
  }, []);

  // Client B connect/disconnect
  const connectB = useCallback(async () => {
    if (!clientBRef.current) return;
    setStateB((prev) => ({ ...prev, status: 'connecting' }));
    try {
      await clientBRef.current.connect(['eip155:1'] as Scope[], []);
    } catch (error) {
      setStateB({
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }, []);

  const disconnectB = useCallback(async () => {
    if (!clientBRef.current) return;
    await clientBRef.current.disconnect();
    setStateB({ status: 'disconnected' });
  }, []);

  // Extract accounts from sessions
  const getAccounts = (session?: SessionData): string[] => {
    if (!session?.sessionScopes) return [];
    const accounts: string[] = [];
    for (const scopeData of Object.values(session.sessionScopes)) {
      const scopeAccounts = (scopeData as { accounts?: string[] }).accounts;
      if (scopeAccounts) {
        accounts.push(...scopeAccounts);
      }
    }
    return accounts;
  };

  const getChainId = (session?: SessionData): string | undefined => {
    if (!session?.sessionScopes) return undefined;
    const keys = Object.keys(session.sessionScopes);
    return keys[0] || undefined;
  };

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
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">
          Experiment 2: Two Multichain Clients (Same Type)
        </h2>
        <p className="text-sm text-yellow-700">
          Both clients use the same <code>dapp.name</code>, so they should{' '}
          <strong>share the same state</strong>. Connecting one should make the
          other appear connected too.
        </p>
        <div className="mt-2 p-2 bg-white rounded border border-yellow-200">
          <p className="text-xs text-gray-600">
            <strong>Both clients use instanceId:</strong>{' '}
            <code className="text-blue-600">experiment-app-multichain</code>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            <strong>Expected behavior:</strong> They share storage, so connect
            on A should make B connected too.
          </p>
        </div>
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client A */}
        <ConnectionCard
          title="Multichain Client A"
          subtitle="First createMultichainClient() instance"
          status={stateA.status}
          instanceId="experiment-app-multichain"
          accounts={getAccounts(stateA.session)}
          chainId={getChainId(stateA.session)}
          error={stateA.error}
        >
          {stateA.status === 'disconnected' && (
            <ActionButton onClick={connectA}>Connect Client A</ActionButton>
          )}
          {stateA.status === 'connecting' && (
            <ActionButton onClick={() => {}} disabled>
              Connecting...
            </ActionButton>
          )}
          {stateA.status === 'connected' && (
            <ActionButton onClick={disconnectA} variant="danger">
              Disconnect Client A
            </ActionButton>
          )}
        </ConnectionCard>

        {/* Client B */}
        <ConnectionCard
          title="Multichain Client B"
          subtitle="Second createMultichainClient() instance"
          status={stateB.status}
          instanceId="experiment-app-multichain"
          accounts={getAccounts(stateB.session)}
          chainId={getChainId(stateB.session)}
          error={stateB.error}
        >
          {stateB.status === 'disconnected' && (
            <ActionButton onClick={connectB}>Connect Client B</ActionButton>
          )}
          {stateB.status === 'connecting' && (
            <ActionButton onClick={() => {}} disabled>
              Connecting...
            </ActionButton>
          )}
          {stateB.status === 'connected' && (
            <ActionButton onClick={disconnectB} variant="danger">
              Disconnect Client B
            </ActionButton>
          )}
        </ConnectionCard>
      </div>

      {/* Checklist */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3">
          Shared State Checklist
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" />
            <span>
              Connect Client A → Does Client B show <strong>Connected</strong>?
            </span>
          </li>
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" />
            <span>
              Both cards show the <strong>same accounts</strong> and{' '}
              <strong>same chainId</strong>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" />
            <span>
              Storage shows only <strong>one set of keys</strong> (prefixed with{' '}
              <code>experiment-app-multichain:</code>)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" />
            <span>
              Disconnect Client A → Does Client B also show{' '}
              <strong>Disconnected</strong>?
            </span>
          </li>
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" />
            <span>
              <strong>Multi-tab test:</strong> Open this page in two tabs.
              Connect in one tab. Does the other tab show connected?
            </span>
          </li>
        </ul>
      </div>

      {/* Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Note</h3>
        <p className="text-sm text-blue-700">
          Because both clients share the same <code>instanceId</code>, they
          read/write to the same storage keys. However, the React state is
          separate - you may need to refresh or wait for events to propagate
          between clients.
        </p>
      </div>
    </div>
  );
}
