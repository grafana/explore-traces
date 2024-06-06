import React from 'react';

import {
  SceneComponentProps,
  SceneFlexItem,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { TracesByServiceScene } from '../../TracesByServiceScene';
import { AttributesComparisonScene } from './AttributesComparisonScene';
import { AttributesBreakdownScene } from './AttributesBreakdownScene';

interface BreakdownSceneState extends SceneObjectState {
  body?: SceneObject;
}

export class BreakdownScene extends SceneObjectBase<BreakdownSceneState> {
  constructor(state: Partial<BreakdownSceneState>) {
    super({ ...state });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    sceneGraph.getAncestor(this, TracesByServiceScene).subscribeToState((newState, prevState) => {
      if (newState.selection !== prevState.selection) {
        this.updateBody();
      }
    });

    this.updateBody();
  }

  private updateBody() {
    const ancestor = sceneGraph.getAncestor(this, TracesByServiceScene);
    const { selection } = ancestor.state;
    if (selection && selection) {
      this.setState({ body: new AttributesComparisonScene({}) });
    } else {
      this.setState({ body: new AttributesBreakdownScene({}) });
    }
  }

  public static Component = ({ model }: SceneComponentProps<BreakdownScene>) => {
    const { body } = model.useState();
    return body && <body.Component model={body} />;
  };
}

export function buildBreakdownScene() {
  return new SceneFlexItem({
    body: new BreakdownScene({}),
  });
}
