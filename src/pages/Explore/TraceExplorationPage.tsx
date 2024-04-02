import React, { useEffect, useState } from 'react';
import { newTracesExploration } from '../../utils/utils';
import { TraceExploration } from './TraceExploration';
import { getUrlSyncManager } from '@grafana/scenes';
import { DATASOURCE_LS_KEY } from '../../utils/shared';

export const TraceExplorationPage = () => {
  const initialDs = localStorage.getItem(DATASOURCE_LS_KEY) || '';
  const [exploration] = useState(newTracesExploration(initialDs));

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
