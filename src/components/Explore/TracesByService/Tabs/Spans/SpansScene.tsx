import React from 'react';

import {
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { SpanListScene } from 'components/Explore/TracesByService/Tabs/Spans/SpanListScene';

export interface SpansSceneState extends SceneObjectState {
  loading?: boolean;
  panel?: SceneFlexLayout;
}

export class SpansScene extends SceneObjectBase<SpansSceneState> {
  constructor(state: Partial<SpansSceneState>) {
    super({
      ...state,
      panel: new SceneFlexLayout({
        direction: 'row',
        children: [
          new SpanListScene(),
        ],
      })
    });
  }

  public static Component = ({ model }: SceneComponentProps<SpansScene>) => {
    const { panel } = model.useState();

    if (!panel) {
      return;
    }

    return <panel.Component model={panel} />;
  };
}

export function buildSpansScene() {
  return new SceneFlexItem({
    body: new SpansScene({}),
  });
}
