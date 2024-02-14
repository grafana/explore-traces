import { css, cx } from '@emotion/css';
import React, { useMemo } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  SceneVariableValueChangedEvent,
  SceneObjectStateChangedEvent,
  SceneTimeRange,
  sceneUtils,
} from '@grafana/scenes';
import { useStyles2, Tooltip, Stack } from '@grafana/ui';

import { TraceExploration, TraceExplorationState } from './TraceExploration';
import { VAR_FILTERS } from '../../utils/shared';
import { getExplorationFor } from '../../utils/utils';

export interface DataExplorationsHistoryState extends SceneObjectState {
  currentStep: number;
  steps: ExplorationHistoryStep[];
}

export interface ExplorationHistoryStep {
  description: string;
  type: ExplorationStepType;
  explorationState: TraceExplorationState;
  parentIndex: number;
}

export type ExplorationStepType = 'filters' | 'time' | 'metric' | 'start';

export class ExplorationHistory extends SceneObjectBase<DataExplorationsHistoryState> {
  public constructor(state: Partial<DataExplorationsHistoryState>) {
    super({ steps: state.steps ?? [], currentStep: state.currentStep ?? 0 });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private stepTransitionInProgress = false;

  public _onActivate() {
    const exploration = getExplorationFor(this);

    if (this.state.steps.length === 0) {
      this.addExplorationStep(exploration, 'start');
    }

    exploration.subscribeToEvent(SceneVariableValueChangedEvent, (evt) => {
      if (evt.payload.state.name === VAR_FILTERS) {
        this.addExplorationStep(exploration, 'filters');
      }
    });

    exploration.subscribeToEvent(SceneObjectStateChangedEvent, (evt) => {
      if (evt.payload.changedObject instanceof SceneTimeRange) {
        this.addExplorationStep(exploration, 'time');
      }
    });
  }

  public addExplorationStep(exploration: TraceExploration, type: ExplorationStepType) {
    if (this.stepTransitionInProgress) {
      // Do not add exploration steps when step transition is in progress
      return;
    }

    const stepIndex = this.state.steps.length;
    const parentIndex = type === 'start' ? -1 : this.state.currentStep;

    this.setState({
      currentStep: stepIndex,
      steps: [
        ...this.state.steps,
        {
          description: 'Test',
          type,
          explorationState: sceneUtils.cloneSceneObjectState(exploration.state, { history: this }),
          parentIndex,
        },
      ],
    });
  }

  public goBackToStep(stepIndex: number) {
    this.stepTransitionInProgress = true;

    this.setState({ currentStep: stepIndex });

    this.stepTransitionInProgress = false;
  }

  renderStepTooltip(step: ExplorationHistoryStep) {
    return (
      <Stack direction="column">
        <div>{step.type}</div>
      </Stack>
    );
  }

  public static Component = ({ model }: SceneComponentProps<ExplorationHistory>) => {
    const { steps, currentStep } = model.useState();
    const styles = useStyles2(getStyles);

    const { ancestry, alternatePredecessorStyle } = useMemo(() => {
      const ancestry = new Set<number>();
      let cursor = currentStep;
      while (cursor >= 0) {
        ancestry.add(cursor);
        cursor = steps[cursor]?.parentIndex;
      }

      const alternatePredecessorStyle = new Map<number, string>();

      ancestry.forEach((index) => {
        const parent = steps[index]?.parentIndex;
        if (parent + 1 !== index) {
          alternatePredecessorStyle.set(index, createAlternatePredecessorStyle(index, parent));
        }
      });

      return { ancestry, alternatePredecessorStyle };
    }, [currentStep, steps]);

    return (
      <div className={styles.container}>
        <div className={styles.heading}>History</div>
        {steps.map((step, index) => (
          <Tooltip content={() => model.renderStepTooltip(step)} key={index}>
            <button
              className={cx(
                // Base for all steps
                styles.step,
                // Specifics per step type
                styles.stepTypes[step.type],
                // To highlight selected step
                model.state.currentStep === index ? styles.stepSelected : '',
                // To alter the look of steps with distant non-directly preceding parent
                alternatePredecessorStyle.get(index) ?? '',
                // To remove direct link for steps that don't have a direct parent
                index !== step.parentIndex + 1 ? styles.stepOmitsDirectLeftLink : '',
                // To remove the direct parent link on the start node as well
                index === 0 ? styles.stepOmitsDirectLeftLink : '',
                // To darken steps that aren't the current step's ancesters
                !ancestry.has(index) ? styles.stepIsNotAncestorOfCurrent : ''
              )}
              onClick={() => model.goBackToStep(index)}
            ></button>
          </Tooltip>
        ))}
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  const visTheme = theme.visualization;

  return {
    container: css({
      display: 'flex',
      gap: 10,
      alignItems: 'center',
    }),
    heading: css({}),
    step: css({
      flexGrow: 0,
      cursor: 'pointer',
      border: 'none',
      boxShadow: 'none',
      padding: 0,
      margin: 0,
      width: 8,
      height: 8,
      opacity: 0.7,
      borderRadius: theme.shape.radius.circle,
      background: theme.colors.primary.main,
      position: 'relative',
      '&:hover': {
        opacity: 1,
      },
      '&:hover:before': {
        // We only want the node to hover, not its connection to its parent
        opacity: 0.7,
      },
      '&:before': {
        content: '""',
        position: 'absolute',
        width: 10,
        height: 2,
        left: -10,
        top: 3,
        background: theme.colors.primary.border,
        pointerEvents: 'none',
      },
    }),
    stepSelected: css({
      '&:after': {
        content: '""',
        borderStyle: `solid`,
        borderWidth: 2,
        borderRadius: '50%',
        position: 'absolute',
        width: 16,
        height: 16,
        left: -4,
        top: -4,
        boxShadow: `0px 0px 0px 2px inset ${theme.colors.background.canvas}`,
      },
    }),
    stepOmitsDirectLeftLink: css({
      '&:before': {
        background: 'none',
      },
    }),
    stepIsNotAncestorOfCurrent: css({
      opacity: 0.2,
      '&:hover:before': {
        opacity: 0.2,
      },
    }),
    stepTypes: {
      start: generateStepTypeStyle(visTheme.getColorByName('green')),
      filters: generateStepTypeStyle(visTheme.getColorByName('purple')),
      metric: generateStepTypeStyle(visTheme.getColorByName('orange')),
      time: generateStepTypeStyle(theme.colors.primary.main),
    },
  };
}

function generateStepTypeStyle(color: string) {
  return css({
    background: color,
    '&:before': {
      background: color,
      borderColor: color,
    },
    '&:after': {
      borderColor: color,
    },
  });
}

function createAlternatePredecessorStyle(index: number, parent: number) {
  const difference = index - parent;

  const NODE_DISTANCE = 18;
  const distanceToParent = difference * NODE_DISTANCE;

  return css({
    '&:before': {
      content: '""',
      width: distanceToParent + 2,
      height: 10,
      borderStyle: 'solid',
      borderWidth: 2,
      borderBottom: 'none',
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      top: -10,
      left: 3 - distanceToParent,
      background: 'none',
    },
  });
}
