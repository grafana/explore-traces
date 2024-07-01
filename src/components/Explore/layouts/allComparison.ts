import { PanelBuilders, SceneCSSGridItem, SceneCSSGridLayout, SceneDataNode, VizPanelState } from '@grafana/scenes';
import { LayoutSwitcher } from '../LayoutSwitcher';
import { ByFrameRepeater } from '../ByFrameRepeater';
import { GRID_TEMPLATE_COLUMNS } from '../../../pages/Explore/SelectStartingPointScene';
import { DataFrame, PanelData } from '@grafana/data';
import { AxisPlacement } from '@grafana/ui';
import { TooltipDisplayMode } from '@grafana/schema';

export const BaselineColor = '#CCCCDC';
export const SelectionColor = '#FF9830';

export function buildAllComparisonLayout(actionsFn: (df: DataFrame) => VizPanelState['headerActions']) {
  return new LayoutSwitcher({
    options: [
      { value: 'grid', label: 'Grid' },
      { value: 'rows', label: 'Rows' },
    ],
    active: 'grid',
    layouts: [
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: GRID_TEMPLATE_COLUMNS,
          autoRows: '200px',
          children: [],
        }),
        getLayoutChild: getLayoutChild(getFrameName, actionsFn),
      }),
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: '1fr',
          autoRows: '200px',
          children: [],
        }),
        getLayoutChild: getLayoutChild(getFrameName, actionsFn),
      }),
    ],
  });
}

const getFrameName = (df: DataFrame) => {
  return df.name || 'No name available';
};

export function getLayoutChild(
  getTitle: (df: DataFrame) => string,
  actionsFn: (df: DataFrame) => VizPanelState['headerActions']
) {
  return (data: PanelData, frame: DataFrame) => {
    const panel = PanelBuilders.barchart()
      .setTitle(getTitle(frame))
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
      })
      .setData(
        new SceneDataNode({
          data: {
            ...data,
            series: [
              {
                ...frame,
                fields: frame.fields.sort((a, b) => a.labels?.status?.localeCompare(b.labels?.status || '') || 0),
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
      body: panel.build(),
    });
  };
}
