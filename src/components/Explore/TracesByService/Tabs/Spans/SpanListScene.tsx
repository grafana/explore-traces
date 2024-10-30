import React from 'react';

import {
  PanelBuilders,
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { GrafanaTheme2, LoadingState, PanelData } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { css } from '@emotion/css';
import Skeleton from 'react-loading-skeleton';
import { useStyles2 } from '@grafana/ui';

export interface SpanListSceneState extends SceneObjectState {
  panel?: SceneFlexLayout;
  dataState: 'empty' | 'loading' | 'done';
}

export class SpanListScene extends SceneObjectBase<SpanListSceneState> {
  constructor(state: Partial<SpanListSceneState>) {
    super({
      dataState: 'empty',
      ...state,
    });

    this.addActivationHandler(() => {
      const sceneData = sceneGraph.getData(this);

      this.updatePanel(sceneData.state.data);
      this._subs.add(
        sceneData.subscribeToState((data) => {
          this.updatePanel(data.data);
        })
      );
    });
  }

  private updatePanel(data?: PanelData) {
    console.log(this.state.dataState, data?.series?.[0]?.length, data?.state, data);

    if (
      this.state.dataState !== 'loading' &&
      (data?.state === LoadingState.Loading ||
        data?.state === LoadingState.NotStarted ||
        !data?.state ||
        (data?.state === LoadingState.Streaming && !data.series?.[0]?.length))
    ) {
      this.setState({
        dataState: 'loading',
        panel: new SceneFlexLayout({
          direction: 'row',
          children: [
            new LoadingStateScene({
              component: SkeletonComponent,
            }),
          ],
        }),
      });
    }
    if (data?.state === LoadingState.Done || data?.state === LoadingState.Streaming) {
      if (this.state.dataState !== 'empty' && (data.series.length === 0 || data.series[0].length === 0)) {
        this.setState({
          dataState: 'empty',
          panel: new SceneFlexLayout({
            children: [
              new SceneFlexItem({
                body: new EmptyStateScene({
                  message: 'No data for selected query',
                }),
              }),
            ],
          }),
        });
      } else if (this.state.dataState !== 'done') {
        this.setState({
          dataState: 'done',
          panel: new SceneFlexLayout({
            direction: 'row',
            children: [
              new SceneFlexItem({
                body: PanelBuilders.table()
                  .setHoverHeader(true)
                  .setOverrides((builder) => {
                    return builder
                      .matchFieldsWithName('spanID')
                      .overrideLinks([
                        {
                          title: 'Span: ${__value.raw}',
                          url: '',
                          onClick: (clickEvent) => {
                            const data = sceneGraph.getData(this);
                            const firstSeries = data.state.data?.series[0];
                            const traceIdField = firstSeries?.fields.find((f) => f.name === 'traceIdHidden');
                            const spanIdField = firstSeries?.fields.find((f) => f.name === 'spanID');
                            const traceId = traceIdField?.values[clickEvent.origin?.rowIndex || 0];
                            const spanId = spanIdField?.values[clickEvent.origin?.rowIndex || 0];

                            traceId &&
                              locationService.partial({
                                traceId,
                                spanId,
                              });
                          },
                        },
                      ])
                      .matchFieldsWithName('traceService')
                      .overrideCustomFieldConfig('width', 350)
                      .matchFieldsWithName('traceName')
                      .overrideCustomFieldConfig('width', 350);
                  })
                  .build(),
              }),
            ],
          }),
        });
      }
    }
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
  const styles = useStyles2(getSkeletonStyles);

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <Skeleton count={1} width={80} />
      </div>
      {[...Array(3)].map((_, i) => (
        <div className={styles.row} key={i}>
          {[...Array(6)].map((_, j) => (
            <span className={styles.rowItem} key={j}>
              <Skeleton count={1} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

function getSkeletonStyles(theme: GrafanaTheme2) {
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
