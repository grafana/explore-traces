import { css, keyframes } from '@emotion/css';
import { SceneObjectState, SceneObjectBase, SceneComponentProps } from '@grafana/scenes';
import { useStyles2, useTheme2 } from '@grafana/ui';
import React from 'react';
import { SkeletonTheme } from 'react-loading-skeleton';
import { testIds } from 'utils/testIds';

interface LoadingStateSceneState extends SceneObjectState {
  component: () => React.JSX.Element;
}

export class LoadingStateScene extends SceneObjectBase<LoadingStateSceneState> {
  public static Component = ({ model }: SceneComponentProps<LoadingStateScene>) => {
    const theme = useTheme2();
    const styles = useStyles2(getStyles);
    const { component } = model.useState();

    return (
      <div className={styles.container} data-testid={testIds.loadingState}>
        <SkeletonTheme
          baseColor={theme.colors.emphasize(theme.colors.background.secondary)}
          highlightColor={theme.colors.emphasize(theme.colors.background.secondary, 0.1)}
          borderRadius={theme.shape.radius.default}
        >
          {component()}
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

function getStyles() {
  return {
    container: css({
      label: 'loading-state-scene',
      // animation prevents flickering when loading
      animationName: fadeIn,
      animationDelay: '100ms',
      animationTimingFunction: 'ease-in',
      animationDuration: '100ms',
      animationFillMode: 'backwards',
    }),
  };
}
