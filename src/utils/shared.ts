import { BusEventBase, BusEventWithPayload } from '@grafana/data';
import { SceneObject } from '@grafana/scenes';

export type MetricFunction = 'rate' | 'errors' | 'duration';
export type ActionViewType = 'spans' | 'breakdown' | 'structure';
export interface ActionViewDefinition {
  displayName: string;
  value: ActionViewType;
  getScene: () => SceneObject;
}

export const EXPLORATIONS_ROUTE = '/a/grafana-exploretraces-app/explore';
export const DATASOURCE_LS_KEY = 'grafana.explore.traces.datasource';

export const VAR_FILTERS = 'filters';
export const VAR_FILTERS_EXPR = '${filters}';
export const VAR_DATASOURCE = 'ds';
export const VAR_DATASOURCE_EXPR = '${ds}';
export const VAR_GROUPBY = 'groupBy';

export const explorationDS = { uid: VAR_DATASOURCE_EXPR };

export const ignoredAttributes = ['duration', 'traceDuration'];

export type MakeOptional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export class StartingPointSelectedEvent extends BusEventBase {
  public static type = 'start-point-selected-event';
}

export interface DetailsSceneUpdatedPayload {
  showDetails?: boolean;
}
export class DetailsSceneUpdated extends BusEventWithPayload<DetailsSceneUpdatedPayload> {
  public static type = 'details-scene-updated';
}
