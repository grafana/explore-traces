import {
  CustomVariable,
  PanelBuilders,
  SceneCSSGridItem,
  SceneCSSGridLayout,
  SceneDataNode,
  SceneDataTransformer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneQueryRunner,
  VizPanelState,
} from '@grafana/scenes';
import { LayoutSwitcher } from '../LayoutSwitcher';
import { explorationDS, VAR_FILTERS_EXPR } from '../../../utils/shared';
import { ByFrameRepeater } from '../ByFrameRepeater';
import { getLabelValue } from '../../../utils/utils';
import { GRID_TEMPLATE_COLUMNS } from '../../../pages/Explore/SelectStartingPointScene';
import { map, Observable } from 'rxjs';
import { DataFrame, PanelData, reduceField, ReducerID } from '@grafana/data';
import { AxisPlacement, DrawStyle, StackingMode } from '@grafana/ui';

export function buildNormalLayout(
  variable: CustomVariable,
  actionsFn: (df: DataFrame) => VizPanelState['headerActions']
) {
  const query = buildQuery(variable.getValueText());

  return new LayoutSwitcher({
    $data: new SceneDataTransformer({
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [query],
      }),
      transformations: [
        () => (source: Observable<DataFrame[]>) => {
          return source.pipe(
            map((data: DataFrame[]) => {
              data.forEach((a) => reduceField({ field: a.fields[1], reducers: [ReducerID.max] }));
              return data.sort((a, b) => {
                return (b.fields[1].state?.calcs?.max || 0) - (a.fields[1].state?.calcs?.max || 0);
              });
            })
          );
        },
      ],
    }),
    options: [
      { value: 'single', label: 'Single' },
      { value: 'grid', label: 'Grid' },
      { value: 'rows', label: 'Rows' },
    ],
    active: 'grid',
    layouts: [
      new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            minHeight: 300,
            body: PanelBuilders.timeseries().build(),
          }),
        ],
      }),
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: GRID_TEMPLATE_COLUMNS,
          autoRows: '200px',
          children: [],
        }),
        groupBy: true,
        getLayoutChild: getLayoutChild(getLabelValue, variable, actionsFn),
      }),
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: '1fr',
          autoRows: '200px',
          children: [],
        }),
        groupBy: true,
        getLayoutChild: getLayoutChild(getLabelValue, variable, actionsFn),
      }),
    ],
  });
}

export function getLayoutChild(
  getTitle: (df: DataFrame, labelName: string) => string,
  variable: CustomVariable,
  actionsFn: (df: DataFrame) => VizPanelState['headerActions']
) {
  return (data: PanelData, frame: DataFrame) => {
    const panel = PanelBuilders.timeseries()
      .setTitle(getTitle(frame, variable.getValueText()))
      .setData(
        new SceneDataNode({
          data: {
            ...data,
            series: [
              {
                ...frame,
                fields: frame.fields
                  .sort((a, b) => a.labels?.status?.localeCompare(b.labels?.status || '') || 0)
                  .reverse(),
              },
            ],
          },
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
      });

    const actions = actionsFn(frame);
    if (actions) {
      panel.setHeaderActions(actions);
    }
    return new SceneCSSGridItem({
      body: panel.build(),
    });
  };
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
