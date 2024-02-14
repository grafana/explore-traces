import React from 'react';

import {
  PanelBuilders,
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { locationService } from '@grafana/runtime';

export interface TracesListSceneState extends SceneObjectState {
  loading?: boolean;
  panel?: SceneFlexLayout;
}

export class TracesListScene extends SceneObjectBase<TracesListSceneState> {
  constructor(state: Partial<TracesListSceneState>) {
    super({
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    if (!this.state.panel) {
      this.setState({
        panel: this.getVizPanel(),
      });
    }
  }

  private getVizPanel() {
    return new SceneFlexLayout({
      direction: 'row',
      children: [
        new SceneFlexItem({
          body: PanelBuilders.table() //
            .setTitle('Spans table')
            .setOverrides((builder) => {
              return builder
                .matchFieldsWithName('traceID')
                .overrideLinks([
                  {
                    title: 'Trace: ${__value.raw}',
                    url: '',
                    onClick: (data) => {
                      const traceID: string | undefined = data.origin?.field?.values?.[data.origin?.rowIndex];
                      traceID && locationService.partial({ traceId: traceID });
                    },
                  },
                ])
                .matchFieldsWithName('spanID')
                .overrideLinks([
                  {
                    title: 'Span: ${__value.raw}',
                    url: '',
                    onClick: (data) => {
                      const traceID: string | undefined =
                        data?.origin?.field?.state?.scopedVars?.__dataContext?.value?.frame?.first?.[
                          data.origin?.rowIndex
                        ];
                      traceID && locationService.partial({ traceId: traceID });
                    },
                  },
                ]);
            })
            .build(),
        }),
      ],
    });
  }

  public static Component = ({ model }: SceneComponentProps<TracesListScene>) => {
    const { panel } = model.useState();

    if (!panel) {
      return;
    }

    return <panel.Component model={panel} />;
  };
}

export function buildTracesListScene() {
  return new SceneFlexItem({
    body: new TracesListScene({}),
  });
}
