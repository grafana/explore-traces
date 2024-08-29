import { css } from '@emotion/css';
import { SceneObjectState, SceneObjectBase, SceneComponentProps, SceneObject } from '@grafana/scenes';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2, Box, Stack, TabsBar, Tab } from '@grafana/ui';
import React from 'react';
import { getTraceExplorationScene, getTraceByServiceScene } from 'utils/utils';
import { ShareExplorationAction } from '../../actions/ShareExplorationAction';
import { buildSpansScene } from './Spans/SpansScene';
import { buildStructureScene } from './Structure/StructureScene';
import { buildBreakdownScene } from './Breakdown/BreakdownScene';
import { MetricFunction } from 'utils/shared';

interface ActionViewDefinition {
  displayName: (metric: MetricFunction) => string;
  value: ActionViewType;
  getScene: (metric: MetricFunction) => SceneObject;
}

export type ActionViewType = 'traceList' | 'breakdown' | 'structure';
export const actionViewsDefinitions: ActionViewDefinition[] = [
  { displayName: breakdownDisplayName, value: 'breakdown', getScene: buildBreakdownScene },
  { displayName: structureDisplayName, value: 'structure', getScene: buildStructureScene },
  {
    displayName: tracesDisplayName,
    value: 'traceList',
    getScene: buildSpansScene,
  },
];

export interface TabsBarSceneState extends SceneObjectState {}

export class TabsBarScene extends SceneObjectBase<TabsBarSceneState> {
  public static Component = ({ model }: SceneComponentProps<TabsBarScene>) => {
    const metricScene = getTraceByServiceScene(model);
    const styles = useStyles2(getStyles);
    const exploration = getTraceExplorationScene(model);
    const { actionView } = metricScene.useState();
    const { value: metric } = exploration.getMetricVariable().useState();

    return (
      <Box paddingY={1}>
        <div className={styles.actions}>
          <Stack gap={2}>
            <ShareExplorationAction exploration={exploration} />
          </Stack>
        </div>

        <TabsBar>
          {actionViewsDefinitions.map((tab, index) => {
            return (
              <Tab
                key={index}
                label={tab.displayName(metric as MetricFunction)}
                active={actionView === tab.value}
                onChangeTab={() => metricScene.setActionView(tab.value)}
              />
            );
          })}
        </TabsBar>
      </Box>
    );
  };
}

function breakdownDisplayName(_: MetricFunction) {
  return 'Breakdown';
}

function structureDisplayName(metric: MetricFunction) {
  switch (metric) {
    case 'rate':
      return 'Service Structure';
    case 'errors':
      return 'Root Cause Errors';
    case 'duration':
      return 'Root Cause Latency';
  }
}

function tracesDisplayName(metric: MetricFunction) {
  return `${metric === 'errors' ? 'Errored' : metric === 'duration' ? 'Slow' : ''} Traces`.trim();
}

function getStyles(theme: GrafanaTheme2) {
  return {
    actions: css({
      [theme.breakpoints.up(theme.breakpoints.values.md)]: {
        position: 'absolute',
        right: 0,
        zIndex: 2,
      },
    }),
  };
}
