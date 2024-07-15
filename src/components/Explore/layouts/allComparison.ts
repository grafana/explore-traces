import { PanelBuilders, SceneCSSGridItem, SceneCSSGridLayout, SceneDataNode, VizPanelState } from '@grafana/scenes';
import { ByFrameRepeater } from '../ByFrameRepeater';
import { GRID_TEMPLATE_COLUMNS } from '../../../pages/Explore/SelectStartingPointScene';
import { DataFrame, PanelData } from '@grafana/data';
import { AxisPlacement } from '@grafana/ui';
import { TooltipDisplayMode } from '@grafana/schema';
import { HighestDifferencePanel } from './HighestDifferencePanel';

export const BaselineColor = '#5794F299';
export const SelectionColor = '#FF9930';

export function buildAllComparisonLayout(actionsFn: (df: DataFrame) => VizPanelState['headerActions']) {
  return new ByFrameRepeater({
    body: new SceneCSSGridLayout({
      templateColumns: GRID_TEMPLATE_COLUMNS,
      autoRows: '300px',
      children: [],
    }),
    getLayoutChild: getLayoutChild(getFrameName, actionsFn),
  });
}

const getFrameName = (df: DataFrame) => {
  return df.name || 'No name available';
};

function getLayoutChild(
  getTitle: (df: DataFrame) => string,
  actionsFn: (df: DataFrame) => VizPanelState['headerActions']
) {
  return (data: PanelData, frame: DataFrame) => {
    const panel = getPanelConfig()
      .setTitle(getTitle(frame))
      .setData(
        new SceneDataNode({
          data: {
            ...data,
            series: [
              {
                ...frame,
              },
            ],
          },
        })
      );

    const actions = actionsFn(frame);
    if (actions) {
      panel.setHeaderActions(actions);
    }
    return new SceneCSSGridItem({
      body: new HighestDifferencePanel({ frame, panel: panel.build() }),
    });
  };
}

export function getPanelConfig() {
  return PanelBuilders.barchart()
    .setOption('legend', { showLegend: false })
    .setOption('tooltip', { mode: TooltipDisplayMode.Multi })
    .setMax(1)
    .setOverrides((overrides) => {
      overrides.matchFieldsWithName('Value').overrideCustomFieldConfig('axisPlacement', AxisPlacement.Hidden);
      overrides
        .matchFieldsWithName('Baseline')
        .overrideColor({
          mode: 'fixed',
          fixedColor: BaselineColor,
        })
        .overrideUnit('percentunit');
      overrides
        .matchFieldsWithName('Selection')
        .overrideColor({
          mode: 'fixed',
          fixedColor: SelectionColor,
        })
        .overrideUnit('percentunit');
    });
}
