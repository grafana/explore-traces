import { BusEventWithPayload, DataFrame } from '@grafana/data';
import pluginJson from '../plugin.json';

export type MetricFunction = 'rate' | 'errors' | 'duration';

export enum ROUTES {
  Explore = 'explore',
}

export const PLUGIN_BASE_URL = `/a/${pluginJson.id}`;
export const EXPLORATIONS_ROUTE = '/a/grafana-exploretraces-app/explore';
export const DATASOURCE_LS_KEY = 'grafana.explore.traces.datasource';

export const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

export const VAR_DATASOURCE = 'ds';
export const VAR_DATASOURCE_EXPR = '${ds}';
export const VAR_FILTERS = 'filters';
export const VAR_FILTERS_EXPR = '${filters}';
export const VAR_GROUPBY = 'groupBy';
export const VAR_METRIC = 'metric';
export const VAR_LATENCY_THRESHOLD = 'latencyThreshold';
export const VAR_LATENCY_THRESHOLD_EXPR = '${latencyThreshold}';
export const VAR_LATENCY_PARTIAL_THRESHOLD = 'partialLatencyThreshold';
export const VAR_LATENCY_PARTIAL_THRESHOLD_EXPR = '${partialLatencyThreshold}';
export const explorationDS = { uid: VAR_DATASOURCE_EXPR };

export const ALL = 'All';
export const RESOURCE = 'Resource';
export const SPAN = 'Span';
export const RESOURCE_ATTR = 'resource.';
export const SPAN_ATTR = 'span.';

export const radioAttributesResource = [
  'resource.service.name',
  'resource.cluster',
  'resource.environment',
  'resource.namespace',
];
export const radioAttributesSpan = [
  'name',
  'kind',
  'rootName',
  'rootServiceName',
  'status',
  'statusMessage',
  'span.http.status_code',
];
export const ignoredAttributes = [
  'duration',
  'event:name',
  'nestedSetLeft',
  'nestedSetParent',
  'nestedSetRight',
  'span:duration',
  'span:id',
  'trace:duration',
  'trace:id',
  'traceDuration',
];
// Limit maximum options in select dropdowns for performance reasons
export const maxOptions = 1000;

export type MakeOptional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export interface ComparisonSelection {
  type: 'auto' | 'manual';
  raw?: { x: { from: number; to: number }; y: { from: number; to: number } };
  timeRange?: { from: number; to: number };
  duration?: { from: string; to: string };
  query?: string;
}

export interface DetailsSceneUpdatedPayload {
  showDetails?: boolean;
}

export class DetailsSceneUpdated extends BusEventWithPayload<DetailsSceneUpdatedPayload> {
  public static type = 'details-scene-updated';
}

export interface EventTimeseriesDataReceivedPayload {
  series?: DataFrame[];
}

export class EventTimeseriesDataReceived extends BusEventWithPayload<EventTimeseriesDataReceivedPayload> {
  public static type = 'timeseries-data-received';
}

export const filterStreamingProgressTransformations = [
  {
    id: 'filterByRefId',
    options: {
      exclude: 'streaming-progress',
    },
  },
];
