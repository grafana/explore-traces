import {
  CustomVariable,
  PanelBuilders,
  SceneCSSGridItem,
  SceneCSSGridLayout,
  SceneDataNode,
  SceneDataTransformer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObject,
  SceneQueryRunner,
  VizPanelState,
} from '@grafana/scenes';
import { LayoutSwitcher } from '../LayoutSwitcher';
import { explorationDS, MetricFunction } from '../../../utils/shared';
import { ByFrameRepeater } from '../ByFrameRepeater';
import { getExplorationScene, getLabelValue } from '../../../utils/utils';
import { GRID_TEMPLATE_COLUMNS } from '../../../pages/Explore/SelectStartingPointScene';
import { map, Observable } from 'rxjs';
import { DataFrame, PanelData, reduceField, ReducerID } from '@grafana/data';
import { rateByWithStatus } from '../queries/rateByWithStatus';
import { barsPanelConfig } from '../panels/barsPanel';
import { linesPanelConfig } from '../panels/linesPanel';

export function buildNormalLayout(
  scene: SceneObject,
  variable: CustomVariable,
  actionsFn: (df: DataFrame) => VizPanelState['headerActions']
) {
  const traceExploration = getExplorationScene(scene);
  const metric = traceExploration.getMetricVariable().getValue() as MetricFunction;
  const query = rateByWithStatus(metric, variable.getValueText());

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
        getLayoutChild: getLayoutChild(getLabelValue, variable, metric, actionsFn),
      }),
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: '1fr',
          autoRows: '200px',
          children: [],
        }),
        groupBy: true,
        getLayoutChild: getLayoutChild(getLabelValue, variable, metric, actionsFn),
      }),
    ],
  });
}

export function getLayoutChild(
  getTitle: (df: DataFrame, labelName: string) => string,
  variable: CustomVariable,
  metric: string,
  actionsFn: (df: DataFrame) => VizPanelState['headerActions']
) {
  return (data: PanelData, frame: DataFrame) => {
    const panel = (metric === 'duration' ? linesPanelConfig() : barsPanelConfig())
      .setTitle(getTitle(frame, variable.getValueText()))
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
