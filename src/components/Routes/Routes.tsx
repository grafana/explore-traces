import React, { lazy } from 'react';
import { Route, Routes as ReactRoutes, Navigate } from 'react-router-dom-v5-compat';
import { ROUTES } from 'utils/shared';
const TraceExplorationPage = lazy(() => import('../../pages/Explore/TraceExplorationPage'));

export const Routes = () => {
  return (
    <ReactRoutes>
      <Route path={ROUTES.Explore} element={<TraceExplorationPage />} />
      <Route path={'/'} element={<Navigate replace to={ROUTES.Explore}/> } />
    </ReactRoutes>
  );
};
