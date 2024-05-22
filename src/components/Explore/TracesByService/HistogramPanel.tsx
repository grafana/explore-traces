import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  SceneQueryRunner,
  sceneGraph,
  PanelBuilders,
} from '@grafana/scenes';
import { LoadingState } from '@grafana/data';
import { VAR_FILTERS_EXPR, explorationDS } from 'utils/shared';
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

      this._subs.add(
        data.subscribeToState((data) => {
          if (data.data?.state === LoadingState.Done) {
            if (data.data.series.length === 0 || data.data.series[0].length === 0) {
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
          } else if (data.data?.state === LoadingState.Loading) {
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
    const panel = PanelBuilders.heatmap()
      .setTitle('Histogram by duration')
      .setOption('legend', { show: false })
      .setOption('yAxis', {
        unit: 's',
      })
      .setOption('color', {
        scheme: 'Turbo',
      })
      // @ts-ignore
      .setOption('selectMode', 'xy')
      // @ts-ignore
      .setOption('keepSelectedArea', true)
      .build();
    panel.setState({
      extendPanelContext: (vizPanel, context) => {
        // TODO remove when we the Grafana version with #88107 is released
        // @ts-ignore
        context.onSelect = (args) => parent.setState({ selection: args });
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

function buildQuery() {
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
