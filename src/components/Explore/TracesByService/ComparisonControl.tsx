import React from 'react';

import { SceneObjectBase, SceneComponentProps, sceneGraph } from '@grafana/scenes';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { TracesByServiceScene } from './TracesByServiceScene';

export class ComparisonControl extends SceneObjectBase {
  public startInvestigation = () => {
    const byServiceScene = sceneGraph.getAncestor(this, TracesByServiceScene);
    byServiceScene.setState({ selection: { query: 'status = error' } });
  };

  public stopInvestigation = () => {
    const byServiceScene = sceneGraph.getAncestor(this, TracesByServiceScene);
    byServiceScene.setState({ selection: undefined });
  };

  public static Component = ({ model }: SceneComponentProps<ComparisonControl>) => {
    const { selection } = sceneGraph.getAncestor(model, TracesByServiceScene).useState();
    const styles = useStyles2(getStyles);

    console.log(selection);
    return (
      <div className={styles.button}>
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
    button: css({
      marginTop: theme.spacing(1),
    }),
  };
}
