import React from 'react';

import { SceneComponentProps, SceneFlexItem, SceneObject, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { SpanListScene } from 'components/Explore/TracesByService/Tabs/Spans/SpanListScene';
import { getMetricVariable, getTraceByServiceScene } from 'utils/utils';

export interface SpansSceneState extends SceneObjectState {
  body?: SceneObject;
}

export class SpansScene extends SceneObjectBase<SpansSceneState> {
  constructor(state: Partial<SpansSceneState>) {
    super({ ...state });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this._subs.add(
      getTraceByServiceScene(this).state.$data?.subscribeToState(() => {
        this.updateBody();
      })
    );

    this._subs.add(
      getTraceByServiceScene(this).subscribeToState((newState, prevState) => {
        if (newState.$data?.state.key !== prevState.$data?.state.key) {
          this.updateBody();
        }
      })
    );

    this._subs.add(
      getMetricVariable(this).subscribeToState((newState, prevState) => {
        if (newState.value !== prevState.value) {
          this.updateBody();
        }
      })
    );

    this.updateBody();
  }

  private updateBody() {
    this.setState({ body: new SpanListScene({}) });
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
