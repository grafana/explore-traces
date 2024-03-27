import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  PanelBuilders,
  SceneFlexItem,
  SceneFlexLayout,
  SceneQueryRunner,
} from '@grafana/scenes';
import { GraphDrawStyle, ScaleDistribution } from '@grafana/schema/dist/esm/common/common.gen';
import { VAR_FILTERS_EXPR, explorationDS } from 'utils/shared';

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
      ...state
    });

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
          body: PanelBuilders.timeseries()
            .setTitle('Requests over time')
            .setCustomFieldConfig('drawStyle', GraphDrawStyle.Bars)
            .setCustomFieldConfig('scaleDistribution', {
              type: ScaleDistribution.Log,
              log: 2,
            })
            .setOverrides((c) =>
              c
                .matchFieldsWithName('"error"')
                .overrideColor({
                  mode: 'fixed',
                  fixedColor: 'red',
                })
                .matchFieldsWithName('"ok"')
                .overrideColor({
                  mode: 'fixed',
                  fixedColor: 'green',
                })
                .matchFieldsWithName('"unset"')
                .overrideColor({
                  mode: 'fixed',
                  fixedColor: 'green',
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
