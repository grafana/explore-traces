import React from 'react';

import {
  PanelBuilders,
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
} from '@grafana/scenes';
import { arrayToDataFrame, LoadingState } from '@grafana/data';
import { explorationDS, VAR_FILTERS_EXPR } from 'utils/shared';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { SkeletonComponent } from '../ByFrameRepeater';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { TracesByServiceScene } from './TracesByServiceScene';

export interface HistogramPanelState extends SceneObjectState {
  panel?: SceneFlexLayout;
}

export class HistogramPanel extends SceneObjectBase<HistogramPanelState> {
  constructor(state: HistogramPanelState) {
    super({
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [buildQuery()],
      }),
      ...state,
    });

    this.addActivationHandler(() => {
      this._onActivate();
      const data = sceneGraph.getData(this);

      const parent = sceneGraph.getAncestor(this, TracesByServiceScene);
      this._subs.add(
        parent.subscribeToState((newState, prevState) => {
          if (newState.selection !== prevState.selection && data.state.data?.state === LoadingState.Done) {
            const xSel = newState.selection?.x;
            const ySel = newState.selection?.y;

            const frame = arrayToDataFrame([
              {
                time: xSel?.from || 0,
                xMin: xSel?.from || 0,
                xMax: xSel?.to || 0,
                yMin: ySel?.from,
                yMax: ySel?.to,
                isRegion: true,
                fillOpacity: 0.1,
                lineWidth: 2,
                lineStyle: 'dash',
                text: 'Comparison selection',
              },
            ]);
            frame.name = 'xymark';

            data.setState({
              data: {
                ...data.state.data!,
                annotations: [frame],
              },
            });
          }
        })
      );

      this._subs.add(
        data.subscribeToState((newData) => {
          if (newData.data?.state === LoadingState.Done) {
            if (newData.data.series.length === 0 || newData.data.series[0].length === 0) {
              this.setState({
                panel: new SceneFlexLayout({
                  children: [
                    new SceneFlexItem({
                      body: new EmptyStateScene({
                        message: 'No data for selected query',
                        imgWidth: 150,
                      }),
                    }),
                  ],
                }),
              });
            } else {
              this.setState({
                panel: this.getVizPanel(),
              });
            }
          } else if (newData.data?.state === LoadingState.Loading) {
            this.setState({
              panel: new SceneFlexLayout({
                direction: 'column',
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

  private _onActivate() {
    this.setState({
      panel: this.getVizPanel(),
    });
  }

  private getVizPanel() {
    const parent = sceneGraph.getAncestor(this, TracesByServiceScene);
    const panel = histogramPanelConfig()
      .setTitle('Histogram by duration')
      // @ts-ignore
      .setOption('selectionMode', 'xy')
      .build();
    panel.setState({
      extendPanelContext: (vizPanel, context) => {
        // TODO remove when we the Grafana version with #88107 is released
        // @ts-ignore
        context.onSelectRange = (args) => {
          parent.setState({ selection: args.length > 0 ? args[0] : undefined });
        };
      },
    });

    return new SceneFlexLayout({
      direction: 'row',
      children: [
        new SceneFlexItem({
          body: panel,
        }),
      ],
    });
  }

  public static Component = ({ model }: SceneComponentProps<HistogramPanel>) => {
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
      height: '100%',
      display: 'flex',
      '& .u-select': {
        border: '1px solid #ffffff75',
      },
    }),
  };
}

export function buildQuery() {
  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR}} | histogram_over_time(duration)`,
    queryType: 'traceql',
    tableType: 'spans',
    limit: 1000,
    spss: 10,
    filters: [],
  };
}

export const histogramPanelConfig = () => {
  return PanelBuilders.heatmap()
    .setOption('legend', { show: false })
    .setOption('yAxis', {
      unit: 's',
    })
    .setOption('color', {
      scheme: 'RdBu',
    });
};
