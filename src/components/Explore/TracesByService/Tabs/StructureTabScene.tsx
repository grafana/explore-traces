import React from 'react';

import {
  SceneCanvasText,
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
} from '@grafana/scenes';
import { explorationDS, VAR_FILTERS_EXPR } from '../../../../utils/shared';
import { TraceSearchMetadata } from '../../../../types';
import { mergeTraces } from '../../../../utils/trace-merge/merge';
import { LoadingState } from '@grafana/data';
import { TreeNode } from '../../../../utils/trace-merge/tree-node';
import { Stack } from '@grafana/ui';
import { StructureTree } from './StructureTree';

export interface ServicesTabSceneState extends SceneObjectState {
  loading?: boolean;
  panel?: SceneFlexLayout;
  tree?: TreeNode;
}

export class StructureTabScene extends SceneObjectBase<ServicesTabSceneState> {
  constructor(state: Partial<ServicesTabSceneState>) {
    super({
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [buildQuery()],
      }),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    this.state.$data?.subscribeToState((state) => {
      if (state.data?.state === LoadingState.Done) {
        const frame = state.data?.series[0].fields[0].values[0];
        if (frame) {
          const response = JSON.parse(frame) as TraceSearchMetadata[];
          const merged = mergeTraces(response);
          this.setState({ tree: merged });
        }
      }
    });

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
          body: new SceneCanvasText({
            text: 'No content available yet',
            fontSize: 20,
            align: 'center',
          }),
        }),
      ],
    });
  }

  public static Component = ({ model }: SceneComponentProps<StructureTabScene>) => {
    const { panel, tree } = model.useState();

    if (tree) {
      return (
        <Stack gap={2} direction={'column'}>
          {tree.children.map((child) => (
            <StructureTree tree={child} key={child.name} />
          ))}
        </Stack>
      );
    }

    if (!panel) {
      return;
    }

    return <panel.Component model={panel} />;
  };
}

function buildQuery() {
  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR}} >> {status = error} | select(status, resource.service.name, name, nestedSetParent, nestedSetLeft, nestedSetRight)`,
    queryType: 'traceql',
    tableType: 'raw',
    limit: 200,
    spss: 20,
    filters: [],
  };
}

export function buildStructureTabScene() {
  return new SceneFlexItem({
    body: new StructureTabScene({}),
  });
}
