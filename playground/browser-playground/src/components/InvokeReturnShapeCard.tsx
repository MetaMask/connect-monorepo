import { useMemo, useState } from 'react';
import type { Scope } from '@metamask/connect-multichain';
import { useSDK } from '../sdk';

/**
 * Demo card for PR #318: shows that `client.invokeMethod` returns two different
 * shapes depending on the method.
 *
 * - A passthrough method (`eth_accounts`) is routed via
 *   `RequestRouter.handleWithEip1193Passthrough`, which returns the FULL
 *   JSON-RPC envelope (`{ id, jsonrpc, result }`).
 * - A wallet-routed method (`eth_chainId`) is routed via `handleWithWallet`,
 *   which returns the UNWRAPPED `result`.
 *
 * Same public entry point, two different return contracts.
 */
export const InvokeReturnShapeCard = () => {
  const { invokeMethod, session, status } = useSDK();

  const scope = useMemo<Scope>(() => {
    const scopes = Object.keys(session?.sessionScopes ?? {});
    const eip155 = scopes.find((s) => s.startsWith('eip155:'));
    return (eip155 ?? scopes[0] ?? 'eip155:1') as Scope;
  }, [session]);

  const [passthrough, setPassthrough] = useState<unknown>(undefined);
  const [walletRouted, setWalletRouted] = useState<unknown>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isConnected = status === 'connected';

  const run = async () => {
    setError(null);
    setLoading(true);
    setPassthrough(undefined);
    setWalletRouted(undefined);
    try {
      // Passthrough method -> sendEip1193Message -> full envelope
      const passthroughResult = await invokeMethod({
        scope,
        request: { method: 'eth_accounts', params: [] },
      });
      setPassthrough(passthroughResult);

      // Wallet-routed method -> handleWithWallet -> unwrapped result
      const walletResult = await invokeMethod({
        scope,
        request: { method: 'eth_chainId', params: [] },
      });
      setWalletRouted(walletResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const renderResult = (value: unknown) =>
    value === undefined ? '—' : JSON.stringify(value, null, 2);

  return (
    <section
      data-testid="invoke-return-shape-card"
      className="bg-white rounded-lg p-8 mb-6 shadow-sm border-2 border-amber-300"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-1">
        PR #318 · <span className="text-amber-600">invokeMethod</span> return-shape check
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Both calls hit the same public <code>client.invokeMethod</code> on scope{' '}
        <code className="text-purple-700">{scope}</code>. Compare the shapes
        below.
      </p>

      <button
        type="button"
        data-testid="invoke-return-shape-run"
        onClick={run}
        disabled={!isConnected || loading}
        className={`px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 ${
          !isConnected || loading
            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
            : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 cursor-pointer'
        }`}
      >
        {loading
          ? 'Running…'
          : isConnected
            ? 'Run both invokeMethod calls'
            : 'Connect (Multichain) first'}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-600 font-mono break-all">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            <code>eth_accounts</code>{' '}
            <span className="text-xs font-normal text-amber-600">
              (EIP1193 passthrough)
            </span>
          </p>
          <p className="text-xs text-gray-500 mb-2">
            Expected: full envelope{' '}
            <code>{'{ id, jsonrpc, result }'}</code>
          </p>
          <pre
            data-testid="invoke-return-shape-passthrough"
            className="bg-gray-50 rounded p-3 text-xs font-mono whitespace-pre-wrap break-all min-h-[64px]"
          >
            {renderResult(passthrough)}
          </pre>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            <code>eth_chainId</code>{' '}
            <span className="text-xs font-normal text-blue-600">
              (routed to wallet)
            </span>
          </p>
          <p className="text-xs text-gray-500 mb-2">
            Expected: unwrapped <code>result</code> only
          </p>
          <pre
            data-testid="invoke-return-shape-wallet"
            className="bg-gray-50 rounded p-3 text-xs font-mono whitespace-pre-wrap break-all min-h-[64px]"
          >
            {renderResult(walletRouted)}
          </pre>
        </div>
      </div>
    </section>
  );
};
