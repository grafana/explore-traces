import React, { useEffect, useState } from 'react';
import { newTracesExploration } from './utils';
import { TraceExploration } from './TraceExploration';
import { getUrlSyncManager } from '@grafana/scenes';

export const TraceExplorationPage = () => {
  const [exploration] = useState(newTracesExploration());

  return <TraceExplorationView exploration={exploration} />;
};

export function TraceExplorationView({ exploration }: { exploration: TraceExploration }) {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    if (!isInitialized) {
      getUrlSyncManager().initSync(exploration);
      setIsInitialized(true);
    }
  }, [exploration, isInitialized]);

  if (!isInitialized) {
    return null;
  }

  return <exploration.Component model={exploration} />;
}
