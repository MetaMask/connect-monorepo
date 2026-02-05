import { useState, useEffect } from 'react';
import { ExperimentsLayout, type ExperimentId } from './shared';
import { Experiment1 } from './Experiment1';
import { Experiment2 } from './Experiment2';
import { Experiment3 } from './Experiment3';
import { Experiment4 } from './Experiment4';
import { Experiment5 } from './Experiment5';
import { Experiment6 } from './Experiment6';
import { Experiment7 } from './Experiment7';
import { Experiment8 } from './Experiment8';

// Get experiment from URL hash, default to exp1
function getExperimentFromHash(): ExperimentId {
  const hash = window.location.hash.slice(1);
  if (['exp1', 'exp2', 'exp3', 'exp4', 'exp5', 'exp6', 'exp7', 'exp8'].includes(hash)) {
    return hash as ExperimentId;
  }
  return 'exp1';
}

/**
 * Main component for the experiments page.
 * Uses URL hash for navigation (e.g., /experiments#exp1)
 */
export function ExperimentsApp() {
  const [currentExperiment, setCurrentExperiment] = useState<ExperimentId>(
    getExperimentFromHash,
  );

  // Sync with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentExperiment(getExperimentFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update URL when experiment changes
  const handleExperimentChange = (id: ExperimentId) => {
    window.location.hash = id;
    setCurrentExperiment(id);
  };

  // Render the current experiment
  const renderExperiment = () => {
    switch (currentExperiment) {
      case 'exp1':
        return <Experiment1 />;
      case 'exp2':
        return <Experiment2 />;
      case 'exp3':
        return <Experiment3 />;
      case 'exp4':
        return <Experiment4 />;
      case 'exp5':
        return <Experiment5 />;
      case 'exp6':
        return <Experiment6 />;
      case 'exp7':
        return <Experiment7 />;
      case 'exp8':
        return <Experiment8 />;
      default:
        return <Experiment1 />;
    }
  };

  return (
    <ExperimentsLayout
      currentExperiment={currentExperiment}
      onExperimentChange={handleExperimentChange}
    >
      {renderExperiment()}
    </ExperimentsLayout>
  );
}
