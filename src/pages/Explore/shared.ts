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
export const VAR_FILTERS_EXPR = '${filters}';
export const VAR_DATASOURCE = 'ds';
export const VAR_DATASOURCE_EXPR = '${ds}';

export const explorationDS = { uid: VAR_DATASOURCE_EXPR };

export type MakeOptional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export class StartingPointSelectedEvent extends BusEventBase {
  public static type = 'start-point-selected-event';
}
