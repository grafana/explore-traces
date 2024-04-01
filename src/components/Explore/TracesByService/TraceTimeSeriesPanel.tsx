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
import { VAR_FILTERS_EXPR, explorationDS } from 'utils/shared';
import { DrawStyle, StackingMode } from '@grafana/ui';

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
