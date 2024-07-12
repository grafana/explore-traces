import React from 'react';

import { SceneObjectBase, SceneComponentProps } from '@grafana/scenes';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, useStyles2 } from '@grafana/ui';
import { DetailsSceneUpdated } from 'utils/shared';
import { css } from '@emotion/css';

export class CloseTraceViewAction extends SceneObjectBase {
  public onClick = () => {
    this.publishEvent(new DetailsSceneUpdated({ showDetails: false }), true);
  };

  public static Component = ({ model }: SceneComponentProps<CloseTraceViewAction>) => {
    const styles = useStyles2(getStyles);
    return (
      <div className={styles.button}>
        <Button variant="secondary" size="sm" fill="solid" icon="times" onClick={model.onClick}>Close</Button>
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
