import React, { useEffect, useState } from 'react';
import { newTracesExploration } from '../../utils/utils';
import { TraceExploration } from './TraceExploration';
import { DATASOURCE_LS_KEY } from '../../utils/shared';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../utils/analytics';
import { UrlSyncContextProvider } from '@grafana/scenes';

export const TraceExplorationPage = () => {
  const initialDs = localStorage.getItem(DATASOURCE_LS_KEY) || '';
  const [exploration] = useState(newTracesExploration(initialDs));

  return <TraceExplorationView exploration={exploration} />;
};

export function TraceExplorationView({ exploration }: { exploration: TraceExploration }) {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);

      reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.app_initialized);
    }
  }, [exploration, isInitialized]);

  if (!isInitialized) {
    return null;
  }

  return (
    <UrlSyncContextProvider scene={exploration} updateUrlOnInit={true} createBrowserHistorySteps={true}>
      <exploration.Component model={exploration} />
    </UrlSyncContextProvider>
  );
}
