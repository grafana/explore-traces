import React from 'react';

import {
  CustomVariable,
  SceneComponentProps,
  SceneFlexItem,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
  SceneVariableSet,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { explorationDS, MetricFunction, VAR_FILTERS_EXPR } from '../../../../../utils/shared';
import { TraceSearchMetadata } from '../../../../../types';
import { mergeTraces } from '../../../../../utils/trace-merge/merge';
import { GrafanaTheme2, LoadingState } from '@grafana/data';
import { TreeNode } from '../../../../../utils/trace-merge/tree-node';
import { RadioButtonGroup, Stack, useTheme2 } from '@grafana/ui';
import { StructureTree } from './StructureTree';
import Skeleton from 'react-loading-skeleton';
import { EmptyState } from '../../../../states/EmptyState/EmptyState';
import { css } from '@emotion/css';

export interface ServicesTabSceneState extends SceneObjectState {
  loading?: boolean;
  tree?: TreeNode;
  metric?: MetricFunction;
}

const VAR_STRUCTURE_FILTER = 'structureFilter';
const VAR_STRUCTURE_FILTER_EXPR = '${structureFilter}';

export class StructureTabScene extends SceneObjectBase<ServicesTabSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_STRUCTURE_FILTER],
  });

  constructor(state: Partial<ServicesTabSceneState>) {
    super({
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [buildQuery(state.metric as MetricFunction)],
      }),
      $variables: state.$variables ?? getVariablesSet(),
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

  private getStructureFilterVariable() {
    const variable = sceneGraph.lookupVariable(VAR_STRUCTURE_FILTER, this);
    if (!(variable instanceof CustomVariable)) {
      throw new Error('Structure filters variable not found');
    }

    return variable;
  }

  private onChangeStructureFilter = (value?: string) => {
    if (!value) {
      return;
    }
    const variable = this.getStructureFilterVariable();
    variable.changeValueTo(value);
    variable.setState({ query: value });
  };

  public static Component = ({ model }: SceneComponentProps<StructureTabScene>) => {
    const { tree, loading } = model.useState();
    const styles = getStyles(useTheme2());
    const variable = model.getStructureFilterVariable();
    const { query } = variable.useState();
    const theme = useTheme2();

    return (
      <Stack direction={'column'} gap={2}>
        <Stack gap={1} alignItems={'center'}>
          <div className={styles.label}>Structure by</div>
          <RadioButtonGroup
            onChange={(value) => model.onChangeStructureFilter(value)}
            options={structureFilterOptions}
            value={query}
          />
        </Stack>
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

const getStyles = (theme: GrafanaTheme2) => {
  return {
    label: css({
      fontSize: theme.typography.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      lineHeight: 1.25,
      color: theme.colors.text.primary,
    }),
  };
};

const structureFilterOptions = [
  { label: 'Errors', value: 'status = error' },
  { label: 'Services', value: 'kind = server' },
  { label: 'Databases', value: 'span.db.statement != ""' },
];

function getVariablesSet() {
  return new SceneVariableSet({
    variables: [
      new CustomVariable({
        name: VAR_STRUCTURE_FILTER,
        label: 'Structure by',
        query: structureFilterOptions[0].value,
      }),
    ],
  });
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
