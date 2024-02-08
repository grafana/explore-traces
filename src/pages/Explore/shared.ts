import { BusEventBase } from '@grafana/data';
import { SceneObject } from '@grafana/scenes';

export type ActionViewType = 'overview' | 'breakdown' | 'logs' | 'related' | 'other';
export interface ActionViewDefinition {
  displayName: string;
  value: ActionViewType;
  getScene: () => SceneObject;
}

export const EXPLORATIONS_ROUTE = '/explore/metrics/exploration';

export const VAR_FILTERS = 'filters';
export const VAR_FILTERS_EXPR = '${filters:traceql}';
export const VAR_TRACE_Q = 'traceQ';
export const VAR_TRACE_Q_EXP = '${traceQ:traceql}';
export const VAR_DATASOURCE = 'ds';
export const VAR_DATASOURCE_EXPR = '${ds}';

export const LOGS_METRIC = '$__logs__';
export const KEY_SQR_METRIC_VIZ_QUERY = 'sqr-metric-viz-query';

export const explorationDS = { uid: VAR_DATASOURCE_EXPR };

// Local storage keys
export const RECENT_EXPLORATIONS_KEY = 'grafana.explorations.recent';
export const BOOKMARKED_EXPLORATIONS_KEY = 'grafana.explorations.bookmarks';

export type MakeOptional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export class ServiceNameSelectedEvent extends BusEventBase {
  public static type = 'service-name-selected-event';
}

export class OpenEmbeddedExplorationEvent extends BusEventBase {
  public static type = 'open-embedded-exploration-event';
}
