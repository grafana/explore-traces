import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneFlexItem,
  SceneCanvasText,
  SceneFlexLayout,
} from '@grafana/scenes';
import { getTraceViewPanel } from '../panels/traceViewPanel';
import { DetailsSceneUpdated } from '../../../utils/shared';

export interface DetailsSceneState extends SceneObjectState {
  traceId?: string;

  body: SceneFlexLayout;
}

export class DetailsScene extends SceneObjectBase<DetailsSceneState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['traceId'] });

  constructor(state: Partial<DetailsSceneState>) {
    super({
      traceId: state.traceId ?? '',
      body: new SceneFlexLayout({ children: [] }),
    });

    this.addActivationHandler(this._onActivate.bind(this));
    this.subscribeToState((newState, prevState) => {
      if (newState.traceId !== prevState.traceId) {
        this.updateBody();
        this.publishEvent(new DetailsSceneUpdated(), true);
      }
    });
  }

  private _onActivate() {
    this.updateBody();
  }

  getUrlState() {
    return { traceId: this.state.traceId };
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    const stateUpdate: Partial<DetailsSceneState> = {};

    if (typeof values.traceId === 'string' && values.traceId !== this.state.traceId) {
      stateUpdate.traceId = values.traceId;
    }

    this.setState(stateUpdate);
  }

  private updateBody() {
    if (this.state.traceId) {
      this.state.body.setState({
        children: [
          new SceneFlexItem({
            body: getTraceViewPanel(this.state.traceId),
          }),
        ],
      });
    } else {
      this.state.body.setState({
        children: [
          new SceneCanvasText({
            text: 'No details available',
            fontSize: 20,
            align: 'center',
          }),
        ],
      });
    }
  }

  public static Component = ({ model }: SceneComponentProps<DetailsScene>) => {
    const { body } = model.useState();
    return body && <body.Component model={body} />;
  };
}
