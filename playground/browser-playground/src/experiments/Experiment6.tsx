/**
 * Experiment 6: All Three (Full Integration)
 *
 * Goal: The "real world" test with all three SDK types
 *
 * Setup:
 * - createMultichainClient with dapp.name: 'Experiment App'
 * - createEVMClient with dapp.name: 'Experiment App'
 * - Wagmi connector with dapp.name: 'Experiment App'
 *
 * Expected Behavior:
 * - Multichain is isolated (instanceId: experiment-app-multichain)
 * - EVM and Wagmi share state (instanceId: experiment-app-evm)
 */
import { ConnectionCard } from './shared';

export function Experiment6() {
  return (
    <div className="space-y-6">
      {/* Experiment Info */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-indigo-800 mb-2">
          Experiment 6: All Three (Full Integration)
        </h2>
        <p className="text-sm text-indigo-700">
          This experiment tests all three SDK types together. Multichain should
          be isolated, while EVM and Wagmi share state.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="p-2 bg-white rounded border border-indigo-200">
            <p className="text-xs text-gray-600">
              <strong>Multichain:</strong>
            </p>
            <code className="text-xs text-blue-600">
              experiment-app-multichain
            </code>
          </div>
          <div className="p-2 bg-white rounded border border-indigo-200">
            <p className="text-xs text-gray-600">
              <strong>EVM:</strong>
            </p>
            <code className="text-xs text-green-600">experiment-app-evm</code>
          </div>
          <div className="p-2 bg-white rounded border border-indigo-200">
            <p className="text-xs text-gray-600">
              <strong>Wagmi:</strong>
            </p>
            <code className="text-xs text-green-600">
              experiment-app-evm (shared)
            </code>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ConnectionCard
          title="Multichain"
          subtitle="createMultichainClient()"
          status="disconnected"
          instanceId="experiment-app-multichain"
        >
          <p className="text-sm text-gray-500 italic">Coming soon...</p>
        </ConnectionCard>

        <ConnectionCard
          title="EVM"
          subtitle="createEVMClient()"
          status="disconnected"
          instanceId="experiment-app-evm"
        >
          <p className="text-sm text-gray-500 italic">Coming soon...</p>
        </ConnectionCard>

        <ConnectionCard
          title="Wagmi"
          subtitle="useConnect()"
          status="disconnected"
          instanceId="experiment-app-evm"
        >
          <p className="text-sm text-gray-500 italic">Coming soon...</p>
        </ConnectionCard>
      </div>

      <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
        <p className="text-gray-600 text-sm">
          This experiment is a placeholder. It will combine all three SDK types
          to validate the full isolation strategy.
        </p>
      </div>
    </div>
  );
}
