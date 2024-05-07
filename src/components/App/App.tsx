import React from 'react';
import { AppRootProps } from '@grafana/data';
import { Routes } from '../Routes';

// This is used to be able to retrieve the root plugin props anywhere inside the app.
const PluginPropsContext = React.createContext<AppRootProps | null>(null);

export class App extends React.PureComponent<AppRootProps> {
  render() {
    return (
      <PluginPropsContext.Provider value={this.props}>
        <Routes />
      </PluginPropsContext.Provider>
    );
  }
}
