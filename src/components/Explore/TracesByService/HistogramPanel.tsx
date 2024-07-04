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
import { ComparisonSelection, explorationDS, VAR_FILTERS_EXPR } from 'utils/shared';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { SkeletonComponent } from '../ByFrameRepeater';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { ComparisonControl } from './ComparisonControl';
import { getTraceByServiceScene } from 'utils/utils';
import { TraceSceneState } from './TracesByServiceScene';

export interface HistogramPanelState extends SceneObjectState {
  panel?: SceneFlexLayout;
  yBuckets?: number[];
}

export class HistogramPanel extends SceneObjectBase<HistogramPanelState> {
  constructor(state: HistogramPanelState) {
    super({
      yBuckets: [],
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [buildQuery()],
      }),
      ...state,
    });

    this.addActivationHandler(() => {
      this._onActivate();
      const data = sceneGraph.getData(this);

      const parent = getTraceByServiceScene(this);
      this._subs.add(
        parent.subscribeToState((newState, prevState) => {
          if (newState.selection !== prevState.selection && data.state.data?.state === LoadingState.Done) {
            const annotations = this.buildSelectionAnnotation(newState);

            data.setState({
              data: {
                ...data.state.data!,
                annotations: annotations,
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
              const yBuckets = data.state.data?.series.map((s) => parseFloat(s.fields[1].name)).sort((a, b) => a - b);
              if (parent.state.selection && newData.data?.state === LoadingState.Done) {
                // set selection annotation if it exists
                const annotations = this.buildSelectionAnnotation(parent.state);

                data.setState({
                  data: {
                    ...data.state.data!,
                    annotations: annotations,
                  },
                });
              }
              // update panel
              this.setState({
                yBuckets,
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

  private buildSelectionAnnotation(state: TraceSceneState) {
    const xSel = state.selection?.raw?.x;
    const ySel = state.selection?.raw?.y;

    const frame = arrayToDataFrame([
      {
        time: xSel?.from || 0,
        xMin: xSel?.from || 0,
        xMax: xSel?.to || 0,
        yMin: ySel?.from,
        yMax: ySel?.to,
        isRegion: true,
        fillOpacity: 0.1,
        lineWidth: 1,
        lineStyle: 'solid',
        color: '#CCCCDC',
        text: 'Comparison selection',
      },
    ]);
    frame.name = 'xymark';

    return [frame];
  }

  private _onActivate() {
    this.setState({
      panel: this.getVizPanel(),
    });
  }

  private getVizPanel() {
    const parent = getTraceByServiceScene(this);
    const panel = histogramPanelConfig()
      .setTitle('Histogram by duration')
      // @ts-ignore
      .setOption('selectionMode', 'xy')
      .setHeaderActions(
        new ComparisonControl({ placeholder: 'Select an area of the histogram to start an investigation' })
      )
      .build();
    panel.setState({
      extendPanelContext: (vizPanel, context) => {
        // TODO remove when we the Grafana version with #88107 is released
        // @ts-ignore
        context.onSelectRange = (args) => {
          if (args.length === 0) {
            parent.setState({ selection: undefined });
            return;
          }
          const rawSelection = args[0];
          const newSelection: ComparisonSelection = { raw: rawSelection };

          newSelection.timeRange = {
            from: Math.round(rawSelection.x.from / 1000),
            to: Math.round(rawSelection.x.to / 1000),
          };

          const yFrom = yBucketToDuration(args[0].y.from, this.state.yBuckets);
          const yTo = yBucketToDuration(args[0].y.to, this.state.yBuckets);
          newSelection.duration = { from: yFrom, to: yTo };

          parent.setState({ selection: newSelection });
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

function yBucketToDuration(yValue: number, buckets?: number[]) {
  if (!buckets) {
    return '';
  }
  const rawValue = buckets[Math.floor(yValue)];
  if (!rawValue || isNaN(rawValue)) {
    return '';
  }
  if (rawValue >= 1) {
    return `${rawValue.toFixed(0)}s`;
  }
  return `${(rawValue * 1000).toFixed(0)}ms`;
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
