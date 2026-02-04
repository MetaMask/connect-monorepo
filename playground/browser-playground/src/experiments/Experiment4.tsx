/**
 * Experiment 4: EVM + Wagmi (Shared State)
 *
 * Goal: Test that EVM and Wagmi share state when configured to
 *
 * Setup:
 * - One createEVMClient with dapp.name: 'Experiment App'
 * - Wagmi connector with dapp.name: 'Experiment App'
 * - Both use same instanceId (via same dapp.name + '-evm' suffix)
 *
 * Validates:
 * - Connect EVM → Wagmi sees connected
 * - Connect Wagmi → EVM sees connected
 * - Disconnect EVM → Wagmi also disconnected
 * - Sign on EVM → same result as sign on Wagmi
 * - Same storage keys
 */
import { ConnectionCard } from './shared';

export function Experiment4() {
  return (
    <div className="space-y-6">
      {/* Experiment Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-green-800 mb-2">
          Experiment 4: EVM + Wagmi (Shared State)
        </h2>
        <p className="text-sm text-green-700">
          This experiment tests that EVM and Wagmi clients{' '}
          <strong>share</strong> the same state when using the same dapp.name.
        </p>
        <div className="mt-2 p-2 bg-white rounded border border-green-200">
          <p className="text-xs text-gray-600">
            <strong>Both clients use instanceId:</strong>{' '}
            <code className="text-blue-600">experiment-app-evm</code>
          </p>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ConnectionCard
          title="EVM Client"
          subtitle="createEVMClient()"
          status="disconnected"
          instanceId="experiment-app-evm"
        >
          <p className="text-sm text-gray-500 italic">Coming soon...</p>
        </ConnectionCard>

        <ConnectionCard
          title="Wagmi"
          subtitle="useConnect() from wagmi"
          status="disconnected"
          instanceId="experiment-app-evm"
        >
          <p className="text-sm text-gray-500 italic">Coming soon...</p>
        </ConnectionCard>
      </div>

      <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
        <p className="text-gray-600 text-sm">
          This experiment is a placeholder. Implementation requires configuring
          Wagmi with matching dapp.name.
        </p>
      </div>
    </div>
  );
}
