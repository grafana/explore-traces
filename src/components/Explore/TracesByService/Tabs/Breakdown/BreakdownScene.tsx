import React from 'react';

import {
  SceneComponentProps,
  SceneFlexItem,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { AttributesComparisonScene } from './AttributesComparisonScene';
import { AttributesBreakdownScene } from './AttributesBreakdownScene';
import { VAR_METRIC } from '../../../../../utils/shared';
import { getTraceByServiceScene } from 'utils/utils';

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
    getTraceByServiceScene(this).subscribeToState((newState, prevState) => {
      if (newState.selection !== prevState.selection) {
        this.updateBody();
      }
    });

    this.updateBody();
  }

  private updateBody() {
    const ancestor = getTraceByServiceScene(this);
    const { selection } = ancestor.state;
    this.setState({ body: selection ? new AttributesComparisonScene({}) : new AttributesBreakdownScene({}) });
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
