import React from 'react';

import { DashboardCursorSync, MetricFindValue } from '@grafana/data';
import {
  behaviors,
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneQueryRunner,
} from '@grafana/scenes';

import { RateMetricsPanel } from './RateMetricsPanel';
import {
  MakeOptional,
  explorationDS,
  VAR_FILTERS_EXPR,
  VAR_DATASOURCE_EXPR,
  MetricFunction,
  ComparisonSelection,
  ALL,
} from '../../../utils/shared';
import { getDataSourceSrv } from '@grafana/runtime';
import { ActionViewType, TabsBarScene, actionViewsDefinitions } from './Tabs/TabsBarScene';
import { HistogramPanel } from './HistogramPanel';
import { isEqual } from 'lodash';
import { getDatasourceVariable, getGroupByVariable, getTraceExplorationScene } from 'utils/utils';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';
import { MiniREDPanel } from './MiniREDPanel';

export interface TraceSceneState extends SceneObjectState {
  body: SceneFlexLayout;
  metric?: MetricFunction;
  actionView?: string;

  attributes?: string[];
  selection?: ComparisonSelection;
}

export class TracesByServiceScene extends SceneObjectBase<TraceSceneState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['actionView', 'selection'] });

  public constructor(state: MakeOptional<TraceSceneState, 'body'>) {
    super({
      body: state.body ?? new SceneFlexLayout({ children: [] }),
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [buildQuery(state.metric as MetricFunction)],
      }),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this.updateBody();

    const exploration = getTraceExplorationScene(this);
    const metricVariable = exploration.getMetricVariable();
    metricVariable.subscribeToState((newState, prevState) => {
      if (newState.value !== prevState.value) {
        this.setState({ selection: undefined });
        this.updateBody();
      }
    });

    this.subscribeToState((newState, prevState) => {
      const timeRange = sceneGraph.getTimeRange(this);
      const selectionFrom = newState.selection?.timeRange?.from;
      // clear selection if it's out of time range
      if (selectionFrom && selectionFrom < timeRange.state.value.from.unix()) {
        this.setState({ selection: undefined });
      }

      // Set group by to All when starting a comparison
      if (newState.selection && newState.selection !== prevState.selection) {
        this.setActionView('breakdown');
        const groupByVar = getGroupByVariable(this);
        groupByVar.changeValueTo(ALL);
      }
    });

    getDatasourceVariable(this).subscribeToState(() => {
      this.updateAttributes();
    });

    this.updateAttributes();
  }

  updateBody() {
    const traceExploration = getTraceExplorationScene(this);
    const metric = traceExploration.getMetricVariable().getValue();
    const actionViewDef = actionViewsDefinitions.find((v) => v.value === this.state.actionView);

    this.setState({
      body: buildGraphScene(metric as MetricFunction, actionViewDef ? [actionViewDef?.getScene()] : undefined),
    });

    if (this.state.actionView === undefined) {
      this.setActionView('breakdown');
    }
  }

  private async updateAttributes() {
    const ds = await getDataSourceSrv().get(VAR_DATASOURCE_EXPR, { __sceneObject: { value: this } });

    if (!ds) {
      return;
    }

    ds.getTagKeys?.().then((tagKeys: MetricFindValue[]) => {
      const attributes = tagKeys.map((l) => l.text);
      if (attributes !== this.state.attributes) {
        this.setState({ attributes });
      }
    });
  }

  getUrlState() {
    return {
      actionView: this.state.actionView,
      selection: this.state.selection ? JSON.stringify(this.state.selection) : undefined,
    };
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    if (typeof values.actionView === 'string') {
      if (this.state.actionView !== values.actionView) {
        const actionViewDef = actionViewsDefinitions.find((v) => v.value === values.actionView);
        if (actionViewDef) {
          this.setActionView(actionViewDef.value);
        }
      }
    } else if (values.actionView === null) {
      this.setActionView('breakdown');
    }

    if (typeof values.selection === 'string') {
      const newSelection = JSON.parse(values.selection);
      if (!isEqual(newSelection, this.state.selection)) {
        this.setState({ selection: newSelection });
      }
    }
  }

  public setActionView(actionView?: ActionViewType) {
    const { body } = this.state;
    const actionViewDef = actionViewsDefinitions.find((v) => v.value === actionView);

    if (body.state.children.length > 1) {
      if (actionViewDef) {
        body.setState({ children: [...body.state.children.slice(0, 2), actionViewDef.getScene()] });
        reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.action_view_changed, {
          oldAction: this.state.actionView,
          newAction: actionView,
        });
        this.setState({ actionView: actionViewDef.value });
      }
    }
  }

  static Component = ({ model }: SceneComponentProps<TracesByServiceScene>) => {
    const { body } = model.useState();
    return <body.Component model={body} />;
  };
}

const MAIN_PANEL_HEIGHT = 220;
export const MINI_PANEL_HEIGHT = (MAIN_PANEL_HEIGHT - 8) / 2;

export function buildQuery(type: MetricFunction) {
  const typeQuery = type === 'errors' ? ' && status = error' : '';
  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR}${typeQuery}} | select(status)`,
    queryType: 'traceql',
    tableType: 'spans',
    limit: 100,
    spss: 10,
    filters: [],
  };
}

function buildGraphScene(metric: MetricFunction, children?: SceneObject[]) {
  const secondaryPanel =
    metric === 'rate'
      ? new MiniREDPanel({ metric: 'errors' })
      : new MiniREDPanel({
          metric: 'rate',
        });

  const tertiaryPanel =
    metric === 'duration'
      ? new MiniREDPanel({
          metric: 'errors',
        })
      : new MiniREDPanel({ metric: 'duration' });

  return new SceneFlexLayout({
    direction: 'column',
    $behaviors: [new behaviors.CursorSync({ key: 'metricCrosshairSync', sync: DashboardCursorSync.Crosshair })],
    children: [
      new SceneFlexLayout({
        direction: 'row',
        ySizing: 'content',
        children: [
          new SceneFlexItem({
            minHeight: MAIN_PANEL_HEIGHT,
            maxHeight: MAIN_PANEL_HEIGHT,
            width: '60%',
            body: metric === 'duration' ? new HistogramPanel({}) : new RateMetricsPanel({ metric }),
          }),
          new SceneFlexLayout({
            direction: 'column',
            minHeight: MAIN_PANEL_HEIGHT,
            maxHeight: MAIN_PANEL_HEIGHT,
            children: [
              new SceneFlexItem({
                minHeight: MINI_PANEL_HEIGHT,
                maxHeight: MINI_PANEL_HEIGHT,
                height: MINI_PANEL_HEIGHT,

                body: secondaryPanel,
              }),
              new SceneFlexItem({
                minHeight: MINI_PANEL_HEIGHT,
                maxHeight: MINI_PANEL_HEIGHT,
                height: MINI_PANEL_HEIGHT,

                ySizing: 'fill',

                body: tertiaryPanel,
              }),
            ],
          }),
        ],
      }),
      new SceneFlexItem({
        ySizing: 'content',
        body: new TabsBarScene({}),
      }),
      ...(children || []),
    ],
  });
}
