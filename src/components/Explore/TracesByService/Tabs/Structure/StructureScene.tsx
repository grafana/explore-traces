import React from 'react';

import {
  SceneComponentProps,
  SceneFlexItem,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
} from '@grafana/scenes';
import { explorationDS, MetricFunction, VAR_FILTERS_EXPR } from '../../../../../utils/shared';
import { TraceSearchMetadata } from '../../../../../types';
import { mergeTraces } from '../../../../../utils/trace-merge/merge';
import { LoadingState } from '@grafana/data';
import { TreeNode } from '../../../../../utils/trace-merge/tree-node';
import { Stack, useTheme2 } from '@grafana/ui';
import { StructureTree } from './StructureTree';
import Skeleton from 'react-loading-skeleton';
import { EmptyState } from '../../../../states/EmptyState/EmptyState';

export interface ServicesTabSceneState extends SceneObjectState {
  loading?: boolean;
  tree?: TreeNode;
  metric?: MetricFunction;
}

export class StructureTabScene extends SceneObjectBase<ServicesTabSceneState> {
  constructor(state: Partial<ServicesTabSceneState>) {
    super({
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [buildQuery(state.metric as MetricFunction)],
      }),
      loading: true,
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    this.state.$data?.subscribeToState((state) => {
      this.setState({ loading: state.data?.state === LoadingState.Loading });
      if (state.data?.state === LoadingState.Done) {
        const frame = state.data?.series[0].fields[0].values[0];
        if (frame) {
          const response = JSON.parse(frame) as TraceSearchMetadata[];
          const merged = mergeTraces(response);
          this.setState({ tree: merged });
        }
      }
    });
  }

  public static Component = ({ model }: SceneComponentProps<StructureTabScene>) => {
    const { tree, loading } = model.useState();
    const theme = useTheme2();

    return (
      <Stack direction={'column'} gap={2}>
        {loading ? (
          <Stack direction={'column'} gap={2}>
            <Skeleton
              count={4}
              height={200}
              baseColor={theme.colors.background.secondary}
              highlightColor={theme.colors.background.primary}
            />
          </Stack>
        ) : tree && tree.children.length ? (
          <Stack gap={2} direction={'column'}>
            {tree.children.map((child) => (
              <StructureTree tree={child} key={child.name} />
            ))}
          </Stack>
        ) : (
          <EmptyState message={'No data available'} />
        )}
      </Stack>
    );
  };
}

function buildQuery(type: MetricFunction) {
  let typeQuery = 'status = error';
  if (type === 'duration') {
    typeQuery = 'duration > trace:duration * .3';
  }

  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR}} &>> { ${typeQuery} } | select(status, resource.service.name, name, nestedSetParent, nestedSetLeft, nestedSetRight)`,
    queryType: 'traceql',
    tableType: 'raw',
    limit: 200,
    spss: 40,
    filters: [],
  };
}

export function buildStructureScene(metric: MetricFunction) {
  return new SceneFlexItem({
    body: new StructureTabScene({metric}),
  });
}
