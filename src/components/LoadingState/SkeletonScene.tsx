import { css, keyframes } from '@emotion/css';
import { SceneObjectState, SceneObjectBase, SceneComponentProps } from '@grafana/scenes';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { GRID_TEMPLATE_COLUMNS } from 'pages/Explore/SelectStartingPointScene';
import React from 'react';
import { SkeletonTheme } from 'react-loading-skeleton';

interface SkeletonSceneState extends SceneObjectState {
  item: () => React.JSX.Element;
  repeat: number;
}

export class SkeletonScene extends SceneObjectBase<SkeletonSceneState> {
  public static Component = ({ model }: SceneComponentProps<SkeletonScene>) => {
    const theme = useTheme2();
    const styles = useStyles2(getStyles);
    const { item, repeat } = model.useState();

    return (
      <div className={styles.container}>
        <SkeletonTheme
          baseColor={theme.colors.emphasize(theme.colors.background.secondary)}
          highlightColor={theme.colors.emphasize(theme.colors.background.secondary, 0.1)}
          borderRadius={theme.shape.radius.default}
        >
          {[...Array(repeat)].map(() => item())}
        </SkeletonTheme>
      </div>
    );
  };
}

const fadeIn = keyframes({
  '0%': {
    opacity: 0,
  },
  '100%': {
    opacity: 1,
  },
});

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      // animation prevents flickering when loading
      animationName: fadeIn,
      animationDelay: '100ms',
      animationTimingFunction: 'ease-in',
      animationDuration: '100ms',
      animationFillMode: 'backwards',
      display: 'grid',
      gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
      gridAutoRows: '200px',
      rowGap: theme.spacing(1),
      columnGap: theme.spacing(1),
    }),
  };
}
