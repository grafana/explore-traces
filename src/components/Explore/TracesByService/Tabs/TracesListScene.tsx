import React from 'react';

import {
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { SpanListPanelScene } from 'components/Explore/panels/SpanListPanelScene';

export interface TracesListSceneState extends SceneObjectState {
  loading?: boolean;
  panel?: SceneFlexLayout;
}

export class TracesListScene extends SceneObjectBase<TracesListSceneState> {
  constructor(state: Partial<TracesListSceneState>) {
    super({
      ...state,
      panel: new SceneFlexLayout({
        direction: 'row',
        children: [
          new SpanListPanelScene(),
        ],
      })
    });
  }

  public static Component = ({ model }: SceneComponentProps<TracesListScene>) => {
    const { panel } = model.useState();

    if (!panel) {
      return;
    }

    return <panel.Component model={panel} />;
  };
}

export function buildTracesListScene() {
  return new SceneFlexItem({
    body: new TracesListScene({}),
  });
}
