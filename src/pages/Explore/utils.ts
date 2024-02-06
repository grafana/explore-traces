import { urlUtil } from '@grafana/data';
import { config, getDataSourceSrv } from '@grafana/runtime';
import { getUrlSyncManager, sceneGraph, SceneObject, SceneObjectUrlValues, SceneTimeRange } from '@grafana/scenes';

import { TraceExploration } from './TraceExploration';
import { EXPLORATIONS_ROUTE, VAR_DATASOURCE_EXPR } from './shared';

export function getExplorationFor(model: SceneObject): TraceExploration {
  return sceneGraph.getAncestor(model, TraceExploration);
}

export function newTracesExploration(initialDS?: string): TraceExploration {
  return new TraceExploration({
    initialDS,
    $timeRange: new SceneTimeRange({ from: 'now-1h', to: 'now' }),
    embedded: false,
  });
}

export function getUrlForExploration(exploration: TraceExploration) {
  const params = getUrlSyncManager().getUrlState(exploration);
  return getUrlForValues(params);
}

export function getUrlForValues(values: SceneObjectUrlValues) {
  return urlUtil.renderUrl(EXPLORATIONS_ROUTE, values);
}

export function getDataSource(exploration: TraceExploration) {
  return sceneGraph.interpolate(exploration, VAR_DATASOURCE_EXPR);
}

export function getDataSourceName(dataSourceUid: string) {
  return getDataSourceSrv().getInstanceSettings(dataSourceUid)?.name || dataSourceUid;
}

export function getDatasourceForNewExploration(): string | undefined {
  const typeDatasources = getDataSourceSrv().getList({ type: 'tempo' });
  if (typeDatasources.length > 0) {
    return typeDatasources.find((mds) => mds.uid === config.defaultDatasource)?.uid ?? typeDatasources[0].uid;
  }
  return undefined;
}

export function getColorByIndex(index: number) {
  const visTheme = config.theme2.visualization;
  return visTheme.getColorByName(visTheme.palette[index % 8]);
}
