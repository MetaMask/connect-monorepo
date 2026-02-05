import { useState, useCallback, useRef } from 'react';

import {
  hasCachedCore,
  getCachedCore,
  type MultichainCore,
} from '@metamask/connect-multichain';
import {
  createEVMClient,
  type MetamaskConnectEVM,
} from '@metamask/connect-evm';

import { ConnectionCard, ActionButton, type ConnectionStatus } from './shared';

const DAPP_NAME = 'Experiment 9 - Scope Merging';

/**
 * Experiment 9: Scope Merging on Connect
 *
 * This experiment verifies Phase 3: Scope Tracking & Merging:
 * 1. EVM Client 1 connects with chainIds [1] (eip155:1)
 * 2. EVM Client 2 connects with chainIds [1, 137] (eip155:1, eip155:137)
 * 3. Expected: Scopes are merged to [eip155:1, eip155:137], no revoke happens
 * 4. The getUnionScopes() method returns the merged scopes
 */
export function Experiment9() {
  const [clientCount, setClientCount] = useState(0);
  const [hasCached, setHasCached] = useState(hasCachedCore());
  const [unionScopes, setUnionScopes] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Track per-client state
  const [client1Created, setClient1Created] = useState(false);
  const [client2Created, setClient2Created] = useState(false);
  const [client1Connected, setClient1Connected] = useState(false);
  const [client2Connected, setClient2Connected] = useState(false);
  const [client1Connecting, setClient1Connecting] = useState(false);
  const [client2Connecting, setClient2Connecting] = useState(false);
  const [client1Accounts, setClient1Accounts] = useState<string[]>([]);
  const [client2Accounts, setClient2Accounts] = useState<string[]>([]);
  const [client1ChainId, setClient1ChainId] = useState<string | undefined>();
  const [client2ChainId, setClient2ChainId] = useState<string | undefined>();

  const evmClient1Ref = useRef<MetamaskConnectEVM | null>(null);
  const evmClient2Ref = useRef<MetamaskConnectEVM | null>(null);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const refreshState = useCallback(() => {
    setHasCached(hasCachedCore());
    const core = getCachedCore() as MultichainCore & { 
      getClientCount?: () => number;
      getUnionScopes?: () => string[];
    } | undefined;
    
    if (core && typeof core.getClientCount === 'function') {
      const count = core.getClientCount();
      setClientCount(count);
      
      if (typeof core.getUnionScopes === 'function') {
        const scopes = core.getUnionScopes();
        setUnionScopes(scopes);
        addLog(`Refreshed: Core exists, ${count} clients, union scopes: [${scopes.join(', ')}]`);
      } else {
        addLog(`Refreshed: Core exists, ${count} clients, no getUnionScopes method`);
      }
    } else {
      setClientCount(0);
      setUnionScopes([]);
      addLog('Refreshed: No core or no getClientCount method');
    }
  }, [addLog]);

  const createClient1 = useCallback(async () => {
    try {
      setError(null);
      addLog('Creating EVM Client 1 (will request eip155:1)...');
      const client = await createEVMClient({
        dapp: {
          name: DAPP_NAME,
          url: window.location.href,
        },
        api: {
          supportedNetworks: {
            '0x1': 'https://mainnet.infura.io/v3/YOUR_KEY',
          },
        },
      });
      evmClient1Ref.current = client;
      setClient1Created(true);
      addLog('EVM Client 1 created (not yet connected)');
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error creating Client 1: ${msg}`);
    }
  }, [addLog, refreshState]);

  const createClient2 = useCallback(async () => {
    try {
      setError(null);
      addLog('Creating EVM Client 2 (will request eip155:1, eip155:137)...');
      const client = await createEVMClient({
        dapp: {
          name: DAPP_NAME,
          url: window.location.href,
        },
        api: {
          supportedNetworks: {
            '0x1': 'https://mainnet.infura.io/v3/YOUR_KEY',
            '0x89': 'https://polygon-mainnet.infura.io/v3/YOUR_KEY',
          },
        },
      });
      evmClient2Ref.current = client;
      setClient2Created(true);
      addLog('EVM Client 2 created (not yet connected)');
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error creating Client 2: ${msg}`);
    }
  }, [addLog, refreshState]);

  const connectClient1 = useCallback(async () => {
    if (!evmClient1Ref.current) {
      setError('Client 1 not created');
      return;
    }
    try {
      setError(null);
      setClient1Connecting(true);
      addLog('Connecting Client 1 with chainIds [0x1] (Ethereum Mainnet)...');
      addLog('⏳ Waiting for wallet approval (check your phone if using QR code)...');
      const result = await evmClient1Ref.current.connect({ chainIds: ['0x1'] });
      setClient1Connected(true);
      setClient1Accounts(result.accounts);
      setClient1ChainId(result.chainId);
      addLog(`Client 1 connected: ${result.accounts.length} accounts, chainId: ${result.chainId}`);
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error connecting Client 1: ${msg}`);
    } finally {
      setClient1Connecting(false);
    }
  }, [addLog, refreshState]);

  const connectClient2 = useCallback(async () => {
    if (!evmClient2Ref.current) {
      setError('Client 2 not created');
      return;
    }
    try {
      setError(null);
      setClient2Connecting(true);
      addLog('Connecting Client 2 with chainIds [0x1, 0x89] (Ethereum + Polygon)...');
      addLog('Expected: Should MERGE scopes without revoking existing session');
      addLog('⏳ Waiting for wallet approval (check your phone if using QR code)...');
      const result = await evmClient2Ref.current.connect({ chainIds: ['0x1', '0x89'] });
      setClient2Connected(true);
      setClient2Accounts(result.accounts);
      setClient2ChainId(result.chainId);
      addLog(`Client 2 connected: ${result.accounts.length} accounts, chainId: ${result.chainId}`);
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error connecting Client 2: ${msg}`);
    } finally {
      setClient2Connecting(false);
    }
  }, [addLog, refreshState]);

  const disconnectClient1 = useCallback(async () => {
    if (!evmClient1Ref.current) {
      setError('Client 1 not created');
      return;
    }
    try {
      setError(null);
      addLog('Disconnecting Client 1...');
      await evmClient1Ref.current.disconnect();
      setClient1Connected(false);
      setClient1Accounts([]);
      setClient1ChainId(undefined);
      addLog('Client 1 disconnected (unregistered from core)');
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error disconnecting Client 1: ${msg}`);
    }
  }, [addLog, refreshState]);

  const disconnectClient2 = useCallback(async () => {
    if (!evmClient2Ref.current) {
      setError('Client 2 not created');
      return;
    }
    try {
      setError(null);
      addLog('Disconnecting Client 2...');
      await evmClient2Ref.current.disconnect();
      setClient2Connected(false);
      setClient2Accounts([]);
      setClient2ChainId(undefined);
      addLog('Client 2 disconnected (unregistered from core)');
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error disconnecting Client 2: ${msg}`);
    }
  }, [addLog, refreshState]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Helper to get status for ConnectionCard
  const getStatus = (created: boolean, connected: boolean, connecting: boolean): ConnectionStatus => {
    if (!created) return 'disconnected';
    if (connecting) return 'connecting';
    if (connected) return 'connected';
    return 'disconnected';
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Experiment 9: Scope Merging on Connect</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Verifies that when a second client connects with different scopes,
        they are merged with the existing session instead of revoking and recreating.
      </p>

      {/* State Display */}
      <div className="bg-gray-100 p-4 rounded-lg mb-5">
        <h3 className="m-0 mb-3 text-lg font-semibold">Core State</h3>
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-1 text-gray-600">Has Cached Core:</td>
              <td>{hasCached ? '✅ Yes' : '❌ No'}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-600">Registered Client Count:</td>
              <td className="font-semibold text-xl">{clientCount}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-600">Union of All Scopes:</td>
              <td className="font-mono text-sm">
                {unionScopes.length > 0 ? `[${unionScopes.join(', ')}]` : '[]'}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="mt-3">
          <ActionButton onClick={refreshState} variant="secondary">
            Refresh State
          </ActionButton>
        </div>
      </div>

      {/* Expected Behavior */}
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-5">
        <h3 className="m-0 mb-2 text-lg font-semibold text-green-800">Expected Behavior</h3>
        <ol className="m-0 pl-5 text-sm text-green-700" style={{ lineHeight: 1.8 }}>
          <li>Create Client 1 → Core created, 0 registered clients</li>
          <li>Connect Client 1 (Ethereum) → 1 registered client, scopes: [eip155:1]</li>
          <li>Create Client 2 → Still 1 registered client (not connected yet)</li>
          <li><strong>Connect Client 2 (Ethereum + Polygon) → Should NOT show new QR code prompt</strong></li>
          <li>After Client 2 connects → 2 registered clients, scopes: [eip155:1, eip155:137]</li>
          <li>Disconnect Client 1 → 1 registered client, session still active</li>
          <li>Disconnect Client 2 → 0 registered clients, session revoked</li>
        </ol>
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* EVM Client 1 */}
        <ConnectionCard
          title="EVM Client 1"
          subtitle="Ethereum Mainnet only (eip155:1)"
          status={getStatus(client1Created, client1Connected, client1Connecting)}
          accounts={client1Accounts}
          chainId={client1ChainId}
        >
          <div className="space-y-2">
            {!client1Created && (
              <ActionButton onClick={createClient1} variant="primary">
                Create Client 1
              </ActionButton>
            )}
            {client1Created && !client1Connected && !client1Connecting && (
              <ActionButton onClick={connectClient1} variant="primary">
                Connect
              </ActionButton>
            )}
            {client1Connecting && (
              <div className="flex items-center gap-2 text-blue-600">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Waiting for approval...</span>
              </div>
            )}
            {client1Created && client1Connected && (
              <ActionButton onClick={disconnectClient1} variant="danger">
                Disconnect
              </ActionButton>
            )}
          </div>
        </ConnectionCard>

        {/* EVM Client 2 */}
        <ConnectionCard
          title="EVM Client 2"
          subtitle="Ethereum + Polygon (eip155:1, eip155:137)"
          status={getStatus(client2Created, client2Connected, client2Connecting)}
          accounts={client2Accounts}
          chainId={client2ChainId}
        >
          <div className="space-y-2">
            {!client2Created && (
              <ActionButton onClick={createClient2} variant="primary">
                Create Client 2
              </ActionButton>
            )}
            {client2Created && !client2Connected && !client2Connecting && (
              <ActionButton onClick={connectClient2} variant="primary">
                Connect
              </ActionButton>
            )}
            {client2Connecting && (
              <div className="flex items-center gap-2 text-blue-600">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Waiting for approval...</span>
              </div>
            )}
            {client2Created && client2Connected && (
              <ActionButton onClick={disconnectClient2} variant="danger">
                Disconnect
              </ActionButton>
            )}
          </div>
        </ConnectionCard>
      </div>

      {/* Logs */}
      <div className="bg-gray-900 text-green-400 p-4 rounded-lg mb-5 font-mono text-sm max-h-48 overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Activity Log</span>
          <button
            onClick={clearLogs}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear
          </button>
        </div>
        {logs.length === 0 ? (
          <div className="text-gray-500">No activity yet...</div>
        ) : (
          logs.map((log, i) => <div key={i}>{log}</div>)
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-5">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
