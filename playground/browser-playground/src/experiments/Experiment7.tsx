import { useState, useCallback, useRef } from 'react';

import {
  createMultichainClient,
  hasCachedCore,
  type MultichainCore,
} from '@metamask/connect-multichain';
import {
  createEVMClient,
  type MetamaskConnectEVM,
} from '@metamask/connect-evm';

import { ConnectionCard, ActionButton, type ConnectionStatus } from './shared';

const DAPP_NAME = 'Experiment 7 - Core Sharing';

/**
 * Experiment 7: Core Sharing Verification
 *
 * This experiment verifies that:
 * 1. Multiple SDK clients (Multichain, EVM) share the same core instance
 * 2. The singleton pattern works correctly
 */
export function Experiment7() {
  const [multichainCore, setMultichainCore] = useState<MultichainCore | null>(
    null,
  );
  const [evmClient, setEvmClient] = useState<MetamaskConnectEVM | null>(null);
  const [createCount, setCreateCount] = useState(0);
  const [hasCached, setHasCached] = useState(hasCachedCore());
  const [sameCore, setSameCore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track core references for comparison
  const multichainCoreRef = useRef<MultichainCore | null>(null);
  const evmCoreRef = useRef<MultichainCore | null>(null);

  const refreshState = useCallback(() => {
    setHasCached(hasCachedCore());
  }, []);

  const createMultichain = useCallback(async () => {
    try {
      setError(null);
      const client = await createMultichainClient({
        dapp: {
          name: DAPP_NAME,
          url: window.location.href,
        },
        api: {
          supportedNetworks: {
            'eip155:1': 'https://mainnet.infura.io/v3/YOUR_KEY',
          },
        },
      });
      multichainCoreRef.current = client as MultichainCore;
      setMultichainCore(client as MultichainCore);
      setCreateCount((prev) => prev + 1);
      refreshState();

      // Check if same core as EVM
      if (evmCoreRef.current) {
        const isSame = multichainCoreRef.current === evmCoreRef.current;
        setSameCore(isSame ? '✅ SAME CORE' : '❌ DIFFERENT CORES');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [refreshState]);

  const createEVM = useCallback(async () => {
    try {
      setError(null);
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
      // The EVM client wraps the core, but we can compare by checking window
      // @ts-expect-error - accessing window for testing
      evmCoreRef.current = window.__metamaskCore;
      setEvmClient(client);
      setCreateCount((prev) => prev + 1);
      refreshState();

      // Check if same core as Multichain
      if (multichainCoreRef.current) {
        const isSame = multichainCoreRef.current === evmCoreRef.current;
        setSameCore(isSame ? '✅ SAME CORE' : '❌ DIFFERENT CORES');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [refreshState]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Experiment 7: Core Sharing</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Verifies that multiple SDK clients share the same core instance
        (singleton pattern).
      </p>

      {/* State Display */}
      <div className="bg-gray-100 p-4 rounded-lg mb-5">
        <h3 className="m-0 mb-3 text-lg font-semibold">Singleton State</h3>
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-1 text-gray-600">Has Cached Core:</td>
              <td>{hasCached ? '✅ Yes' : '❌ No'}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-600">Create Calls Made:</td>
              <td>{createCount}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-600">Core Comparison:</td>
              <td className="font-semibold">
                {sameCore ?? '(Create both clients to compare)'}
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

      {/* Client Cards */}
      <div className="grid grid-cols-2 gap-5">
        {/* Multichain Client */}
        <ConnectionCard
          title="Multichain Client"
          status={multichainCore ? 'connected' : 'disconnected'}
        >
          <ActionButton
            onClick={createMultichain}
            disabled={!!multichainCore}
            variant="primary"
          >
            {multichainCore ? 'Created ✓' : 'Create Multichain Client'}
          </ActionButton>
        </ConnectionCard>

        {/* EVM Client */}
        <ConnectionCard
          title="EVM Client"
          status={
            (evmClient?.status as ConnectionStatus | undefined) ?? 'disconnected'
          }
          accounts={evmClient?.accounts ?? []}
          chainId={evmClient?.selectedChainId}
        >
          <ActionButton
            onClick={createEVM}
            disabled={!!evmClient}
            variant="primary"
          >
            {evmClient ? 'Created ✓' : 'Create EVM Client'}
          </ActionButton>
        </ConnectionCard>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mt-5">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Checklist */}
      <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="m-0 mb-3 text-lg font-semibold text-green-800">
          Expected Behavior
        </h3>
        <ul className="m-0 pl-5 space-y-1 text-green-700">
          <li>✓ Creating first client should cache the core</li>
          <li>✓ Creating second client should return the SAME core</li>
          <li>✓ "Core Comparison" should show "✅ SAME CORE"</li>
          <li>✓ Only 1 core exists, even with 2 create calls</li>
        </ul>
      </div>
    </div>
  );
}
