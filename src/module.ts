import { AppPlugin } from '@grafana/data';
import { App } from './components/App';
import { AppConfig } from './components/AppConfig';

export const plugin = new AppPlugin<{}>().setRootPage(App).addConfigPage({
  title: 'Configuration',
  icon: 'cog',
  body: AppConfig,
  id: 'configuration',
})
  .addLink({
    title: 'Open traces',
    description: 'Open traces',
    icon: 'align-left',
    targets: 'grafana-lokiexplore-app/toolbar',
    onClick: (e, helpers) => {
      // @ts-ignore
      helpers.openAppInSideview(helpers.context);
    },
  });
