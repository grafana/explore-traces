import { AppPlugin } from '@grafana/data';
import { App } from './components/App';
import { AppConfig } from './components/AppConfig';

// @ts-ignore new API that is not yet in stable release
import { sidecarServiceSingleton_EXPERIMENTAL } from '@grafana/runtime';
import pluginJson from './plugin.json';

export const plugin = new AppPlugin<{}>()
  .setRootPage(App)
  .addConfigPage({
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
      sidecarServiceSingleton_EXPERIMENTAL?.openApp(pluginJson.id, helpers.context);
    },
  });
