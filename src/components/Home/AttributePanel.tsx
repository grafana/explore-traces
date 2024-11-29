import React from 'react';

import {
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
} from '@grafana/scenes';
import { LoadingState } from '@grafana/data';
import { explorationDS, MetricFunction } from 'utils/shared';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { SkeletonComponent } from '../Explore/ByFrameRepeater';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { MINI_PANEL_HEIGHT } from 'components/Explore/TracesByService/TracesByServiceScene';
import { AttributePanelScene } from './AttributePanelScene';

export interface AttributePanelState extends SceneObjectState {
  panel?: SceneFlexLayout;
  query: string;
  title: string;
  type: MetricFunction;
}

export class AttributePanel extends SceneObjectBase<AttributePanelState> {
  constructor(state: AttributePanelState) {
    super({
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [{ refId: 'A', query: state.query, queryType: 'traceql', tableType: 'spans', limit: 10, spss: 1 }],
      }),
      ...state,
    });
    

    this.addActivationHandler(() => {
      const data = sceneGraph.getData(this);

      this._subs.add(
        data.subscribeToState((data) => {
          if (data.data?.state === LoadingState.Done) {
            if (data.data.series.length === 0 || data.data.series[0].length === 0) {
              this.setState({
                panel: new SceneFlexLayout({
                  children: [
                    new SceneFlexItem({
                      body: new EmptyStateScene({
                        imgWidth: 110,
                      }),
                    }),
                  ],
                }),
              });
            } else if (data.data.series.length > 0) {
              this.setState({
                panel: new SceneFlexLayout({
                  children: [
                    new SceneFlexItem({
                      body: new AttributePanelScene({
                        series: data.data.series,
                        title: state.title,
                        type: state.type
                      }),
                    }),
                  ],
                })
              });
            }
          } else if (data.data?.state === LoadingState.Loading) {
            this.setState({
              panel: new SceneFlexLayout({
                direction: 'column',
                maxHeight: MINI_PANEL_HEIGHT,
                height: MINI_PANEL_HEIGHT,
                children: [
                  new LoadingStateScene({
                    component: () => SkeletonComponent(1),
                  }),
                ],
              }),
            });
          }
        })
      );
    });
  }

  public static Component = ({ model }: SceneComponentProps<AttributePanel>) => {
    const { panel } = model.useState();
    const styles = useStyles2(getStyles);

    if (!panel) {
      return;
    }

    return (
      <div className={styles.container}>
        <panel.Component model={panel} />
      </div>
    );
  };
}

function getStyles() {
  return {
    container: css({
      minWidth: '350px',
      width: '-webkit-fill-available',
    }),
  };
}
