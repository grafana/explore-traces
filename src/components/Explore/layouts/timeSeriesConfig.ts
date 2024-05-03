import { VizPanelBuilder } from '@grafana/scenes';
import { AxisPlacement, DrawStyle, StackingMode } from '@grafana/ui';
import { Options, FieldConfig } from '@grafana/schema/dist/esm/raw/composable/timeseries/panelcfg/x/TimeSeriesPanelCfg_types.gen';

export const setTimeSeriesConfig = (panel: VizPanelBuilder<Options, FieldConfig>) => {
  return panel
    .setOption('legend', { showLegend: false })
      .setCustomFieldConfig('drawStyle', DrawStyle.Bars)
      .setCustomFieldConfig('stacking', { mode: StackingMode.Normal })
      .setCustomFieldConfig('fillOpacity', 100)
      .setCustomFieldConfig('lineWidth', 0)
      .setCustomFieldConfig('pointSize', 0)
      .setCustomFieldConfig('axisLabel', 'Rate')
      .setOverrides((overrides) => {
        overrides
          .matchFieldsWithNameByRegex('.*status="error".*')
          .overrideColor({
            mode: 'fixed',
            fixedColor: 'semi-dark-red',
          })
          .overrideCustomFieldConfig('axisPlacement', AxisPlacement.Right)
          .overrideCustomFieldConfig('axisLabel', 'Errors');
        overrides.matchFieldsWithNameByRegex('.*status="unset".*').overrideColor({
          mode: 'fixed',
          fixedColor: 'green',
        });
        overrides.matchFieldsWithNameByRegex('.*status="ok".*').overrideColor({
          mode: 'fixed',
          fixedColor: 'dark-green',
        });
      });
};
