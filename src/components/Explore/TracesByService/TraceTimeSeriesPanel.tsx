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
import { LoadingState } from '@grafana/data';
import { VAR_FILTERS_EXPR, explorationDS } from 'utils/shared';
import { DrawStyle, StackingMode } from '@grafana/ui';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { SkeletonComponent } from '../ByFrameRepeater';

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
                        message: "No data for selected query",
                        imgWidth:  150,
                      }) 
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
              })
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
          body: PanelBuilders.timeseries()
            .setTitle('Requests over time')
            .setCustomFieldConfig('drawStyle', DrawStyle.Bars)
            .setCustomFieldConfig('stacking', { mode: StackingMode.Normal })
            .setCustomFieldConfig('fillOpacity', 100)
            .setCustomFieldConfig('lineWidth', 0)
            .setCustomFieldConfig('pointSize', 0)
            .setOverrides((overrides) => {
              overrides.matchFieldsWithNameByRegex('"error"').overrideColor({
                mode: 'fixed',
                fixedColor: 'semi-dark-red',
              });
              overrides.matchFieldsWithNameByRegex('"unset"').overrideColor({
                mode: 'fixed',
                fixedColor: 'green',
              });
              overrides.matchFieldsWithNameByRegex('"ok"').overrideColor({
                mode: 'fixed',
                fixedColor: 'dark-green',
              });
            })
            .build(),
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
