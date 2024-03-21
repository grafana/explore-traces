import { css } from '@emotion/css';
import React from 'react';

import { AdHocVariableFilter, GrafanaTheme2 } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import {
  DataSourceVariable,
  getUrlSyncManager,
  SceneComponentProps,
  SceneControlsSpacer,
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
  SceneTimeRangeCompare,
  SceneVariableSet,
  SplitLayout,
  VariableValueSelectors,
} from '@grafana/scenes';
import { Button, Stack, useStyles2 } from '@grafana/ui';

import { ExplorationHistory, ExplorationHistoryStep } from './ExplorationHistory';
import { TracesByServiceScene } from '../../components/Explore/TracesByService/TracesByServiceScene';
import { SelectStartingPointScene } from './SelectStartingPointScene';
import {
  StartingPointSelectedEvent,
  VAR_DATASOURCE,
  DetailsSceneUpdated,
} from '../../utils/shared';
import { getUrlForExploration } from '../../utils/utils';
import { DetailsScene } from '../../components/Explore/TracesByService/DetailsScene';
import { FilterByVariable } from 'components/Explore/filters/FilterByVariable';
import { DurationVariable } from 'components/Explore/filters/DurationVariable';

type TraceExplorationMode = 'start' | 'traces';

export interface TraceExplorationState extends SceneObjectState {
  topScene?: SceneObject;
  controls: SceneObject[];
  history: ExplorationHistory;
  body: SplitLayout;

  mode?: TraceExplorationMode;
  detailsScene?: DetailsScene;
  showDetails?: boolean;

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
        new SceneTimeRangeCompare({ key: 'top' }),
        new SceneRefreshPicker({}),
      ],
      history: state.history ?? new ExplorationHistory({}),
      body: buildSplitLayout(),
      detailsScene: new DetailsScene({}),
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
    this.subscribeToEvent(DetailsSceneUpdated, this._handleDetailsSceneUpdated.bind(this));

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
    });

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

  private _handleDetailsSceneUpdated(evt: DetailsSceneUpdated) {
    this.setState({ showDetails: true });
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
    const { body } = model.useState();
    const styles = useStyles2(getStyles);

    return <div className={styles.bodyContainer}> {body && <body.Component model={body} />} </div>;
  };
}

export class TraceExplorationScene extends SceneObjectBase {
  static Component = ({ model }: SceneComponentProps<TraceExplorationScene>) => {
    const traceExploration = sceneGraph.getAncestor(model, TraceExploration);
    const { history, controls, topScene, showDetails, mode } = traceExploration.useState();
    const styles = useStyles2(getStyles);

    const toggleDetails = () => {
      traceExploration.setState({ showDetails: !showDetails });
    };

    return (
      <div className={styles.container}>
        <Stack gap={2} justifyContent={'space-between'}>
          <history.Component model={history} />
          {mode === 'traces' && (
            <Button
              variant={'secondary'}
              icon={showDetails ? 'arrow-to-right' : 'arrow-from-right'}
              className={showDetails ? undefined : styles.rotateIcon}
              onClick={() => toggleDetails()}
            >
              Details
            </Button>
          )}
        </Stack>
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

function buildSplitLayout() {
  return new SplitLayout({
    direction: 'row',
    initialSize: 0.6,
    primary: new SceneFlexItem({
      body: new TraceExplorationScene({}),
    }),
  });
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
      new DurationVariable(),
      new FilterByVariable({
        initialFilters,
      })
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
    rotateIcon: css({
      svg: { transform: 'rotate(180deg)' },
    }),
  };
}
