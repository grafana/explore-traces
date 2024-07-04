import { css } from '@emotion/css';
import React from 'react';

import { AdHocVariableFilter, GrafanaTheme2 } from '@grafana/data';
import {
  CustomVariable,
  DataSourceVariable,
  getUrlSyncManager,
  SceneComponentProps,
  SceneFlexItem,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
  SplitLayout,
} from '@grafana/scenes';
import { Stack, useStyles2 } from '@grafana/ui';

import { TracesByServiceScene } from '../../components/Explore/TracesByService/TracesByServiceScene';
import { SelectStartingPointScene } from './SelectStartingPointScene';
import {
  DATASOURCE_LS_KEY,
  DetailsSceneUpdated,
  MetricFunction,
  StartingPointSelectedEvent,
  VAR_DATASOURCE,
  VAR_GROUPBY,
  VAR_METRIC,
} from '../../utils/shared';
import { getTraceExplorationScene, getFilterSignature, getFiltersVariable } from '../../utils/utils';
import { DetailsScene } from '../../components/Explore/TracesByService/DetailsScene';
import { FilterByVariable } from 'components/Explore/filters/FilterByVariable';
import { getSignalForKey, primarySignalOptions } from './primary-signals';
import { VariableHide } from '@grafana/schema';

type TraceExplorationMode = 'start' | 'traces';

export interface TraceExplorationState extends SceneObjectState {
  topScene?: SceneObject;
  controls: SceneObject[];

  body: SplitLayout;

  mode?: TraceExplorationMode;
  detailsScene?: DetailsScene;
  showDetails?: boolean;
  primarySignal?: string;

  // just for the starting data source
  initialDS?: string;
  initialFilters?: AdHocVariableFilter[];
}

export class TraceExploration extends SceneObjectBase<TraceExplorationState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['mode', 'primarySignal'] });

  public constructor(state: Partial<TraceExplorationState>) {
    super({
      $timeRange: state.$timeRange ?? new SceneTimeRange({}),
      $variables: state.$variables ?? getVariableSet(state.initialDS, state.initialFilters),
      controls: state.controls ?? [new SceneTimePicker({}), new SceneRefreshPicker({})],
      body: buildSplitLayout(),
      detailsScene: new DetailsScene({}),
      primarySignal: state.primarySignal ?? primarySignalOptions[0].value,
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    if (!this.state.topScene) {
      this.setState({ topScene: getTopScene(this.state.mode, this.getMetricVariable().getValue() as MetricFunction) });
    }

    // Some scene elements publish this
    this.subscribeToEvent(StartingPointSelectedEvent, this._handleStartingPointSelected.bind(this));
    this.subscribeToEvent(DetailsSceneUpdated, this._handleDetailsSceneUpdated.bind(this));

    const datasourceVar = sceneGraph.lookupVariable(VAR_DATASOURCE, this) as DataSourceVariable;
    datasourceVar.subscribeToState((newState) => {
      if (newState.value) {
        localStorage.setItem(DATASOURCE_LS_KEY, newState.value.toString());
      }
    });
    this.subscribeToState((newState, oldState) => {
      if (newState.showDetails !== oldState.showDetails) {
        if (newState.showDetails) {
          this.state.body.setState({ secondary: new DetailsScene(this.state.detailsScene?.state || {}) });
          this.setState({ detailsScene: undefined });
        } else {
          this.state.body.setState({ secondary: undefined });
          this.setState({ detailsScene: new DetailsScene({}) });
        }
      }
      if (newState.mode !== oldState.mode) {
        this.updateFiltersWithPrimarySignal(newState.primarySignal, oldState.primarySignal);
        this.setState({ topScene: getTopScene(newState.mode, this.getMetricVariable().getValue() as MetricFunction) });
      }
      if (newState.primarySignal && newState.primarySignal !== oldState.primarySignal) {
        this.updateFiltersWithPrimarySignal(newState.primarySignal, oldState.primarySignal);
      }
    });

    return () => {
      getUrlSyncManager().cleanUp(this);
    };
  }

  public updateFiltersWithPrimarySignal(newSignal?: string, oldSignal?: string) {
    let signal = newSignal ?? this.state.primarySignal;

    const filtersVar = getFiltersVariable(this);
    let filters = filtersVar.state.filters;
    // Remove previous filter for primary signal
    if (oldSignal) {
      filters = filters.filter((f) => getFilterSignature(f) !== getFilterSignature(getSignalForKey(oldSignal)?.filter));
    }
    // Add new filter
    const newFilter = getSignalForKey(signal)?.filter;
    if (newFilter) {
      filters.unshift(newFilter);
    }
    filtersVar.setState({ filters });
  }

  private _handleStartingPointSelected(evt: StartingPointSelectedEvent) {
    this.setState({ mode: 'traces' });
  }

  private _handleDetailsSceneUpdated(evt: DetailsSceneUpdated) {
    this.setState({ showDetails: evt.payload.showDetails ?? false });
  }

  getUrlState() {
    return { mode: this.state.mode, primarySignal: this.state.primarySignal };
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    const stateUpdate: Partial<TraceExplorationState> = {};

    if (values.mode !== this.state.mode) {
      const mode: TraceExplorationMode = (values.mode as TraceExplorationMode) ?? 'start';
      stateUpdate.mode = mode;
      stateUpdate.topScene = getTopScene(mode, this.getMetricVariable().getValue() as MetricFunction);
    }

    if (values.primarySignal && values.primarySignal !== this.state.primarySignal) {
      stateUpdate.primarySignal = values.primarySignal as string;
    }

    this.setState(stateUpdate);
  }

  public getMetricVariable() {
    const variable = sceneGraph.lookupVariable(VAR_METRIC, this);
    if (!(variable instanceof CustomVariable)) {
      throw new Error('Metric variable not found');
    }

    if (!variable.getValue()) {
      variable.changeValueTo('rate');
    }

    return variable;
  }

  public onChangePrimarySignal = (signal: string) => {
    if (!signal || this.state.primarySignal === signal) {
      return;
    }
    this.setState({ primarySignal: signal });
  };

  public onChangeMetricFunction = (metric: string) => {
    const variable = this.getMetricVariable();
    if (!metric || variable.getValue() === metric) {
      return;
    }
    variable.changeValueTo(metric);
  };

  static Component = ({ model }: SceneComponentProps<TraceExploration>) => {
    const { body } = model.useState();
    const styles = useStyles2(getStyles);

    return <div className={styles.bodyContainer}> {body && <body.Component model={body} />} </div>;
  };
}

export class TraceExplorationScene extends SceneObjectBase {
  static Component = ({ model }: SceneComponentProps<TraceExplorationScene>) => {
    const traceExploration = getTraceExplorationScene(model);
    const { controls, topScene } = traceExploration.useState();
    const styles = useStyles2(getStyles);

    const dsVariable = sceneGraph.lookupVariable(VAR_DATASOURCE, traceExploration);
    const filtersVariable = getFiltersVariable(traceExploration);

    return (
      <div className={styles.container}>
        <Stack gap={2} justifyContent={'space-between'}>
          {dsVariable && (
            <Stack gap={1} alignItems={'center'}>
              <div>Data source</div>
              <dsVariable.Component model={dsVariable} />
            </Stack>
          )}
          <div className={styles.controls}>
            {controls.map((control) => (
              <control.Component key={control.state.key} model={control} />
            ))}
          </div>
        </Stack>
        <div className={styles.filters}>{filtersVariable && <filtersVariable.Component model={filtersVariable} />}</div>
        <div className={styles.body}>{topScene && <topScene.Component model={topScene} />}</div>
      </div>
    );
  };
}

function buildSplitLayout() {
  return new SplitLayout({
    direction: 'row',
    initialSize: 0.6,
    primary: new SceneFlexItem({
      body: new TraceExplorationScene({}),
    }),
  });
}

function getTopScene(mode?: TraceExplorationMode, metric?: MetricFunction) {
  if (mode === 'traces') {
    return new TracesByServiceScene({ metric });
  }
  return new SelectStartingPointScene({});
}

function getVariableSet(initialDS?: string, initialFilters?: AdHocVariableFilter[]) {
  return new SceneVariableSet({
    variables: [
      new DataSourceVariable({
        name: VAR_DATASOURCE,
        label: 'Data source',
        value: initialDS,
        pluginId: 'tempo',
      }),
      new FilterByVariable({
        initialFilters,
      }),
      new CustomVariable({
        name: VAR_METRIC,
        hide: VariableHide.hideVariable,
      }),
      new CustomVariable({
        name: VAR_GROUPBY,
      }),
    ],
  });
}

function getStyles(theme: GrafanaTheme2) {
  return {
    bodyContainer: css({
      flexGrow: 1,
      display: 'flex',
      minHeight: '100%',
      flexDirection: 'column',
    }),
    container: css({
      flexGrow: 1,
      display: 'flex',
      gap: theme.spacing(1),
      minHeight: '100%',
      flexDirection: 'column',
      padding: theme.spacing(2),
      overflow: 'auto' /* Needed for sticky positioning */,
      height: '1px' /* Needed for sticky positioning */,
    }),
    body: css({
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
    controls: css({
      display: 'flex',
      gap: theme.spacing(1),
      backgroundColor: theme.colors.background.primary,
      zIndex: 3,
    }),
    filters: css({
      backgroundColor: theme.colors.background.primary,
      position: 'sticky',
      top: `-${theme.spacing(2)}`,
      zIndex: 2,
    }),
  };
}
