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
} from '../../../utils/shared';
import { getDataSourceSrv } from '@grafana/runtime';
import { ActionViewType, TabsBarScene, actionViewsDefinitions } from './Tabs/TabsBarScene';
import { HistogramPanel } from './HistogramPanel';
import { TraceExploration } from 'pages/Explore';
import { isEqual } from 'lodash';

interface AxisSelection {
  from: number;
  to: number;
}

export interface TraceSceneState extends SceneObjectState {
  body: SceneFlexLayout;
  actionView?: string;

  attributes?: string[];
  selection?: { x?: AxisSelection; y?: AxisSelection; query?: string };
}

export class TracesByServiceScene extends SceneObjectBase<TraceSceneState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['actionView', 'selection'] });

  public constructor(state: MakeOptional<TraceSceneState, 'body'>) {
    super({
      body: state.body ?? new SceneFlexLayout({ children: [] }),
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [buildQuery()],
      }),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this.updateBody();

    const exploration = sceneGraph.getAncestor(this, TraceExploration);
    exploration.getMetricVariable().subscribeToState((newState, prevState) => {
      if (newState.value !== prevState.value) {
        this.updateBody();
      }
    });

    this.updateAttributes();
  }

  updateBody() {
    const traceExploration = sceneGraph.getAncestor(this, TraceExploration);
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
        // reduce max height for main panel to reduce height flicker
        body.state.children[0].setState({ maxHeight: MAIN_PANEL_MIN_HEIGHT });
        body.setState({ children: [...body.state.children.slice(0, 2), actionViewDef.getScene()] });
        this.setState({ actionView: actionViewDef.value });
      }
    }
  }

  static Component = ({ model }: SceneComponentProps<TracesByServiceScene>) => {
    const { body } = model.useState();
    return <body.Component model={body} />;
  };
}

const MAIN_PANEL_MIN_HEIGHT = 205;
const MAIN_PANEL_MAX_HEIGHT = '30%';

export function buildQuery() {
  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR}} | select(status)`,
    queryType: 'traceql',
    tableType: 'spans',
    limit: 100,
    spss: 10,
    filters: [],
  };
}

function buildGraphScene(type: MetricFunction, children?: SceneObject[]) {
  return new SceneFlexLayout({
    direction: 'column',
    $behaviors: [new behaviors.CursorSync({ key: 'metricCrosshairSync', sync: DashboardCursorSync.Crosshair })],
    children: [
      new SceneFlexItem({
        minHeight: MAIN_PANEL_MIN_HEIGHT,
        maxHeight: MAIN_PANEL_MAX_HEIGHT,
        body: type === 'rate' || type === 'errors' ? new RateMetricsPanel({}) : new HistogramPanel({}),
      }),
      new SceneFlexItem({
        ySizing: 'content',
        body: new TabsBarScene({}),
      }),
      ...(children || []),
    ],
  });
}
