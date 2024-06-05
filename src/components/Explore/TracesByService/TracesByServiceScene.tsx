import React from 'react';

import { DashboardCursorSync, MetricFindValue } from '@grafana/data';
import {
  behaviors,
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneQueryRunner,
} from '@grafana/scenes';

import { TraceTimeSeriesPanel } from './TraceTimeSeriesPanel';
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

interface AxisSelection {
  from: number;
  to: number;
}

export interface TraceSceneState extends SceneObjectState {
  body: SceneFlexLayout;
  actionView?: string;

  attributes?: string[];
  selection?: { x: AxisSelection; y: AxisSelection };
}

export class TracesByServiceScene extends SceneObjectBase<TraceSceneState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['actionView'] });

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
    this.updateBody(this);

    if (this.state.actionView === undefined) {
      this.setActionView('breakdown');
    }

    const exploration = sceneGraph.getAncestor(this, TraceExploration);
    exploration.subscribeToState((newState, prevState) => {
      if (newState.metric !== prevState.metric) {
        this.updateBody(this);
      }
    });

    this.updateAttributes();
  }

  updateBody(model: any) {
    const traceExploration = sceneGraph.getAncestor(model, TraceExploration);
    this.setState({ body: buildGraphScene(traceExploration.state.metric) });
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
    return { actionView: this.state.actionView };
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
      this.setActionView(undefined);
    }
  }

  public setActionView(actionView?: ActionViewType) {
    const { body } = this.state;
    const actionViewDef = actionViewsDefinitions.find((v) => v.value === actionView);

    if (body.state.children.length > 1) {
      if (actionViewDef && actionViewDef.value !== this.state.actionView) {
        // reduce max height for main panel to reduce height flicker
        body.state.children[0].setState({ maxHeight: MAIN_PANEL_MIN_HEIGHT });
        body.setState({ children: [...body.state.children.slice(0, 2), actionViewDef.getScene()] });
        this.setState({ actionView: actionViewDef.value });
      } else {
        // restore max height
        body.state.children[0].setState({ maxHeight: MAIN_PANEL_MAX_HEIGHT });
        body.setState({ children: body.state.children.slice(0, 2) });
        this.setState({ actionView: undefined });
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

function buildGraphScene(type: MetricFunction) {
  return new SceneFlexLayout({
    direction: 'column',
    $behaviors: [new behaviors.CursorSync({ key: 'metricCrosshairSync', sync: DashboardCursorSync.Crosshair })],
    children: [
      new SceneFlexItem({
        minHeight: MAIN_PANEL_MIN_HEIGHT,
        maxHeight: MAIN_PANEL_MAX_HEIGHT,
        body: type === 'rate' || type === 'errors' ? new TraceTimeSeriesPanel({}) : new HistogramPanel({}),
      }),
      new SceneFlexItem({
        ySizing: 'content',
        body: new TabsBarScene({}),
      }),
    ],
  });
}
