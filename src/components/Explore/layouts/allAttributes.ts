import {
  SceneCSSGridItem,
  SceneCSSGridLayout,
  SceneDataTransformer,
  SceneFlexItemLike,
  VizPanelState,
} from '@grafana/scenes';
import { LayoutSwitcher } from '../LayoutSwitcher';
import { map, Observable } from 'rxjs';
import { DataFrame, reduceField, ReducerID } from '@grafana/data';
import { barsPanelConfig } from '../panels/barsPanel';
import { AllLayoutRunners } from 'pages/Explore/SelectStartingPointScene';

const MAX_PANELS_IN_ALL_ATTRIBUTES_BREAKDOWN = 100;
const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

export function buildAllLayout(
  actionsFn: (attribute: string) => VizPanelState['headerActions'],
  runners: AllLayoutRunners[]
) {
  const children: SceneFlexItemLike[] = [];

  for (const runner of runners) {
    if (children.length === MAX_PANELS_IN_ALL_ATTRIBUTES_BREAKDOWN) {
      break;
    }

    const vizPanel = barsPanelConfig()
      .setTitle(runner.attribute)
      .setHeaderActions(actionsFn(runner.attribute))
      .setData(
        new SceneDataTransformer({
          $data: runner.runner,
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
