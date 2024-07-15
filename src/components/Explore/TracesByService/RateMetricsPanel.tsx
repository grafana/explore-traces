import React from 'react';

import {
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { FieldType, LoadingState } from '@grafana/data';
import { explorationDS, MetricFunction } from 'utils/shared';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { SkeletonComponent } from '../ByFrameRepeater';
import { barsPanelConfig } from '../panels/barsPanel';
import { ComparisonControl } from './ComparisonControl';
import { rateByWithStatus } from '../queries/rateByWithStatus';
import { StepQueryRunner } from '../queries/StepQueryRunner';

export interface RateMetricsPanelState extends SceneObjectState {
  panel?: SceneFlexLayout;
  metric: MetricFunction;
}

export class RateMetricsPanel extends SceneObjectBase<RateMetricsPanelState> {
  constructor(state: RateMetricsPanelState) {
    super({
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
              data.data.annotations?.push({
                length: 1,
                fields: [{ name: 'bloop', type: FieldType.string, values: ['bloop'], config: {} }],
                refId: 'A',
              });
              this.setState({
                panel: this.getVizPanel(this.state.metric),
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
      $data: new StepQueryRunner({
        maxDataPoints: 64,
        datasource: explorationDS,
        queries: [rateByWithStatus(this.state.metric)],
      }),
      panel: this.getVizPanel(this.state.metric),
    });
  }

  private getVizPanel(type: MetricFunction) {
    const panel = barsPanelConfig().setHeaderActions(new ComparisonControl({ query: 'status = error' }));
    if (type === 'errors') {
      panel.setTitle('Errors rate').setColor({ fixedColor: 'semi-dark-red', mode: 'fixed' });
    } else {
      panel.setTitle('Span rate');
    }
    return new SceneFlexLayout({
      direction: 'row',
      children: [
        new SceneFlexItem({
          body: panel.build(),
        }),
      ],
    });
  }

  public static Component = ({ model }: SceneComponentProps<RateMetricsPanel>) => {
    const { panel } = model.useState();

    if (!panel) {
      return;
    }

    return <panel.Component model={panel} />;
  };
}
