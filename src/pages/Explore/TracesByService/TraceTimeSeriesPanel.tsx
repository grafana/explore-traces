import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  PanelBuilders,
  SceneFlexItem,
  SceneDataTransformer,
  SceneFlexLayout,
} from '@grafana/scenes';
import { GraphDrawStyle, ScaleDistribution } from '@grafana/schema/dist/esm/common/common.gen';

export interface TraceTimeSeriesPanelState extends SceneObjectState {
  panel?: SceneFlexLayout;
}

export class TraceTimeSeriesPanel extends SceneObjectBase<TraceTimeSeriesPanelState> {
  constructor(state: TraceTimeSeriesPanelState) {
    super(state);

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    if (!this.state.panel) {
      this.setState({
        panel: this.getVizPanel(),
      });
    }
  }

  private getVizPanel() {
    return new SceneFlexLayout({
      direction: 'row',
      children: [
        new SceneFlexItem({
          body: PanelBuilders.timeseries() //
            .setTitle('Spans')
            .setOption('legend', { showLegend: false })
            .setCustomFieldConfig('drawStyle', GraphDrawStyle.Points)
            .setCustomFieldConfig('fillOpacity', 9)
            .setCustomFieldConfig('scaleDistribution', {
              type: ScaleDistribution.Log,
              log: 2,
            })
            .setOverrides((b) =>
              b
                .matchFieldsWithName('error')
                .overrideColor({
                  mode: 'fixed',
                  fixedColor: 'red',
                })
                .overrideCustomFieldConfig('pointSize', 7)
                .matchFieldsWithName('ok')
                .overrideColor({
                  mode: 'fixed',
                  fixedColor: 'green',
                })
                .matchFieldsWithName('unset')
                .overrideColor({
                  mode: 'fixed',
                  fixedColor: 'green',
                })
            )
            .setData(
              new SceneDataTransformer({
                transformations: [
                  {
                    id: 'groupingToMatrix',
                    options: {
                      columnField: 'status',
                      rowField: 'Start time',
                      valueField: 'Duration',
                    },
                  },
                  {
                    id: 'convertFieldType',
                    options: {
                      fields: {},
                      conversions: [
                        {
                          targetField: 'Start time\\status',
                          destinationType: 'time',
                        },
                      ],
                    },
                  },
                ],
              })
            )
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
