import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { TraceExplorationPage } from '../../pages/Explore';
import { PLUGIN_BASE_URL, ROUTES } from 'utils/shared';

export const Routes = () => {
  return (
    <Switch>
      <Route path={prefixRoute(`${ROUTES.Explore}`)} component={TraceExplorationPage} />
      <Redirect to={prefixRoute(ROUTES.Explore)} />
    </Switch>
  );
};

// Prefixes the route with the base URL of the plugin
function prefixRoute(route: string): string {
  return `${PLUGIN_BASE_URL}/${route}`;
}
