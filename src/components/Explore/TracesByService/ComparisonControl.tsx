import React from 'react';

import { SceneObjectBase, SceneComponentProps, SceneObjectState } from '@grafana/scenes';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, Icon, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { getTraceByServiceScene } from 'utils/utils';

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
  };

  public stopInvestigation = () => {
    const byServiceScene = getTraceByServiceScene(this);
    byServiceScene.setState({ selection: undefined });
  };

  public static Component = ({ model }: SceneComponentProps<ComparisonControl>) => {
    const { query, placeholder } = model.useState();
    const { selection } = getTraceByServiceScene(model).useState();
    const styles = useStyles2(getStyles);

    if (!query && !selection) {
      return (
        <div className={styles.placeholder}>
          <Icon name={'info-circle'} />
          <div>{placeholder}</div>
        </div>
      );
    }

    return (
      <div className={styles.wrapper}>
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
    }),
    placeholder: css({
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      display: 'flex',
      gap: theme.spacing.x0_5,
    }),
  };
}
