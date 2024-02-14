import React from 'react';

import {
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { getSpansListPanel } from '../../panels/spansListPanel';

export interface TracesListSceneState extends SceneObjectState {
  loading?: boolean;
  panel?: SceneFlexLayout;
}

export class TracesListScene extends SceneObjectBase<TracesListSceneState> {
  constructor(state: Partial<TracesListSceneState>) {
    super({
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    if (!this.state.panel) {
      this.setState({
        panel: this.getVizPanel(),
      });
    }
  }

  private getVizPanel() {
    return new SceneFlexLayout({
      direction: 'row',
      children: [
        new SceneFlexItem({
          body: getSpansListPanel(),
        }),
      ],
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
