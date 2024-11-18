import React from 'react';
import { Route, Routes as ReactRoutes, Navigate } from 'react-router-dom-v5-compat';
import { TraceExplorationPage } from '../../pages/Explore';
import { ROUTES } from 'utils/shared';

export const Routes = () => {
  return (
    <ReactRoutes>
      <Route path={ROUTES.Explore} element={<TraceExplorationPage />} />
      <Route path={'/'} element={<Navigate replace to={ROUTES.Explore}/> } />
    </ReactRoutes>
  );
};
