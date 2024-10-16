import React, { useEffect, useState } from 'react';
import { newTracesExploration } from '../../utils/utils';
import { TraceExploration } from './TraceExploration';
import { DATASOURCE_LS_KEY } from '../../utils/shared';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../utils/analytics';
import { UrlSyncContextProvider } from '@grafana/scenes';
import {AdHocVariableFilter, usePluginContext} from '@grafana/data';

export const TraceExplorationPage = () => {
  const pluginContext = usePluginContext();
  const initialDs = localStorage.getItem(DATASOURCE_LS_KEY) || '';
  const [exploration] = useState(
    newTracesExploration(
      initialDs,
      getInitialFilters(
        // @ts-ignore
        pluginContext.initialContext
      )
    )
  );

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

function getInitialFilters(context: unknown): AdHocVariableFilter[] | undefined {
  if (context && typeof context === 'object' && 'filters' in context && Array.isArray(context.filters)) {
    const mappedFilters = context.filters.reduce<AdHocVariableFilter[]>((filters, maybeFilter) => {
      if (
        maybeFilter &&
        typeof maybeFilter === 'object' &&
        'key' in maybeFilter &&
        'operator' in maybeFilter &&
        'value' in maybeFilter
      ) {
        filters.push({
          key: maybeFilter.key,
          value: maybeFilter.value,
          operator: maybeFilter.operator,
        });
      }
      return filters;
    }, []);
    if (mappedFilters.length) {
      return mappedFilters;
    }
  }

  return undefined;
}
