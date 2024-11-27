import React, { useEffect, useState } from 'react';
import { newHome } from '../../utils/utils';
import { DATASOURCE_LS_KEY } from '../../utils/shared';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../utils/analytics';
import { Home } from './Home';

export const HomePage = () => {
  const initialDs = localStorage.getItem(DATASOURCE_LS_KEY) || '';
  const [home] = useState(newHome(initialDs));

  return <HomeView home={home} />;
};

export function HomeView({ home }: { home: Home }) {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);

      reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.app_initialized);
    }
  }, [home, isInitialized]);

  if (!isInitialized) {
    return null;
  }

  return (
    <home.Component model={home} />
  );
}