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
import { MetricFunction, VAR_METRIC } from '../../../../../utils/shared';
import { getMetricVariable, getTraceByServiceScene } from '../../../../../utils/utils';
import { getDefaultSelectionForMetric } from '../../../../../utils/comparison';

interface ComparisonSceneState extends SceneObjectState {
  body?: SceneObject;
}

export class ComparisonScene extends SceneObjectBase<ComparisonSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_METRIC],
  });

  constructor(state: Partial<ComparisonSceneState>) {
    super({ ...state });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    const metricVar = getMetricVariable(this);
    const metric = metricVar.getValue() as MetricFunction;

    const tracesByService = getTraceByServiceScene(this);
    if (!tracesByService.state.selection) {
      const selection = getDefaultSelectionForMetric(metric);
      if (selection) {
        tracesByService.setState({ selection });
      }
    }

    this.updateBody();
  }

  private updateBody() {
    this.setState({ body: new AttributesComparisonScene({}) });
  }

  public static Component = ({ model }: SceneComponentProps<ComparisonScene>) => {
    const { body } = model.useState();
    return body && <body.Component model={body} />;
  };
}

export function buildComparisonScene() {
  return new SceneFlexItem({
    body: new ComparisonScene({}),
  });
}
