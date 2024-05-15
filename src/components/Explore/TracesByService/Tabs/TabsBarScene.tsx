import { css } from "@emotion/css";
import { SceneObjectState, SceneObjectBase, SceneComponentProps, sceneGraph, SceneObject } from "@grafana/scenes";
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2, Box, Stack, TabsBar, Tab } from "@grafana/ui";
import React from "react";
import { getExplorationFor } from "utils/utils";
import { ShareExplorationButton } from "../ShareExplorationButton";
import { TracesByServiceScene } from "../TracesByServiceScene";
import { buildAttributesBreakdownScene } from "./AttributesBreakdownScene";
import { buildSpansScene } from "./Spans/SpansScene";
import { buildStructureScene } from "./Structure/StructureScene";

interface ActionViewDefinition {
  displayName: string;
  value: ActionViewType;
  getScene: () => SceneObject;
}

export type ActionViewType = 'spans' | 'breakdown' | 'structure';
export const actionViewsDefinitions: ActionViewDefinition[] = [
  { displayName: 'Breakdown', value: 'breakdown', getScene: buildAttributesBreakdownScene },
  { displayName: 'Structure', value: 'structure', getScene: buildStructureScene },
  { displayName: 'Spans', value: 'spans', getScene: buildSpansScene },
];

export interface TabsBarSceneState extends SceneObjectState {}

export class TabsBarScene extends SceneObjectBase<TabsBarSceneState> {
  public static Component = ({ model }: SceneComponentProps<TabsBarScene>) => {
    const metricScene = sceneGraph.getAncestor(model, TracesByServiceScene);
    const styles = useStyles2(getStyles);
    const exploration = getExplorationFor(model);
    const { actionView } = metricScene.useState();

    return (
      <Box paddingY={1}>
        <div className={styles.actions}>
          <Stack gap={2}>
            <ShareExplorationButton exploration={exploration} />
          </Stack>
        </div>

        <TabsBar>
          {actionViewsDefinitions.map((tab, index) => {
            return (
              <Tab
                key={index}
                label={tab.displayName}
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
