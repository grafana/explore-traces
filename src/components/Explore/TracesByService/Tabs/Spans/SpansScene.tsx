import React from 'react';

import {
  SceneComponentProps,
  SceneFlexItem,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { SpanListScene } from 'components/Explore/TracesByService/Tabs/Spans/SpanListScene';
import { getTraceExplorationScene } from 'utils/utils';
import { MetricFunction } from 'utils/shared';

export interface SpansSceneState extends SceneObjectState {
  body?: SceneObject;
}

export class SpansScene extends SceneObjectBase<SpansSceneState> {
  constructor(state: Partial<SpansSceneState>) {
    super({ ...state });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this.updateBody();
  }

  private updateBody() {
    const traceExploration = getTraceExplorationScene(this);
    const metric = traceExploration.getMetricVariable().getValue() as MetricFunction;
    this.setState({ body: new SpanListScene({ metric }) });
  }

  public static Component = ({ model }: SceneComponentProps<SpansScene>) => {
    const { body } = model.useState();
    return body && <body.Component model={body} />;
  };
}

export function buildSpansScene() {
  return new SceneFlexItem({
    body: new SpansScene({}),
  });
}
