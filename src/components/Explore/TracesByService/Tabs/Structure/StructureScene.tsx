import React from 'react';

import {
  PanelBuilders,
  SceneComponentProps,
  SceneDataNode,
  SceneDataTransformer,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
} from '@grafana/scenes';
import {
  explorationDS,
  MetricFunction,
  VAR_FILTERS_EXPR,
  VAR_LATENCY_THRESHOLD_EXPR,
} from '../../../../../utils/shared';
import { TraceSearchMetadata } from '../../../../../types';
import { mergeTraces } from '../../../../../utils/trace-merge/merge';
import { createDataFrame, Field, FieldType, GrafanaTheme2, LinkModel, LoadingState } from '@grafana/data';
import { TreeNode } from '../../../../../utils/trace-merge/tree-node';
import { Stack, useTheme2 } from '@grafana/ui';
import Skeleton from 'react-loading-skeleton';
import { EmptyState } from '../../../../states/EmptyState/EmptyState';
import { css } from '@emotion/css';
import { locationService } from '@grafana/runtime';

export interface ServicesTabSceneState extends SceneObjectState {
  panel?: SceneFlexLayout;
  loading?: boolean;
  tree?: TreeNode;
  metric?: MetricFunction;
}

const ROOT_SPAN_ID = '0000000000000000';

export class StructureTabScene extends SceneObjectBase<ServicesTabSceneState> {
  constructor(state: Partial<ServicesTabSceneState>) {
    super({
      $data: new SceneDataTransformer({
        $data: new SceneQueryRunner({
          datasource: explorationDS,
          queries: [buildQuery(state.metric as MetricFunction)],
        }),
        transformations: [
          {
            id: 'filterByRefId',
            options: {
              exclude: 'streaming-progress',
            },
          },
        ],
      }),
      loading: true,
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    this.state.$data?.subscribeToState((state) => {
      this.setState({ loading: state.data?.state === LoadingState.Loading });
      if (state.data?.state === LoadingState.Done && state.data?.series.length) {
        const frame = state.data?.series[0].fields[0].values[0];
        if (frame) {
          const response = JSON.parse(frame) as TraceSearchMetadata[];
          const merged = mergeTraces(response);
          merged.children.sort((a, b) => countSpans(b) - countSpans(a));
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
        minHeight: '400px',
        body: this.getPanel(child),
      });
    });
  }

  private getPanel(tree: TreeNode) {
    const timeRange = sceneGraph.getTimeRange(this);
    const from = timeRange.state.value.from;
    const to = timeRange.state.value.to;

    return PanelBuilders.traces()
      .setTitle(`Structure for ${tree.serviceName} [${countSpans(tree)} spans used]`)
      .setOption('createFocusSpanLink' as any, (traceId: string, spanId: string): LinkModel<Field> => {
        return {
          title: 'Open trace',
          href: '#',
          onClick: () => {
            locationService.partial({ traceId, spanId });
          },
          origin: {} as Field,
          target: '_self',
        };
      })
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
    const trace = this.getTrace(tree, ROOT_SPAN_ID);
    const traceName = trace[0].serviceName + ':' + trace[0].operationName;

    return createDataFrame({
      name: `Trace ${traceName}`,
      refId: `trace_${traceName}`,
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
          name: 'parentSpanID',
          type: FieldType.string,
          values: trace.map((x) => x.parentSpanId),
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
  }

  private getTrace(node: TreeNode, spanID: string) {
    const erroredSpans = node.spans.reduce(
      (acc, c) => (c.attributes?.find((a) => a.key === 'status')?.value.stringValue === 'error' ? acc + 1 : acc),
      0
    );

    // start time needs to be different from zero otherwise for the root, otherwise the Trace View won't render it
    let startTime = 0.0001;
    if (spanID !== ROOT_SPAN_ID) {
      startTime =
        node.spans.reduce((acc, c) => acc + parseInt(c.startTimeUnixNano, 10), 0) / node.spans.length / 1000000;
    }

    const values = [
      {
        // Add last 5 spans of the list as external references
        // refType = 'EXTERNAL' doesn't mean anything, it's just to be different from CHILD_OF and FOLLOW_FROM
        references: node.spans.slice(-5).map((x) => ({
          refType: 'EXTERNAL',
          traceID: x.traceId,
          spanID: x.spanID,
        })),
        traceID: node.traceID,
        spanID: node.spans[0].spanID,
        parentSpanId: spanID,
        serviceName: node.serviceName,
        operationName: node.operationName,
        statusCode: erroredSpans > 0 ? 2 /*error*/ : 0 /*unset*/,
        duration: node.spans.reduce((acc, c) => acc + parseInt(c.durationNanos, 10), 0) / node.spans.length / 1000000,
        startTime,
      },
    ];

    for (const child of node.children) {
      values.push(...this.getTrace(child, node.spans[0].spanID));
    }
    return values;
  }

  public static Component = ({ model }: SceneComponentProps<StructureTabScene>) => {
    const { tree, loading, panel } = model.useState();

    const styles = getStyles(useTheme2());
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
          <div className={styles.traceViewList}>{panel && <panel.Component model={panel} />}</div>
        ) : (
          <EmptyState message={'No data available'} />
        )}
      </Stack>
    );
  };
}

function buildQuery(metric: MetricFunction) {
  let metricQuery = 'status = error';
  switch (metric) {
    case 'errors':
      metricQuery = 'status = error';
      break;
    case 'duration':
      metricQuery = 'duration > trace:duration * .3';
      break;
    default:
      metricQuery = 'kind = server';
      break;
  }

  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR} ${
      metric === 'duration' ? `&& duration > ${VAR_LATENCY_THRESHOLD_EXPR}` : ''
    }} &>> { ${metricQuery} } | select(status, resource.service.name, name, nestedSetParent, nestedSetLeft, nestedSetRight)`,
    queryType: 'traceql',
    tableType: 'raw',
    limit: 400,
    spss: 40,
    filters: [],
  };
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    traceViewList: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.x1,
      // Hide the minimap and header components
      'div[class*="panel-content"] > div > :not([class*="TraceTimelineViewer"])': {
        display: 'none',
      },
      // Hide the Span and Resource accordions from span details
      'div[data-testid="span-detail-component"] > :nth-child(4) > :nth-child(1)': {
        display: 'none',
      },
    }),
  };
};

function countSpans(tree: TreeNode) {
  let count = tree.spans.length;
  for (const child of tree.children) {
    count += countSpans(child);
  }
  return count;
}

export function buildStructureScene(metric: MetricFunction) {
  return new SceneFlexItem({
    body: new StructureTabScene({ metric }),
  });
}
