import React from 'react';

import {
  SceneComponentProps,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
} from '@grafana/scenes';
import { LoadingState } from '@grafana/data';
import { explorationDS } from 'utils/shared';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { MINI_PANEL_HEIGHT } from 'components/Explore/TracesByService/TracesByServiceScene';
import { yBucketToDuration } from 'components/Explore/panels/histogram';
import { AttributePanel, SkeletonComponent } from './AttributePanel';
import { getNoDataMessage } from 'utils/utils';
import { AttributePanelScene } from './AttributePanelScene';

export interface DurationAttributePanelState extends SceneObjectState {
  panel?: SceneFlexLayout;
}

export class DurationAttributePanel extends SceneObjectBase<DurationAttributePanelState> {
  constructor(state: DurationAttributePanelState) {
    super({
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [{ refId: 'A', query: '{nestedSetParent<0} | histogram_over_time(duration)', queryType: 'traceql', tableType: 'spans', limit: 10, spss: 1 }],
      }),
      ...state,
    });

    this.addActivationHandler(() => {
      const data = sceneGraph.getData(this);
      const type = 'duration';
      const title = 'Slow services';

      this._subs.add(
        data.subscribeToState((data) => {
          if (data.data?.state === LoadingState.Done) {
            if (data.data.series.length === 0 || data.data.series[0].length === 0) {
              this.setState({
                panel: new SceneFlexLayout({
                  children: [
                    new AttributePanelScene({
                      message: getNoDataMessage(title.toLowerCase()),
                      title,
                      type,
                    }),
                  ],
                }),
              });
            } else if (data.data.series.length > 0) {
              let yBuckets = data.data?.series.map((s) => parseFloat(s.fields[1].name)).sort((a, b) => a - b);
              if (yBuckets?.length) {
                const slowestBuckets = Math.floor(yBuckets.length / 4);
                let minBucket = yBuckets.length - slowestBuckets - 1;
                if (minBucket < 0) {
                  minBucket = 0;
                }

                const minDuration = yBucketToDuration(minBucket - 1, yBuckets);
              
                this.setState({
                  panel: new SceneFlexLayout({
                    children: [
                      new AttributePanel({ query: `{nestedSetParent<0 && kind=server && duration > ${minDuration}} | by (resource.service.name)`, title, type }),
                    ],
                  })
                }); 
              }
            }
          } else if (data.data?.state === LoadingState.Loading || data.data?.state === LoadingState.Streaming) {
            this.setState({
              panel: new SceneFlexLayout({
                direction: 'column',
                maxHeight: MINI_PANEL_HEIGHT,
                height: MINI_PANEL_HEIGHT,
                children: [
                  new LoadingStateScene({
                    component: () => SkeletonComponent(),
                  }),
                ],
              }),
            });
          }
        })
      );
    });
  }

  public static Component = ({ model }: SceneComponentProps<DurationAttributePanel>) => {
    const { panel } = model.useState();

    if (!panel) {
      return;
    }

    return (
      <panel.Component model={panel} />
    );
  };
}
