import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneFlexItem,
  SceneFlexLayout,
} from '@grafana/scenes';
import { DetailsSceneUpdated } from '../../../utils/shared';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { TraceViewPanelScene } from '../panels/TraceViewPanelScene';

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
      }
      this.publishEvent(new DetailsSceneUpdated({ showDetails: true }), true);
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
        children: [new TraceViewPanelScene({ traceId: this.state.traceId })],
      });
    } else {
      this.state.body.setState({
        children: [
          new SceneFlexItem({
            body: new EmptyStateScene({
              message: 'No trace selected',
            }),
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
