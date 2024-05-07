import {
  SceneCSSGridItem,
  SceneCSSGridLayout,
  SceneDataTransformer,
  SceneFlexItemLike,
  sceneGraph,
  SceneObject,
  SceneQueryRunner,
  VizPanelState,
} from '@grafana/scenes';
import { explorationDS } from '../../../utils/shared';
import { LayoutSwitcher } from '../LayoutSwitcher';
import { rateByWithStatus } from '../queries/rateByWithStatus';
import { map, Observable } from 'rxjs';
import { DataFrame, reduceField, ReducerID } from '@grafana/data';
import { TraceExploration } from '../../../pages/Explore';
import { barsPanelConfig } from '../panels/barsPanel';

const MAX_PANELS_IN_ALL_ATTRIBUTES_BREAKDOWN = 100;
const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

export function buildAllLayout(
  scene: SceneObject,
  attributes: string[],
  actionsFn: (attribute: string) => VizPanelState['headerActions']
) {
  const children: SceneFlexItemLike[] = [];

  const traceExploration = sceneGraph.getAncestor(scene, TraceExploration);

  for (const attribute of attributes) {
    if (children.length === MAX_PANELS_IN_ALL_ATTRIBUTES_BREAKDOWN) {
      break;
    }

    const vizPanel = barsPanelConfig()
      .setTitle(attribute)
      .setHeaderActions(actionsFn(attribute))
      .setData(
        new SceneDataTransformer({
          $data: new SceneQueryRunner({
            maxDataPoints: 250,
            datasource: explorationDS,
            queries: [rateByWithStatus(traceExploration.state.metric, attribute)],
          }),
          transformations: [
            () => (source: Observable<DataFrame[]>) => {
              return source.pipe(
                map((data: DataFrame[]) => {
                  // Sort by value of status
                  data.forEach((a) => reduceField({ field: a.fields[1], reducers: [ReducerID.max] }));
                  return data
                    .sort((a, b) => {
                      return b.fields[1].labels?.status?.localeCompare(a.fields[1].labels?.status || '') || 0;
                    })
                    .reverse();
                })
              );
            },
          ],
        })
      )
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
