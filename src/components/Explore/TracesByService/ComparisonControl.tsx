import React from 'react';

import { SceneObjectBase, SceneComponentProps, SceneObjectState } from '@grafana/scenes';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { getTraceByServiceScene } from 'utils/utils';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';
import { ComparisonSelection } from '../../../utils/shared';

export interface ComparisonControlState extends SceneObjectState {
  selection: ComparisonSelection;
  buttonLabel: string;
  buttonTooltip: string;
}

export class ComparisonControl extends SceneObjectBase<ComparisonControlState> {
  public constructor({ selection, buttonLabel, buttonTooltip }: ComparisonControlState) {
    super({ selection, buttonLabel, buttonTooltip });
  }

  public startInvestigation = () => {
    const byServiceScene = getTraceByServiceScene(this);
    byServiceScene.setState({ selection: this.state.selection });
    reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.start_investigation, {
      selection: this.state.selection,
      metric: byServiceScene.state.metric,
    });
  };

  public stopInvestigation = () => {
    const byServiceScene = getTraceByServiceScene(this);
    byServiceScene.setState({ selection: undefined });
    reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.stop_investigation);
  };

  public static Component = ({ model }: SceneComponentProps<ComparisonControl>) => {
    const { buttonLabel, buttonTooltip } = model.useState();
    const { selection } = getTraceByServiceScene(model).useState();
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.wrapper}>
        <Button
          variant={selection ? 'destructive' : 'secondary'}
          size="sm"
          fill="solid"
          icon={selection ? 'times' : 'bolt'}
          onClick={selection ? model.stopInvestigation : model.startInvestigation}
          tooltip={buttonTooltip}
        >
          {selection ? 'Clear investigation' : buttonLabel}
        </Button>
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    wrapper: css({
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
    }),
    placeholder: css({
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      display: 'flex',
      gap: theme.spacing.x0_5,
    }),
  };
}
