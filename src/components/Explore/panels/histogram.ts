import { getTraceByServiceScene } from '../../../utils/utils';
import { ComparisonSelection } from '../../../utils/shared';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';
import { PanelBuilders, SceneFlexItem, SceneFlexLayout, SceneObject } from '@grafana/scenes';

export function getHistogramVizPanel(scene: SceneObject, yBuckets: number[]) {
  const parent = getTraceByServiceScene(scene);
  const panel = histogramPanelConfig()
    .setHoverHeader(true)
    // @ts-ignore
    .setOption('selectionMode', 'xy')
    .build();
  panel.setState({
    extendPanelContext: (vizPanel, context) => {
      // TODO remove when we the Grafana version with #88107 is released
      // @ts-ignore
      context.onSelectRange = (args) => {
        if (args.length === 0) {
          parent.setState({ selection: undefined });
          return;
        }
        const rawSelection = args[0];
        const newSelection: ComparisonSelection = { raw: rawSelection };

        newSelection.timeRange = {
          from: Math.round(rawSelection.x.from / 1000),
          to: Math.round(rawSelection.x.to / 1000),
        };

        const yFrom = yBucketToDuration(args[0].y.from, yBuckets);
        const yTo = yBucketToDuration(args[0].y.to, yBuckets);
        newSelection.duration = { from: yFrom, to: yTo };

        parent.setState({ selection: newSelection });

        reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.start_investigation, {
          selection: newSelection,
          metric: 'duration',
        });
      };
    },
  });
  return new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({
        body: panel,
      }),
    ],
  });
}

export const histogramPanelConfig = () => {
  return PanelBuilders.heatmap()
    .setOption('legend', { show: false })
    .setOption('yAxis', {
      unit: 's',
      axisLabel: 'Duration',
    })
    .setOption('color', {
      scheme: 'YlGnBu',
    })
    .setOption('rowsFrame', { value: 'Spans' });
};

export function yBucketToDuration(yValue: number, buckets?: number[]) {
  if (!buckets) {
    return '';
  }
  const rawValue = buckets[Math.floor(yValue)];
  if (!rawValue || isNaN(rawValue)) {
    return '';
  }
  if (rawValue >= 1) {
    return `${rawValue.toFixed(0)}s`;
  }
  return `${(rawValue * 1000).toFixed(0)}ms`;
}
