import {
  CustomVariable,
  SceneCSSGridItem,
  SceneCSSGridLayout,
  SceneDataNode,
  SceneDataTransformer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObject,
  VizPanelState,
} from '@grafana/scenes';
import { LayoutSwitcher } from '../LayoutSwitcher';
import { explorationDS, GRID_TEMPLATE_COLUMNS, MetricFunction } from '../../../utils/shared';
import { ByFrameRepeater } from '../ByFrameRepeater';
import { getLabelValue, getTraceExplorationScene } from '../../../utils/utils';
import { map, Observable } from 'rxjs';
import { DataFrame, PanelData, reduceField, ReducerID } from '@grafana/data';
import { rateByWithStatus } from '../queries/rateByWithStatus';
import { barsPanelConfig } from '../panels/barsPanel';
import { linesPanelConfig } from '../panels/linesPanel';
import { StepQueryRunner } from '../queries/StepQueryRunner';
import { syncYAxis } from '../behaviors/syncYaxis';
import { exemplarsTransformations } from '../../../utils/exemplars';

export function buildNormalLayout(
  scene: SceneObject,
  variable: CustomVariable,
  actionsFn: (df: DataFrame) => VizPanelState['headerActions']
) {
  const traceExploration = getTraceExplorationScene(scene);
  const metric = traceExploration.getMetricVariable().getValue() as MetricFunction;
  const query = rateByWithStatus(metric, variable.getValueText());
  const panels: Record<string, SceneCSSGridItem> = {};

  return new LayoutSwitcher({
    $behaviors: [syncYAxis()],
    $data: new SceneDataTransformer({
      $data: new StepQueryRunner({
        maxDataPoints: 64,
        datasource: explorationDS,
        queries: [query],
      }),
      transformations: [
        ...exemplarsTransformations(traceExploration.state.locationService),
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
            body: (metric === 'duration' ? linesPanelConfig().setUnit('s') : linesPanelConfig()).build(),
          }),
        ],
      }),
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: GRID_TEMPLATE_COLUMNS,
          autoRows: '200px',
          isLazy: true,
          children: [],
        }),
        groupBy: true,
        getLayoutChild: getLayoutChild(panels, getLabelValue, variable, metric, actionsFn),
      }),
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: '1fr',
          autoRows: '200px',
          isLazy: true,
          children: [],
        }),
        groupBy: true,
        getLayoutChild: getLayoutChild(panels, getLabelValue, variable, metric, actionsFn),
      }),
    ],
  });
}

export function getLayoutChild(
  panels: Record<string, SceneCSSGridItem>,
  getTitle: (df: DataFrame, labelName: string) => string,
  variable: CustomVariable,
  metric: string,
  actionsFn: (df: DataFrame) => VizPanelState['headerActions']
) {
  return (data: PanelData, frame: DataFrame) => {
    const existingGridItem = frame.name ? panels[frame.name] : undefined;

    const dataNode = new SceneDataNode({
      data: {
        ...data,
        annotations: data.annotations?.filter((a) => a.refId === frame.refId),
        series: [
          {
            ...frame,
            fields: frame.fields.sort((a, b) => a.labels?.status?.localeCompare(b.labels?.status || '') || 0),
          },
        ],
      },
    });

    if (existingGridItem) {
      existingGridItem.state.body?.setState({ $data: dataNode });
      return existingGridItem;
    }

    const panel = (metric === 'duration' ? linesPanelConfig().setUnit('s') : barsPanelConfig())
      .setTitle(getTitle(frame, variable.getValueText()))
      .setData(dataNode);

    const actions = actionsFn(frame);
    if (actions) {
      panel.setHeaderActions(actions);
    }

    const gridItem = new SceneCSSGridItem({
      body: panel.build(),
    });
    if (frame.name) {
      panels[frame.name] = gridItem;
    }

    return gridItem;
  };
}
