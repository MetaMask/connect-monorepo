import { useState, useCallback, useRef } from 'react';

import {
  hasCachedCore,
  getCachedCore,
} from '@metamask/connect-multichain';
import {
  createEVMClient,
  type MetamaskConnectEVM,
} from '@metamask/connect-evm';

import { ConnectionCard, ActionButton, type ConnectionStatus } from './shared';

const DAPP_NAME = 'Experiment 8 - Disconnect Coordination';

/**
 * Experiment 8: Disconnect Coordination
 *
 * This experiment verifies that:
 * 1. Each client must call connect() to register itself
 * 2. Disconnecting one client doesn't disconnect others
 * 3. Only when the last client disconnects is the session revoked
 * 4. Client registration and reference counting work correctly
 */
export function Experiment8() {
  const [clientCount, setClientCount] = useState(0);
  const [hasCached, setHasCached] = useState(hasCachedCore());
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Track per-client state (since the shared core status doesn't tell us per-client info)
  const [client1Created, setClient1Created] = useState(false);
  const [client2Created, setClient2Created] = useState(false);
  const [client1Connected, setClient1Connected] = useState(false);
  const [client2Connected, setClient2Connected] = useState(false);
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
    const core = getCachedCore();
    if (core && typeof (core as { getClientCount?: () => number }).getClientCount === 'function') {
      const count = (core as { getClientCount: () => number }).getClientCount();
      setClientCount(count);
      addLog(`Refreshed: Core exists, ${count} registered clients`);
    } else {
      setClientCount(0);
      addLog('Refreshed: No core or no getClientCount method');
    }
  }, [addLog]);

  const createClient1 = useCallback(async () => {
    try {
      setError(null);
      addLog('Creating EVM Client 1...');
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
      addLog(`Error: ${msg}`);
    }
  }, [addLog, refreshState]);

  const createClient2 = useCallback(async () => {
    try {
      setError(null);
      addLog('Creating EVM Client 2...');
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
      evmClient2Ref.current = client;
      setClient2Created(true);
      addLog('EVM Client 2 created (not yet connected)');
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error: ${msg}`);
    }
  }, [addLog, refreshState]);

  const connectClient1 = useCallback(async () => {
    if (!evmClient1Ref.current) return;
    try {
      setError(null);
      addLog('Connecting Client 1...');
      const result = await evmClient1Ref.current.connect({ chainIds: ['0x1'] });
      setClient1Connected(true);
      setClient1Accounts(result.accounts);
      setClient1ChainId(result.chainId);
      addLog(`Client 1 connected! Accounts: ${result.accounts.join(', ')}, Chain: ${result.chainId}`);
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error connecting Client 1: ${msg}`);
    }
  }, [addLog, refreshState]);

  const connectClient2 = useCallback(async () => {
    if (!evmClient2Ref.current) return;
    try {
      setError(null);
      addLog('Connecting Client 2...');
      const result = await evmClient2Ref.current.connect({ chainIds: ['0x1'] });
      setClient2Connected(true);
      setClient2Accounts(result.accounts);
      setClient2ChainId(result.chainId);
      addLog(`Client 2 connected! Accounts: ${result.accounts.join(', ')}, Chain: ${result.chainId}`);
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error connecting Client 2: ${msg}`);
    }
  }, [addLog, refreshState]);

  const disconnectClient1 = useCallback(async () => {
    if (!evmClient1Ref.current) return;
    try {
      setError(null);
      addLog('Disconnecting Client 1...');
      await evmClient1Ref.current.disconnect();
      setClient1Connected(false);
      setClient1Accounts([]);
      setClient1ChainId(undefined);
      addLog('Client 1 disconnected');
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error disconnecting Client 1: ${msg}`);
    }
  }, [addLog, refreshState]);

  const disconnectClient2 = useCallback(async () => {
    if (!evmClient2Ref.current) return;
    try {
      setError(null);
      addLog('Disconnecting Client 2...');
      await evmClient2Ref.current.disconnect();
      setClient2Connected(false);
      setClient2Accounts([]);
      setClient2ChainId(undefined);
      addLog('Client 2 disconnected');
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
  const getStatus = (created: boolean, connected: boolean): ConnectionStatus => {
    if (!created) return 'disconnected';
    if (connected) return 'connected';
    return 'disconnected';
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Experiment 8: Disconnect Coordination</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Verifies that disconnecting one client doesn't disconnect others.
        Only when the last client disconnects is the session actually revoked.
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
          </tbody>
        </table>
        <div className="mt-3">
          <ActionButton onClick={refreshState} variant="secondary">
            Refresh State
          </ActionButton>
        </div>
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* EVM Client 1 */}
        <ConnectionCard
          title="EVM Client 1"
          status={getStatus(client1Created, client1Connected)}
          accounts={client1Accounts}
          chainId={client1ChainId}
        >
          <div className="space-y-2">
            {!client1Created && (
              <ActionButton onClick={createClient1} variant="primary">
                Create Client 1
              </ActionButton>
            )}
            {client1Created && !client1Connected && (
              <ActionButton onClick={connectClient1} variant="primary">
                Connect
              </ActionButton>
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
          status={getStatus(client2Created, client2Connected)}
          accounts={client2Accounts}
          chainId={client2ChainId}
        >
          <div className="space-y-2">
            {!client2Created && (
              <ActionButton onClick={createClient2} variant="primary">
                Create Client 2
              </ActionButton>
            )}
            {client2Created && !client2Connected && (
              <ActionButton onClick={connectClient2} variant="primary">
                Connect
              </ActionButton>
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

      {/* Test Steps */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="m-0 mb-3 text-lg font-semibold text-blue-800">
          Test Steps
        </h3>
        <ol className="m-0 pl-5 space-y-2 text-blue-700">
          <li>Create both Client 1 and Client 2</li>
          <li>Connect Client 1 (scan QR or use extension) → Count = 1</li>
          <li>Connect Client 2 (should connect instantly) → Count = 2</li>
          <li>Disconnect Client 1 → Count = 1, Client 2 still connected!</li>
          <li>Disconnect Client 2 → Count = 0, session revoked</li>
        </ol>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <strong>Note:</strong> Each client must call connect() to register. 
          Creating a client doesn't register it - the count only increases when connect() is called.
        </div>
      </div>
    </div>
  );
}
