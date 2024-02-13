import { css } from '@emotion/css';
import React from 'react';

import { AdHocVariableFilter, GrafanaTheme2 } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import {
  AdHocFiltersVariable,
  DataSourceVariable,
  getUrlSyncManager,
  SceneComponentProps,
  SceneControlsSpacer,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
  VariableValueSelectors,
} from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { ExplorationHistory, ExplorationHistoryStep } from './ExplorationHistory';
import { TracesByServiceScene } from './TracesByService/TracesByServiceScene';
import { SelectStartingPointScene } from './SelectStartingPointScene';
import { StartingPointSelectedEvent, explorationDS, VAR_DATASOURCE, VAR_FILTERS } from './shared';
import { getUrlForExploration } from './utils';

type TraceExplorationMode = 'start' | 'traces';

export interface TraceExplorationState extends SceneObjectState {
  topScene?: SceneObject;
  controls: SceneObject[];
  history: ExplorationHistory;

  mode?: TraceExplorationMode;

  // just for the starting data source
  initialDS?: string;
  initialFilters?: AdHocVariableFilter[];
}

export class TraceExploration extends SceneObjectBase<TraceExplorationState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['mode'] });

  public constructor(state: Partial<TraceExplorationState>) {
    super({
      $timeRange: state.$timeRange ?? new SceneTimeRange({}),
      $variables: state.$variables ?? getVariableSet(state.initialDS, state.initialFilters),
      controls: state.controls ?? [
        new VariableValueSelectors({ layout: 'vertical' }),
        new SceneControlsSpacer(),
        new SceneTimePicker({}),
        new SceneRefreshPicker({}),
      ],
      history: state.history ?? new ExplorationHistory({}),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    if (!this.state.topScene) {
      this.setState({ topScene: getTopScene(this.state.mode) });
    }

    // Some scene elements publish this
    this.subscribeToEvent(StartingPointSelectedEvent, this._handleStartingPointSelected.bind(this));

    // Pay attention to changes in history (i.e., changing the step)
    this.state.history.subscribeToState((newState, oldState) => {
      const oldNumberOfSteps = oldState.steps.length;
      const newNumberOfSteps = newState.steps.length;

      const newStepWasAppended = newNumberOfSteps > oldNumberOfSteps;

      if (newStepWasAppended) {
        // Do nothing because the state is already up to date -- it created a new step!
        return;
      }

      if (oldState.currentStep === newState.currentStep) {
        // The same step was clicked on -- no need to change anything.
        return;
      }

      // History changed because a different node was selected
      const step = newState.steps[newState.currentStep];

      this.goBackToStep(step);
    });

    return () => {
      getUrlSyncManager().cleanUp(this);
    };
  }

  private goBackToStep(step: ExplorationHistoryStep) {
    getUrlSyncManager().cleanUp(this);

    this.setState(step.explorationState);

    locationService.replace(getUrlForExploration(this));

    getUrlSyncManager().initSync(this);
  }

  private _handleStartingPointSelected(evt: StartingPointSelectedEvent) {
    locationService.partial({ mode: 'traces' });
  }

  getUrlState() {
    return { mode: this.state.mode };
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    const stateUpdate: Partial<TraceExplorationState> = {};

    if (values.mode !== this.state.mode) {
      const mode: TraceExplorationMode = (values.mode as TraceExplorationMode) ?? 'start';
      stateUpdate.mode = mode;
      stateUpdate.topScene = getTopScene(mode);
    }

    this.setState(stateUpdate);
  }

  static Component = ({ model }: SceneComponentProps<TraceExploration>) => {
    const { controls, topScene, history } = model.useState();
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        <history.Component model={history} />
        {controls && (
          <div className={styles.controls}>
            {controls.map((control) => (
              <control.Component key={control.state.key} model={control} />
            ))}
          </div>
        )}
        <div className={styles.body}>{topScene && <topScene.Component model={topScene} />}</div>
      </div>
    );
  };
}

function getTopScene(mode?: TraceExplorationMode) {
  if (mode === 'traces') {
    return new TracesByServiceScene({});
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
      new AdHocFiltersVariable({
        name: VAR_FILTERS,
        datasource: explorationDS,
        layout: 'vertical',
        filters: initialFilters ?? [],
        expressionBuilder: renderTraceQLLabelFilters,
      }),
    ],
  });
}

export function renderTraceQLLabelFilters(filters: AdHocVariableFilter[]) {
  return filters.map((filter) => renderFilter(filter)).join('&&');
}

function renderFilter(filter: AdHocVariableFilter) {
  return `${filter.key}${filter.operator}"${filter.value}"`;
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      flexGrow: 1,
      display: 'flex',
      gap: theme.spacing(2),
      minHeight: '100%',
      flexDirection: 'column',
      padding: theme.spacing(2),
    }),
    body: css({
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
    controls: css({
      display: 'flex',
      gap: theme.spacing(2),
      alignItems: 'flex-end',
      flexWrap: 'wrap',
    }),
  };
}
