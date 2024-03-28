import React from 'react';

import { DataFrame, LoadingState, PanelData } from '@grafana/data';
import {
  SceneByFrameRepeater,
  SceneComponentProps,
  SceneFlexItem,
  sceneGraph,
  SceneLayout,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { groupSeriesBy } from '../../utils/panels';

interface ByFrameRepeaterState extends SceneObjectState {
  body: SceneLayout;
  groupBy?: string;
  getLayoutChild(data: PanelData, frame: DataFrame, frameIndex: number): SceneFlexItem;
}

export class ByFrameRepeater extends SceneObjectBase<ByFrameRepeaterState> {
  public constructor(state: ByFrameRepeaterState) {
    super(state);

    this.addActivationHandler(() => {
      const data = sceneGraph.getData(this);

      this._subs.add(
        data.subscribeToState((data) => {
          if (data.data?.state === LoadingState.Done) {
            this.performRepeat(data.data);
          }
        })
      );

      if (data.state.data) {
        this.performRepeat(data.state.data);
      }
    });
  }

  private performRepeat(data: PanelData) {
    const newChildren: SceneFlexItem[] = [];
    let frames = data.series;

    if (this.state.groupBy) {
      frames = groupSeriesBy(data, this.state.groupBy);
    }

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const layoutChild = this.state.getLayoutChild(data, frames[frameIndex], frameIndex);
      newChildren.push(layoutChild);
    }

    this.state.body.setState({ children: newChildren });
  }

  public static Component = ({ model }: SceneComponentProps<SceneByFrameRepeater>) => {
    const { body } = model.useState();
    return <body.Component model={body} />;
  };
}
