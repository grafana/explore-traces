import { lazy } from 'react';
import { AppPlugin } from '@grafana/data';

// @ts-ignore new API that is not yet in stable release
import { sidecarServiceSingleton_EXPERIMENTAL } from '@grafana/runtime';
import pluginJson from './plugin.json';
import { linkConfigs } from 'utils/links';

const App = lazy(() => import('./components/App/App'));
const AppConfig = lazy(() => import('./components/AppConfig/AppConfig'));

export const plugin = new AppPlugin<{}>().setRootPage(App).addConfigPage({
  title: 'Configuration',
  icon: 'cog',
  body: AppConfig,
  id: 'configuration',
})
.addLink({
  title: 'traces',
  description: 'Open traces',
  icon: 'align-left',
  targets: 'grafana-lokiexplore-app/toolbar-open-related/v1',
  onClick: (e, helpers) => {
    sidecarServiceSingleton_EXPERIMENTAL?.openAppV3({ pluginId: pluginJson.id, path: '/explore' }, helpers.context);
  },
});

for (const linkConfig of linkConfigs) {
  plugin.addLink(linkConfig);
}
