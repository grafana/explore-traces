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
    return new SceneFlexLayout({
      direction: 'row',
      children: [
        new SceneFlexItem({
          body: histogramPanelConfig().build(),
        }),
      ],
    });
  }

  public static Component = ({ model }: SceneComponentProps<HistogramPanel>) => {
    const { panel } = model.useState();

    if (!panel) {
      return;
    }

    return <panel.Component model={panel} />;
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
    .setOption('yAxis', { 
      unit: "s",
    })
    .setOption('color', {
      scheme: 'Turbo',
    })
};
