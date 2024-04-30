import {
  PanelBuilders,
  SceneCSSGridItem,
  SceneCSSGridLayout,
  SceneFlexItemLike,
  SceneQueryRunner,
  VizPanelState,
} from '@grafana/scenes';
import { explorationDS, VAR_FILTERS_EXPR } from '../../../utils/shared';
import { AxisPlacement, DrawStyle, StackingMode, TooltipDisplayMode } from '@grafana/ui';
import { LayoutSwitcher } from '../LayoutSwitcher';

const MAX_PANELS_IN_ALL_ATTRIBUTES_BREAKDOWN = 100;
const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

export function buildAllLayout(attributes: string[], actionsFn: (attribute: string) => VizPanelState['headerActions']) {
  const children: SceneFlexItemLike[] = [];

  for (const attribute of attributes) {
    if (children.length === MAX_PANELS_IN_ALL_ATTRIBUTES_BREAKDOWN) {
      break;
    }

    const vizPanel = PanelBuilders.timeseries()
      .setTitle(attribute)
      .setData(
        new SceneQueryRunner({
          maxDataPoints: 250,
          datasource: explorationDS,
          queries: [buildQuery(attribute)],
        })
      )
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
      })
      .setHeaderActions(actionsFn(attribute))
      .setOption('tooltip', { mode: TooltipDisplayMode.Multi })
      .build();

    children.push(
      new SceneCSSGridItem({
        body: vizPanel,
      })
    );
  }
  return new LayoutSwitcher({
    active: 'grid',
    options: [
      { value: 'grid', label: 'Grid' },
      { value: 'rows', label: 'Rows' },
    ],
    layouts: [
      new SceneCSSGridLayout({
        templateColumns: GRID_TEMPLATE_COLUMNS,
        autoRows: '200px',
        children: children,
        isLazy: true,
      }),
      new SceneCSSGridLayout({
        templateColumns: '1fr',
        autoRows: '200px',
        // Clone children since a scene object can only have one parent at a time
        children: children.map((c) => c.clone()),
        isLazy: true,
      }),
    ],
  });
}

function getExpr(attr: string) {
  return `{${VAR_FILTERS_EXPR}} | rate() by(${attr}, status)`;
}

function buildQuery(tagKey: string) {
  return {
    refId: 'A',
    query: getExpr(tagKey),
    queryType: 'traceql',
    tableType: 'spans',
    limit: 100,
    spss: 10,
    filters: [],
  };
}
