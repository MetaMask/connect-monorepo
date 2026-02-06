/**
 * Experiment 5: EVM + Wagmi (Isolated State)
 *
 * Goal: Test full isolation if Option A (shared) doesn't work
 *
 * Setup:
 * - One createEVMClient with instanceId: 'experiment-evm'
 * - Wagmi connector with instanceId: 'experiment-wagmi-evm'
 *
 * Validates:
 * - Connect EVM → Wagmi NOT connected
 * - Connect Wagmi → EVM NOT connected
 * - Each has own QR scan
 * - Different storage keys
 */
import { ConnectionCard } from './shared';

export function Experiment5() {
  return (
    <div className="space-y-6">
      {/* Experiment Info */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-orange-800 mb-2">
          Experiment 5: EVM + Wagmi (Isolated State)
        </h2>
        <p className="text-sm text-orange-700">
          This experiment tests <strong>full isolation</strong> between EVM and
          Wagmi using different instanceIds.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="p-2 bg-white rounded border border-orange-200">
            <p className="text-xs text-gray-600">
              <strong>EVM instanceId:</strong>
            </p>
            <code className="text-xs text-blue-600">experiment-evm</code>
          </div>
          <div className="p-2 bg-white rounded border border-orange-200">
            <p className="text-xs text-gray-600">
              <strong>Wagmi instanceId:</strong>
            </p>
            <code className="text-xs text-green-600">experiment-wagmi-evm</code>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ConnectionCard
          title="EVM Client"
          subtitle="createEVMClient()"
          status="disconnected"
          instanceId="experiment-evm"
        >
          <p className="text-sm text-gray-500 italic">Coming soon...</p>
        </ConnectionCard>

        <ConnectionCard
          title="Wagmi"
          subtitle="useConnect() from wagmi"
          status="disconnected"
          instanceId="experiment-wagmi-evm"
        >
          <p className="text-sm text-gray-500 italic">Coming soon...</p>
        </ConnectionCard>
      </div>

      <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
        <p className="text-gray-600 text-sm">
          This experiment is a placeholder. Implementation requires passing
          explicit instanceId to both clients.
        </p>
      </div>
    </div>
  );
}
