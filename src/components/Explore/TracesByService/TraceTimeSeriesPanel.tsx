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
import { FieldType, LoadingState } from '@grafana/data';
import { explorationDS, VAR_FILTERS_EXPR } from 'utils/shared';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { SkeletonComponent } from '../ByFrameRepeater';
import { barsPanelConfig } from '../panels/barsPanel';

export interface TraceTimeSeriesPanelState extends SceneObjectState {
  panel?: SceneFlexLayout;
}

export class TraceTimeSeriesPanel extends SceneObjectBase<TraceTimeSeriesPanelState> {
  constructor(state: TraceTimeSeriesPanelState) {
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
              data.data.annotations?.push({
                length: 1,
                fields: [{ name: 'bloop', type: FieldType.string, values: ['bloop'], config: {} }],
                refId: 'A',
              });
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
          body: barsPanelConfig().build(),
        }),
      ],
    });
  }

  public static Component = ({ model }: SceneComponentProps<TraceTimeSeriesPanel>) => {
    const { panel } = model.useState();

    if (!panel) {
      return;
    }

    return <panel.Component model={panel} />;
  };
}

function buildQuery() {
  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR}} | rate() by (status)`,
    queryType: 'traceql',
    tableType: 'spans',
    limit: 100,
    spss: 10,
    filters: [],
  };
}
