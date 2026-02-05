import type { ReactNode } from 'react';
import { StateVisualizer } from './StateVisualizer';

export type ExperimentId =
  | 'exp1'
  | 'exp2'
  | 'exp3'
  | 'exp4'
  | 'exp5'
  | 'exp6'
  | 'exp7'
  | 'exp8';

type ExperimentInfo = {
  id: ExperimentId;
  title: string;
  description: string;
};

export const EXPERIMENTS: ExperimentInfo[] = [
  {
    id: 'exp1',
    title: 'Exp 1: Single Client',
    description: 'Baseline test with one multichain client',
  },
  {
    id: 'exp2',
    title: 'Exp 2: Same Type',
    description: 'Two multichain clients (should share state)',
  },
  {
    id: 'exp3',
    title: 'Exp 3: Different Types',
    description: 'Multichain + EVM (should be isolated)',
  },
  {
    id: 'exp4',
    title: 'Exp 4: EVM + Wagmi',
    description: 'EVM and Wagmi with shared state',
  },
  {
    id: 'exp5',
    title: 'Exp 5: Isolated Wagmi',
    description: 'EVM and Wagmi fully isolated',
  },
  {
    id: 'exp6',
    title: 'Exp 6: All Three',
    description: 'Multichain + EVM + Wagmi together',
  },
  {
    id: 'exp7',
    title: 'Exp 7: Core Sharing',
    description: 'Verify singleton core is shared across SDK types',
  },
  {
    id: 'exp8',
    title: 'Exp 8: Disconnect Coordination',
    description: 'Verify disconnect only revokes session when last client disconnects',
  },
];

type ExperimentsLayoutProps = {
  currentExperiment: ExperimentId;
  onExperimentChange: (id: ExperimentId) => void;
  children: ReactNode;
};

/**
 * Layout component for experiments with navigation header and state visualizer.
 */
export function ExperimentsLayout({
  currentExperiment,
  onExperimentChange,
  children,
}: ExperimentsLayoutProps) {
  const currentExp = EXPERIMENTS.find((e) => e.id === currentExperiment);

  return (
    <div className="min-h-screen bg-gray-100 pb-72">
      {/* Header with Navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-gray-800">
                SDK Isolation Experiments
              </h1>
              <a
                href="/"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ← Back to Main
              </a>
            </div>

            {/* Experiment Selector */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="experiment-select"
                className="text-sm text-gray-600"
              >
                Experiment:
              </label>
              <select
                id="experiment-select"
                value={currentExperiment}
                onChange={(e) =>
                  onExperimentChange(e.target.value as ExperimentId)
                }
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {EXPERIMENTS.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current Experiment Description */}
          {currentExp && (
            <p className="text-sm text-gray-500 mt-1">{currentExp.description}</p>
          )}
        </div>

        {/* Quick Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto pb-2">
            {EXPERIMENTS.map((exp) => (
              <button
                key={exp.id}
                onClick={() => onExperimentChange(exp.id)}
                className={`px-3 py-1 text-xs rounded-t whitespace-nowrap transition-colors ${
                  currentExperiment === exp.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {exp.id.toUpperCase()}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

      {/* State Visualizer */}
      <StateVisualizer />
    </div>
  );
}
