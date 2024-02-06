import { css } from '@emotion/css';
import React from 'react';

import { DashboardCursorSync, GrafanaTheme2 } from '@grafana/data';
import {
  AdHocFiltersVariable,
  behaviors,
  CustomVariable,
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneQueryRunner,
  SceneVariableSet,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { Box, Stack, Tab, TabsBar, ToolbarButton, useStyles2 } from '@grafana/ui';


import { ShareExplorationButton } from './ShareExplorationButton';
import { TraceTimeSeriesPanel } from './TraceTimeSeriesPanel';
import { buildTracesListScene } from './TracesTabs/TracesListScene';
import {
  ActionViewDefinition,
  ActionViewType,
  MakeOptional,
  OpenEmbeddedExplorationEvent,
  explorationDS,
  VAR_FILTERS,
  VAR_TRACE_Q,
  VAR_TRACE_Q_EXP,
} from './shared';
import { getExplorationFor } from './utils';

export interface TraceSceneState extends SceneObjectState {
  body: SceneFlexLayout;
  actionView?: string;
}

export class TraceScene extends SceneObjectBase<TraceSceneState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['actionView'] });
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_FILTERS],
    onReferencedVariableValueChanged: this.onReferencedVariableValueChanged.bind(this),
  });

  public constructor(state: MakeOptional<TraceSceneState, 'body'>) {
    super({
      $variables: state.$variables ?? getVariableSet(),
      body: state.body ?? buildGraphScene(),
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [buildQuery()],
      }),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    if (this.state.actionView === undefined) {
      this.setActionView('overview');
    }

    const variable = sceneGraph.lookupVariable('filters', this);
    if (!(variable instanceof AdHocFiltersVariable)) {
      return;
    }
    variable.state.set.state.filters.push({ key: 'span.beast', value: '', operator: '=', condition: '' });
    variable.state.set.state.filters.push({ key: 'span.http.status_code', value: '', operator: '=', condition: '' });
    variable.state.set.forceRender();
  }

  private onReferencedVariableValueChanged() {
    this.updateQuery();
  }

  private updateQuery() {
    console.log('updateQuery');
    const variable = sceneGraph.lookupVariable('filters', this);
    if (!(variable instanceof AdHocFiltersVariable)) {
      return;
    }
    const traceQvar = sceneGraph.lookupVariable(VAR_TRACE_Q, this);
    if (!(traceQvar instanceof CustomVariable)) {
      return;
    }
    console.log('updateQuery', variable.state.set.state.filters, traceQvar.state);
    traceQvar.changeValueTo(
      variable.state.set.state.filters
        .filter((f) => f.value)
        .map((f) => `${f.key}${f.operator}"${f.value}"`)
        .join(' && ')
    );
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

  static Component = ({ model }: SceneComponentProps<TraceScene>) => {
    const { body } = model.useState();
    return <body.Component model={body} />;
  };
}

const actionViewsDefinitions: ActionViewDefinition[] = [
  { displayName: 'Traces', value: 'overview', getScene: buildTracesListScene },
  { displayName: 'Services', value: 'logs', getScene: buildTracesListScene },
  { displayName: 'Group By', value: 'breakdown', getScene: buildTracesListScene },
  { displayName: 'Metrics', value: 'related', getScene: buildTracesListScene },
  { displayName: 'Outliers', value: 'other', getScene: buildTracesListScene },
];

export interface TracesActionBarState extends SceneObjectState {}

export class TracesActionBar extends SceneObjectBase<TracesActionBarState> {
  public onOpenExploration = () => {
    this.publishEvent(new OpenEmbeddedExplorationEvent(), true);
  };

  public static Component = ({ model }: SceneComponentProps<TracesActionBar>) => {
    const metricScene = sceneGraph.getAncestor(model, TraceScene);
    const styles = useStyles2(getStyles);
    const exploration = getExplorationFor(model);
    const { actionView } = metricScene.useState();

    return (
      <Box paddingY={1}>
        <div className={styles.actions}>
          <Stack gap={2}>
            <ShareExplorationButton exploration={exploration} />
            {exploration.state.embedded && (
              <ToolbarButton variant={'canvas'} onClick={model.onOpenExploration}>
                Open
              </ToolbarButton>
            )}
          </Stack>
        </div>

        <TabsBar>
          {actionViewsDefinitions.map((tab, index) => {
            return (
              <Tab
                key={index}
                label={tab.displayName}
                active={actionView === tab.value}
                onChangeTab={() => metricScene.setActionView(tab.value)}
              />
            );
          })}
        </TabsBar>
      </Box>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    actions: css({
      [theme.breakpoints.up(theme.breakpoints.values.md)]: {
        position: 'absolute',
        right: 0,
        zIndex: 2,
      },
    }),
  };
}

function getVariableSet() {
  return new SceneVariableSet({
    variables: [
      new CustomVariable({
        name: VAR_TRACE_Q,
        value: '',
        text: '',
      }),
    ],
  });
}

const MAIN_PANEL_MIN_HEIGHT = 200;
const MAIN_PANEL_MAX_HEIGHT = '30%';

function buildQuery() {
  return {
    refId: 'A',
    query: `{${VAR_TRACE_Q_EXP}} | select(status)`,
    queryType: 'traceql',
    tableType: 'spans',
    limit: 100,
    spss: 10,
    filters: [],
  };
}

function buildGraphScene() {
  return new SceneFlexLayout({
    direction: 'column',
    $behaviors: [new behaviors.CursorSync({ key: 'metricCrosshairSync', sync: DashboardCursorSync.Crosshair })],
    children: [
      new SceneFlexItem({
        minHeight: MAIN_PANEL_MIN_HEIGHT,
        maxHeight: MAIN_PANEL_MAX_HEIGHT,
        body: new TraceTimeSeriesPanel({}),
      }),
      new SceneFlexItem({
        ySizing: 'content',
        body: new TracesActionBar({}),
      }),
    ],
  });
}
