import React from 'react';

import {
  SceneCanvasText,
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';

export interface ServicesTabSceneState extends SceneObjectState {
  loading?: boolean;
  panel?: SceneFlexLayout;
}

export class ServicesTabScene extends SceneObjectBase<ServicesTabSceneState> {
  constructor(state: Partial<ServicesTabSceneState>) {
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
          body: new SceneCanvasText({
            text: 'No content available yet',
            fontSize: 20,
            align: 'center',
          }),
        }),
      ],
    });
  }

  public static Component = ({ model }: SceneComponentProps<ServicesTabScene>) => {
    const { panel } = model.useState();

    if (!panel) {
      return;
    }

    return <panel.Component model={panel} />;
  };
}

export function buildServicesTabScene() {
  return new SceneFlexItem({
    body: new ServicesTabScene({}),
  });
}
