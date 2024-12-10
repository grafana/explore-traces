import React, { lazy } from 'react';
import { Route, Routes as ReactRoutes, Navigate } from 'react-router-dom-v5-compat';
import { ROUTES } from 'utils/shared';
import { HomePage } from 'pages/Home/HomePage';
const TraceExplorationPage = lazy(() => import('../../pages/Explore/TraceExplorationPage'));

export const Routes = () => {
  return (
    <ReactRoutes>
      <Route path={ROUTES.Explore} element={<TraceExplorationPage />} />
      <Route path={ROUTES.Home} element={<HomePage />} />
      <Route path={'/'} element={<Navigate replace to={ROUTES.Home}/> } />
    </ReactRoutes>
  );
};
