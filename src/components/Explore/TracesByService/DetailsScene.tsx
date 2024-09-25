import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
} from '@grafana/scenes';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { TraceViewPanelScene } from '../panels/TraceViewPanelScene';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';
import { getTraceExplorationScene } from '../../../utils/utils';

export interface DetailsSceneState extends SceneObjectState {
  body: SceneFlexLayout;
}

export class DetailsScene extends SceneObjectBase<DetailsSceneState> {
  constructor(state: Partial<DetailsSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this.updateBody();

    const traceExploration = getTraceExplorationScene(this);

    traceExploration.subscribeToState((newState, prevState) => {
      if (newState.traceId !== prevState.traceId || newState.spanId !== prevState.spanId) {
        this.updateBody();
        reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.open_trace, {
          traceId: newState.traceId,
          spanId: newState.spanId,
        });
      }
    });
  }

  private updateBody() {
    const traceExploration = getTraceExplorationScene(this);

    if (traceExploration.state.traceId) {
      this.state.body.setState({
        children: [
          new TraceViewPanelScene({
            traceId: traceExploration.state.traceId,
            spanId: traceExploration.state.spanId,
          }),
        ],
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
