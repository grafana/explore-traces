import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { PLUGIN_BASE_URL, ROUTES } from '../../constants';
import { TraceExplorationPage } from '../../pages/Explore';

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
