/**
 * Experiment 1: Single Client Baseline
 *
 * Goal: Verify basic connect/disconnect/sign works with isolation
 *
 * Setup:
 * - One createMultichainClient instance
 * - Uses consistent dapp.name for reproducible instanceId
 *
 * Validates:
 * - Connect shows QR → scanning connects
 * - Sign transaction works
 * - Disconnect clears state
 * - Refresh restores session
 * - Storage shows prefixed keys
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { MultichainCore, SessionData, Scope } from '@metamask/connect-multichain';
import { createMultichainClient } from '@metamask/connect-multichain';
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

export function Experiment1() {
  const clientRef = useRef<MultichainCore | null>(null);
  const [state, setState] = useState<ClientState>({ status: 'disconnected' });
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize the SDK
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const client = await createMultichainClient({
          dapp: DAPP_CONFIG,
          api: { supportedNetworks: SUPPORTED_NETWORKS },
          // instanceId will be auto-generated: 'experiment-app-multichain'
        });

        if (!mounted) return;

        clientRef.current = client;

        // Listen for session changes
        client.on('wallet_sessionChanged', (session: unknown) => {
          const sessionData = session as SessionData | undefined;
          if (sessionData && Object.keys(sessionData.sessionScopes || {}).length > 0) {
            setState({ status: 'connected', session: sessionData });
          } else {
            setState({ status: 'disconnected' });
          }
        });

        // Listen for status changes
        client.on('stateChanged', (status: unknown) => {
          if (status === 'connecting') {
            setState((prev) => ({ ...prev, status: 'connecting' }));
          }
        });

        // Check if already connected (session will come through event)
        if (client.status === 'connected') {
          // Wait for session event, or set connected without session
          setState({ status: 'connected' });
        }

        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize SDK:', error);
        setState({
          status: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        setIsInitializing(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const connect = useCallback(async () => {
    if (!clientRef.current) return;

    setState((prev) => ({ ...prev, status: 'connecting' }));

    try {
      // connect requires (scopes, caipAccountIds)
      await clientRef.current.connect(['eip155:1'] as Scope[], []);
    } catch (error) {
      console.error('Connect failed:', error);
      setState({
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      await clientRef.current.disconnect();
      setState({ status: 'disconnected' });
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }, []);

  // Extract accounts from session
  const accounts: string[] = [];
  if (state.session?.sessionScopes) {
    for (const scopeData of Object.values(state.session.sessionScopes)) {
      const scopeAccounts = (scopeData as { accounts?: string[] }).accounts;
      if (scopeAccounts) {
        accounts.push(...scopeAccounts);
      }
    }
  }

  // Get first chain from session
  const chainId = state.session?.sessionScopes
    ? Object.keys(state.session.sessionScopes)[0]
    : '';

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Initializing SDK...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Experiment Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">
          Experiment 1: Single Client Baseline
        </h2>
        <p className="text-sm text-blue-700">
          This experiment tests a single multichain client. Connect, verify the
          session is stored with a prefixed key, then disconnect.
        </p>
        <div className="mt-2 p-2 bg-white rounded border border-blue-200">
          <p className="text-xs text-gray-600">
            <strong>Expected instanceId:</strong>{' '}
            <code className="text-blue-600">experiment-app-multichain</code>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            <strong>Storage keys should be prefixed with:</strong>{' '}
            <code className="text-blue-600">experiment-app-multichain:</code>
          </p>
        </div>
      </div>

      {/* Client Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ConnectionCard
          title="Multichain Client"
          subtitle="createMultichainClient()"
          status={state.status}
          instanceId="experiment-app-multichain"
          accounts={accounts}
          chainId={chainId || undefined}
          error={state.error}
        >
          {state.status === 'disconnected' && (
            <ActionButton onClick={connect}>Connect</ActionButton>
          )}
          {state.status === 'connecting' && (
            <ActionButton onClick={() => {}} disabled>
              Connecting...
            </ActionButton>
          )}
          {state.status === 'connected' && (
            <ActionButton onClick={disconnect} variant="danger">
              Disconnect
            </ActionButton>
          )}
        </ConnectionCard>

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Checklist</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <span>Click Connect → QR code appears</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <span>Scan with MetaMask Mobile → Connected</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <span>
                Check Storage State below → Keys prefixed with{' '}
                <code>experiment-app-multichain:</code>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <span>Refresh page → Session restores automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <span>Click Disconnect → Status changes, storage cleared</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
