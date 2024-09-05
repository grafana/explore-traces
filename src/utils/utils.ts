import { AdHocVariableFilter, DataFrame, urlUtil } from '@grafana/data';
import {
  AdHocFiltersVariable,
  CustomVariable,
  DataSourceVariable,
  getUrlSyncManager,
  sceneGraph,
  SceneObject,
  SceneObjectUrlValues,
  SceneTimeRange,
} from '@grafana/scenes';

import { TraceExploration } from '../pages/Explore';
import {
  EXPLORATIONS_ROUTE,
  VAR_DATASOURCE,
  VAR_DATASOURCE_EXPR,
  VAR_FILTERS,
  VAR_GROUPBY,
  VAR_LATENCY_PARTIAL_THRESHOLD,
  VAR_LATENCY_THRESHOLD,
  VAR_METRIC,
} from './shared';
import { primarySignalOptions } from '../pages/Explore/primary-signals';
import { TracesByServiceScene } from 'components/Explore/TracesByService/TracesByServiceScene';

export function getTraceExplorationScene(model: SceneObject): TraceExploration {
  return sceneGraph.getAncestor(model, TraceExploration);
}

export function getTraceByServiceScene(model: SceneObject): TracesByServiceScene {
  return sceneGraph.getAncestor(model, TracesByServiceScene);
}

export function newTracesExploration(initialDS?: string): TraceExploration {
  return new TraceExploration({
    initialDS,
    initialFilters: [primarySignalOptions[0].filter],
    $timeRange: new SceneTimeRange({ from: 'now-15m', to: 'now' }),
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

export const getFilterSignature = (filter: AdHocVariableFilter) => {
  return `${filter.key}${filter.operator}${filter.value}`;
};

export function getAttributesAsOptions(attributes: string[]) {
  return attributes.map((attribute) => ({ label: attribute, value: attribute }));
}

export function getLabelValue(frame: DataFrame, labelName?: string) {
  const labels = frame.fields.find((f) => f.type === 'number')?.labels;

  if (!labels) {
    return 'No labels';
  }

  const keys = Object.keys(labels);
  if (keys.length === 0) {
    return 'No labels';
  }

  return labels[labelName || keys[0]].replace(/"/g, '');
}

export function getGroupByVariable(scene: SceneObject): CustomVariable {
  const variable = sceneGraph.lookupVariable(VAR_GROUPBY, scene);
  if (!(variable instanceof CustomVariable)) {
    throw new Error('Group by variable not found');
  }
  return variable;
}

export function getLatencyThresholdVariable(scene: SceneObject): CustomVariable {
  const variable = sceneGraph.lookupVariable(VAR_LATENCY_THRESHOLD, scene);
  if (!(variable instanceof CustomVariable)) {
    throw new Error('Latency threshold variable not found');
  }
  return variable;
}

export function getLatencyPartialThresholdVariable(scene: SceneObject): CustomVariable {
  const variable = sceneGraph.lookupVariable(VAR_LATENCY_PARTIAL_THRESHOLD, scene);
  if (!(variable instanceof CustomVariable)) {
    throw new Error('Partial latency threshold variable not found');
  }
  return variable;
}

export function getMetricVariable(scene: SceneObject): CustomVariable {
  const variable = sceneGraph.lookupVariable(VAR_METRIC, scene);
  if (!(variable instanceof CustomVariable)) {
    throw new Error('MEtric variable not found');
  }
  return variable;
}

export function getFiltersVariable(scene: SceneObject): AdHocFiltersVariable {
  const variable = sceneGraph.lookupVariable(VAR_FILTERS, scene);
  if (!(variable instanceof AdHocFiltersVariable)) {
    throw new Error('Filters variable not found');
  }
  return variable;
}

export function getDatasourceVariable(scene: SceneObject): DataSourceVariable {
  const variable = sceneGraph.lookupVariable(VAR_DATASOURCE, scene);
  if (!(variable instanceof DataSourceVariable)) {
    throw new Error('Datasource variable not found');
  }
  return variable;
}
