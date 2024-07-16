import React from 'react';

import { SceneObjectBase, SceneComponentProps, SceneObjectState } from '@grafana/scenes';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, Icon, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { getTraceByServiceScene } from 'utils/utils';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';

export interface ComparisonControlState extends SceneObjectState {
  query?: string;
  placeholder?: string;
}

export class ComparisonControl extends SceneObjectBase<ComparisonControlState> {
  public constructor({ query, placeholder }: ComparisonControlState) {
    super({ query, placeholder });
  }

  public startInvestigation = () => {
    const byServiceScene = getTraceByServiceScene(this);
    byServiceScene.setState({ selection: { query: this.state.query } });
    reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.start_investigation, {
      query: this.state.query,
      metric: byServiceScene.state.metric,
    });
  };

  public stopInvestigation = () => {
    const byServiceScene = getTraceByServiceScene(this);
    byServiceScene.setState({ selection: undefined });
    reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.stop_investigation);
  };

  public static Component = ({ model }: SceneComponentProps<ComparisonControl>) => {
    const { query, placeholder } = model.useState();
    const { selection, metric } = getTraceByServiceScene(model).useState();
    const styles = useStyles2(getStyles);

    if (!query && !selection) {
      return (
        <div className={styles.placeholder}>
          <Icon name={'info-circle'} />
          <div>{placeholder}</div>
        </div>
      );
    }

    const explanation =
      metric === 'duration'
        ? 'Comparing selected area against non-selected area'
        : 'Comparing errors (selection) against non-errors (baseline)';

    return (
      <div className={styles.wrapper}>
        {selection && (
          <div className={styles.placeholder}>
            <Icon name={'info-circle'} />
            <div>{explanation}</div>
          </div>
        )}
        <Button
          variant={selection ? 'destructive' : 'primary'}
          size="sm"
          fill="solid"
          icon={selection ? 'times' : 'bolt'}
          onClick={selection ? model.stopInvestigation : model.startInvestigation}
        >
          {selection ? 'Clear investigation' : 'Investigate errors'}
        </Button>
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    wrapper: css({
      marginTop: theme.spacing(1),
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
