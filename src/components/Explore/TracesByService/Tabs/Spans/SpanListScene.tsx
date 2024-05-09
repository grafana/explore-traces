import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  PanelBuilders,
  SceneFlexItem,
  SceneFlexLayout,
  SceneQueryRunner,
  sceneGraph,
} from '@grafana/scenes';
import { LoadingState, GrafanaTheme2 } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { explorationDS } from 'utils/shared';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { css } from '@emotion/css';
import Skeleton from 'react-loading-skeleton';
import { useStyles2 } from '@grafana/ui';
import { buildQuery } from '../../TracesByServiceScene';

export interface SpanListSceneState extends SceneObjectState {
  panel?: SceneFlexLayout;
}

export class SpanListScene extends SceneObjectBase<SpanListSceneState> {
  constructor() {
    super({
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [buildQuery()],
      }),
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
                        message: "No data for selected query" 
                      }) 
                    }),
                  ],
                }),
              });
            } else {
              this.setState({
                panel: new SceneFlexLayout({
                  direction: 'row',
                  children: [
                    new SceneFlexItem({
                      body: PanelBuilders.table()
                        .setTitle('Spans table')
                        .setOverrides((builder) => {
                          return builder
                            .matchFieldsWithName('traceID')
                            .overrideLinks([
                              {
                                title: 'Trace: ${__value.raw}',
                                url: '',
                                onClick: (data) => {
                                  const traceID: string | undefined = data.origin?.field?.values?.[data.origin?.rowIndex];
                                  traceID && locationService.partial({ traceId: traceID });
                                },
                              },
                            ])
                            .matchFieldsWithName('spanID')
                            .overrideLinks([
                              {
                                title: 'Span: ${__value.raw}',
                                url: '',
                                onClick: (data) => {
                                  const traceID: string | undefined =
                                    data?.origin?.field?.state?.scopedVars?.__dataContext?.value?.frame?.first?.[data.origin?.rowIndex];
                                  traceID && locationService.partial({ traceId: traceID });
                                },
                              },
                            ]);
                        })
                        .build()
                    }),
                  ],
                })
              });
            }
          } else if (data.data?.state === LoadingState.Loading) {
            this.setState({
              panel: new SceneFlexLayout({
                direction: 'row',
                children: [
                  new LoadingStateScene({ 
                    component: SkeletonComponent,
                  }),
                ],
              })
            });         
          }
        })
      );
    });
  }

  public static Component = ({ model }: SceneComponentProps<SpanListScene>) => {
    const { panel } = model.useState();

    if (!panel) {
      return;
    }

    return <panel.Component model={panel} />;
  };
}

const SkeletonComponent = () => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <Skeleton count={1} width={80} />
      </div>
      {[...Array(3)].map((_, i) => (
        <div className={styles.row} key={i}>
          {[...Array(6)].map((_, j) => (
            <span className={styles.rowItem} key={j}><Skeleton count={1}/></span>
          ))}
        </div>
      ))}
    </div>
  )
};

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      height: '100%',
      width: '100%',
      position: 'absolute',
      backgroundColor: theme.colors.background.primary,
      border: `1px solid ${theme.colors.border.weak}`,
      padding: '5px',
    }),
    title: css({
      marginBottom: '20px',
    }),
    row: css({
      marginBottom: '5px',
      display: 'flex',
      justifyContent: 'space-around',
    }),
    rowItem: css({
      width: '14%',
    }),
  };
}
