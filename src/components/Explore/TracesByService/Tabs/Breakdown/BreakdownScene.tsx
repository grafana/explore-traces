import React from 'react';

import {
  SceneComponentProps,
  SceneFlexItem,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { AttributesBreakdownScene } from './AttributesBreakdownScene';
import { VAR_METRIC } from '../../../../../utils/shared';

interface BreakdownSceneState extends SceneObjectState {
  body?: SceneObject;
}

export class BreakdownScene extends SceneObjectBase<BreakdownSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_METRIC],
  });

  constructor(state: Partial<BreakdownSceneState>) {
    super({ ...state });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this.updateBody();
  }

  private updateBody() {
    this.setState({ body: new AttributesBreakdownScene({}) });
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
