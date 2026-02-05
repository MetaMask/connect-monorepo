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

const DAPP_NAME = 'Experiment 10 - Partial Disconnect';

/**
 * Experiment 10: Partial Disconnect (Scope Revocation)
 *
 * This experiment verifies Phase 4: when a client disconnects, only its scopes
 * are removed from the session. Other clients remain connected.
 *
 * Expected behavior:
 * 1. Connect Client 1 (Ethereum only) → scopes: [eip155:1]
 * 2. Connect Client 2 (Ethereum + Polygon) → scopes: [eip155:1, eip155:137]
 * 3. Disconnect Client 2 → scopes should reduce to [eip155:1] (Client 1's scopes)
 * 4. Client 1 should still be able to make requests
 * 5. Disconnect Client 1 → full session revocation
 */
export function Experiment10() {
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
        addLog(`Refreshed: ${count} clients, union scopes: [${scopes.join(', ')}]`);
      } else {
        addLog(`Refreshed: ${count} clients, no getUnionScopes method`);
      }
    } else {
      setClientCount(0);
      setUnionScopes([]);
      addLog('Refreshed: No core');
    }
  }, [addLog]);

  const createClient1 = useCallback(async () => {
    try {
      setError(null);
      addLog('Creating EVM Client 1 (Ethereum only)...');
      const client = await createEVMClient({
        dapp: { name: DAPP_NAME, url: window.location.href },
        api: { supportedNetworks: { '0x1': 'https://mainnet.infura.io/v3/YOUR_KEY' } },
      });
      evmClient1Ref.current = client;
      setClient1Created(true);
      addLog('EVM Client 1 created');
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
      addLog('Creating EVM Client 2 (Ethereum + Polygon)...');
      const client = await createEVMClient({
        dapp: { name: DAPP_NAME, url: window.location.href },
        api: { supportedNetworks: { 
          '0x1': 'https://mainnet.infura.io/v3/YOUR_KEY',
          '0x89': 'https://polygon-mainnet.infura.io/v3/YOUR_KEY',
        } },
      });
      evmClient2Ref.current = client;
      setClient2Created(true);
      addLog('EVM Client 2 created');
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
      setClient1Connecting(true);
      addLog('Connecting Client 1 (Ethereum)...');
      const result = await evmClient1Ref.current.connect({ chainIds: ['0x1'] });
      setClient1Connected(true);
      setClient1Accounts(result.accounts);
      setClient1ChainId(result.chainId);
      addLog(`Client 1 connected: chainId=${result.chainId}`);
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error: ${msg}`);
    } finally {
      setClient1Connecting(false);
    }
  }, [addLog, refreshState]);

  const connectClient2 = useCallback(async () => {
    if (!evmClient2Ref.current) return;
    try {
      setError(null);
      setClient2Connecting(true);
      addLog('Connecting Client 2 (Ethereum + Polygon)...');
      const result = await evmClient2Ref.current.connect({ chainIds: ['0x1', '0x89'] });
      setClient2Connected(true);
      setClient2Accounts(result.accounts);
      setClient2ChainId(result.chainId);
      addLog(`Client 2 connected: chainId=${result.chainId}`);
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error: ${msg}`);
    } finally {
      setClient2Connecting(false);
    }
  }, [addLog, refreshState]);

  const disconnectClient1 = useCallback(async () => {
    if (!evmClient1Ref.current) return;
    try {
      setError(null);
      addLog('Disconnecting Client 1...');
      addLog('Expected: If Client 2 is connected, session scopes should reduce to Client 2\'s scopes');
      await evmClient1Ref.current.disconnect();
      setClient1Connected(false);
      setClient1Accounts([]);
      setClient1ChainId(undefined);
      addLog('Client 1 disconnected');
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error: ${msg}`);
    }
  }, [addLog, refreshState]);

  const disconnectClient2 = useCallback(async () => {
    if (!evmClient2Ref.current) return;
    try {
      setError(null);
      addLog('Disconnecting Client 2...');
      addLog('Expected: If Client 1 is connected, session scopes should reduce to [eip155:1]');
      await evmClient2Ref.current.disconnect();
      setClient2Connected(false);
      setClient2Accounts([]);
      setClient2ChainId(undefined);
      addLog('Client 2 disconnected');
      refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error: ${msg}`);
    }
  }, [addLog, refreshState]);

  const testClient1Request = useCallback(async () => {
    if (!evmClient1Ref.current) {
      addLog('ERROR: Client 1 not created');
      return;
    }
    try {
      setError(null);
      addLog('Testing Client 1 request (eth_accounts)...');
      const accounts = await evmClient1Ref.current.getProvider().request({ method: 'eth_accounts' });
      addLog(`Client 1 eth_accounts result: ${JSON.stringify(accounts)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Client 1 request FAILED: ${msg}`);
    }
  }, [addLog]);

  const clearLogs = useCallback(() => setLogs([]), []);

  const getStatus = (created: boolean, connected: boolean, connecting: boolean): ConnectionStatus => {
    if (!created) return 'disconnected';
    if (connecting) return 'connecting';
    if (connected) return 'connected';
    return 'disconnected';
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Experiment 10: Partial Disconnect (Scope Revocation)</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Verifies that when a client disconnects, only its scopes are removed.
        Other clients remain connected with their scopes.
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
              <td className="py-1 text-gray-600">Registered Clients:</td>
              <td className="font-semibold text-xl">{clientCount}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-600">Union Scopes:</td>
              <td className="font-mono text-sm">
                {unionScopes.length > 0 ? `[${unionScopes.join(', ')}]` : '[]'}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="mt-3">
          <ActionButton onClick={refreshState} variant="secondary">Refresh State</ActionButton>
        </div>
      </div>

      {/* Expected Behavior */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-5">
        <h3 className="m-0 mb-2 text-lg font-semibold text-blue-800">Test Scenario</h3>
        <ol className="m-0 pl-5 text-sm text-blue-700" style={{ lineHeight: 1.8 }}>
          <li>Connect Client 1 (Ethereum) → scopes: [eip155:1]</li>
          <li>Connect Client 2 (Ethereum + Polygon) → scopes: [eip155:1, eip155:137]</li>
          <li><strong>Disconnect Client 2 → scopes should reduce to [eip155:1]</strong></li>
          <li>Test Client 1 Request → Should still work</li>
          <li>Disconnect Client 1 → Full revocation, 0 clients</li>
        </ol>
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <ConnectionCard
          title="EVM Client 1"
          subtitle="Ethereum only (eip155:1)"
          status={getStatus(client1Created, client1Connected, client1Connecting)}
          accounts={client1Accounts}
          chainId={client1ChainId}
        >
          <div className="space-y-2">
            {!client1Created && (
              <ActionButton onClick={createClient1} variant="primary">Create Client 1</ActionButton>
            )}
            {client1Created && !client1Connected && !client1Connecting && (
              <ActionButton onClick={connectClient1} variant="primary">Connect</ActionButton>
            )}
            {client1Connecting && (
              <div className="flex items-center gap-2 text-blue-600">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Waiting...</span>
              </div>
            )}
            {client1Created && client1Connected && (
              <>
                <ActionButton onClick={testClient1Request} variant="secondary">Test Request</ActionButton>
                <ActionButton onClick={disconnectClient1} variant="danger">Disconnect</ActionButton>
              </>
            )}
          </div>
        </ConnectionCard>

        <ConnectionCard
          title="EVM Client 2"
          subtitle="Ethereum + Polygon (eip155:1, eip155:137)"
          status={getStatus(client2Created, client2Connected, client2Connecting)}
          accounts={client2Accounts}
          chainId={client2ChainId}
        >
          <div className="space-y-2">
            {!client2Created && (
              <ActionButton onClick={createClient2} variant="primary">Create Client 2</ActionButton>
            )}
            {client2Created && !client2Connected && !client2Connecting && (
              <ActionButton onClick={connectClient2} variant="primary">Connect</ActionButton>
            )}
            {client2Connecting && (
              <div className="flex items-center gap-2 text-blue-600">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Waiting...</span>
              </div>
            )}
            {client2Created && client2Connected && (
              <ActionButton onClick={disconnectClient2} variant="danger">Disconnect</ActionButton>
            )}
          </div>
        </ConnectionCard>
      </div>

      {/* Logs */}
      <div className="bg-gray-900 text-green-400 p-4 rounded-lg mb-5 font-mono text-sm max-h-48 overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Activity Log</span>
          <button onClick={clearLogs} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
        </div>
        {logs.length === 0 ? (
          <div className="text-gray-500">No activity yet...</div>
        ) : (
          logs.map((log, i) => <div key={i}>{log}</div>)
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-5">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
