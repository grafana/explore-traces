import React from 'react';

import { LoadingState, PanelData, DataFrame, GrafanaTheme2 } from '@grafana/data';
import {
  SceneObjectState,
  SceneFlexItem,
  SceneObjectBase,
  sceneGraph,
  SceneComponentProps,
  SceneByFrameRepeater,
  SceneLayout,
  SceneCSSGridLayout,
} from '@grafana/scenes';
import { EmptyStateScene } from 'components/emptyState/EmptyStateScene';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import Skeleton from 'react-loading-skeleton';
import { SkeletonScene } from 'components/LoadingState/SkeletonScene';

interface ByFrameRepeaterState extends SceneObjectState {
  body: SceneLayout;
  getLayoutChild(data: PanelData, frame: DataFrame, frameIndex: number): SceneFlexItem;
}

export class ByFrameRepeater extends SceneObjectBase<ByFrameRepeaterState> {
  public constructor(state: ByFrameRepeaterState) {
    super(state);

    this.addActivationHandler(() => {
      const data = sceneGraph.getData(this);

      this._subs.add(
        data.subscribeToState((data) => {
          if (data.data?.state === LoadingState.Done) {
            if (data.data.series.length === 0) {
              this.state.body.setState({
                children: [
                  new SceneFlexItem({ 
                    body: new EmptyStateScene({ 
                      message: "No data for selected query" 
                    }) 
                  }),
                ],
              });
            } else {
              this.performRepeat(data.data);
            }
          } else if (data.data?.state === LoadingState.Loading) {
            this.state.body.setState({
              children: [
                new SceneCSSGridLayout({
                  children: [
                    new SkeletonScene({ 
                      item: SkeletonItem,
                      repeat: 8,
                    }),
                  ],
                })
              ],
            });
          }
        })
      );

      if (data.state.data) {
        this.performRepeat(data.state.data);
      }
    });
  }

  private performRepeat(data: PanelData) {
    const newChildren: SceneFlexItem[] = [];

    for (let seriesIndex = 0; seriesIndex < data.series.length; seriesIndex++) {
      const layoutChild = this.state.getLayoutChild(data, data.series[seriesIndex], seriesIndex);
      newChildren.push(layoutChild);
    }

    this.state.body.setState({ children: newChildren });
  }

  public static Component = ({ model }: SceneComponentProps<SceneByFrameRepeater>) => {
    const { body } = model.useState();
    return <body.Component model={body} />;
  };
}

const SkeletonItem = () => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Skeleton count={1} />
        </div>
        <div className={styles.action}>
          <Skeleton count={1} />
        </div>
      </div>
      <div className={styles.yAxis}>
        {[...Array(2)].map((_, i) => (
          <div className={styles.yAxisItem} key={i}>
            <Skeleton count={1} />
          </div>
        ))}
      </div>
      <div className={styles.xAxis}>
        {[...Array(2)].map((_, i) => (
          <div className={styles.xAxisItem} key={i}>
            <Skeleton count={1} />
          </div>
        ))}
      </div>
    </div>
  )
};

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      backgroundColor: theme.colors.background.primary,
      border: `1px solid ${theme.colors.background.secondary}`,
      padding: '5px',
    }),
    header: css({
      display: 'flex',
      justifyContent: 'space-between',
    }),
    title: css({
      width: '100px',
    }),
    action: css({
      width: '60px',
    }),
    yAxis: css({
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-around',
      marginTop: '35px',
    }),
    yAxisItem: css({
      width: '60px',
      height: '55px',
    }),
    xAxis: css({
      display: 'flex',
      justifyContent: 'space-evenly',
    }),
    xAxisItem: css({
      width: '55px',
    }),
  };
}
