import React from 'react';

import {
  CustomVariable,
  PanelBuilders,
  SceneComponentProps,
  SceneFlexLayout,
  SceneDataNode,
  SceneFlexItem,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
  SceneVariableSet,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { explorationDS, VAR_FILTERS_EXPR } from '../../../../../utils/shared';
import { TraceSearchMetadata } from '../../../../../types';
import { mergeTraces } from '../../../../../utils/trace-merge/merge';
import { createDataFrame, FieldType, GrafanaTheme2, LoadingState } from '@grafana/data';
import { TreeNode } from '../../../../../utils/trace-merge/tree-node';
import { RadioButtonGroup, Stack, useTheme2 } from '@grafana/ui';
import Skeleton from 'react-loading-skeleton';
import { EmptyState } from '../../../../states/EmptyState/EmptyState';
import { css } from '@emotion/css';

export interface ServicesTabSceneState extends SceneObjectState {
  panel?: SceneFlexLayout;
  loading?: boolean;
  tree?: TreeNode;
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
        queries: [buildQuery()],
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
          this.setState({
            tree: merged,
            panel: new SceneFlexLayout({
              height: '100%',
              wrap: 'wrap',
              children: this.getPanels(merged),
            }),
          });
        }
      }
    });
  }

  private getPanels(tree: TreeNode) {
    return tree.children.map((child) => {
      return new SceneFlexItem({
        height: 150,
        width: '100%',
        minHeight: '300px',
        body: this.getPanel(child),
      });
    });
  }

  private getPanel(tree: TreeNode) {
    const timeRange = sceneGraph.getTimeRange(this);
    const from = timeRange.state.value.from;
    const to = timeRange.state.value.to;

    return PanelBuilders.traces()
      .setTitle('Trace')
      .setData(
        new SceneDataNode({
          data: {
            state: LoadingState.Done,
            timeRange: {
              from,
              to,
              raw: { from, to },
            },
            series: [
              {
                ...this.buildData(tree),
              },
            ],
          },
        })
      )
      .build();
  }

  private buildData(tree: TreeNode) {
    const trace = this.getTrace(tree, tree.traceID, '000000000000000');
    const traceName = trace[0].serviceName + ':' + trace[0].operationName;

    const df = createDataFrame({
      name: `Trace ${traceName}`,
      refId: `trace_${traceName}`,
      meta: {
        custom: {
          skipHeader: true,
        },
      },
      fields: [
        {
          name: 'references',
          type: FieldType.other,
          values: trace.map((x) => x.references),
        },
        {
          name: 'traceID',
          type: FieldType.string,
          values: trace.map((x) => x.traceID),
        },
        {
          name: 'spanID',
          type: FieldType.string,
          values: trace.map((x) => x.spanID),
        },
        {
          name: 'serviceName',
          type: FieldType.string,
          values: trace.map((x) => x.serviceName),
        },
        {
          name: 'operationName',
          type: FieldType.string,
          values: trace.map((x) => x.operationName),
        },
        {
          name: 'duration',
          type: FieldType.number,
          values: trace.map((x) => x.duration),
        },
        {
          name: 'startTime',
          type: FieldType.number,
          values: trace.map((x) => x.startTime),
        },
        {
          name: 'statusCode',
          type: FieldType.number,
          values: trace.map((x) => x.statusCode),
        },
      ],
    });

    return df;
  }

  private getTrace(node: TreeNode, traceID: string, spanID: string) {
    const erroredSpans = node.spans.reduce(
      (acc, c) => (c.attributes?.find((a) => a.key === 'status')?.value.stringValue === 'error' ? acc + 1 : acc),
      0
    );
    const values = [
      {
        references: [
          {
            refType: 'CHILD_OF',
            traceID: traceID,
            spanID: spanID,
          },
        ],
        traceID: node.traceID,
        spanID: node.spans[0].spanID,
        serviceName: node.serviceName,
        operationName: node.operationName,
        statusCode: erroredSpans > 0 ? 2 /*error*/ : 0 /*unset*/,
        duration: node.spans.reduce((acc, c) => acc + parseInt(c.durationNanos, 10), 0) / node.spans.length / 1000000,
        startTime:
          node.spans.reduce((acc, c) => acc + parseInt(c.startTimeUnixNano, 10), 0) / node.spans.length / 1000000,
      },
    ];

    for (const child of node.children) {
      values.push(...this.getTrace(child, node.traceID, node.spans[0].spanID));
    }
    return values;
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
    const { tree, loading, panel } = model.useState();

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
          <div className={styles.traceViewList}>{panel && <panel.Component model={panel} />}</div>
        ) : (
          <EmptyState message={'No data available'} />
        )}
      </Stack>
    );
  };
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'row',
      flexGrow: 1,
      height: '100%',
    }),
    label: css({
      fontSize: theme.typography.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      lineHeight: 1.25,
      color: theme.colors.text.primary,
    }),
    traceViewList: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.x1,
      'div[class*="panel-content"] > div > :not([class*="TraceTimelineViewer"])': {
        display: 'none',
      },
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

function buildQuery() {
  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR}} &>> { ${VAR_STRUCTURE_FILTER_EXPR} } | select(status, resource.service.name, name, nestedSetParent, nestedSetLeft, nestedSetRight)`,
    queryType: 'traceql',
    tableType: 'raw',
    limit: 200,
    spss: 40,
    filters: [],
  };
}

export function buildStructureScene() {
  return new SceneFlexItem({
    body: new StructureTabScene({}),
  });
}
