import React from 'react';

import {
  PanelBuilders,
  SceneComponentProps,
  SceneDataNode,
  SceneDataTransformer,
  SceneObjectBase,
  SceneObjectState,
  VizPanel,
} from '@grafana/scenes';
import { DataFrame, GrafanaTheme2, PanelData, ThresholdsMode } from '@grafana/data';
import { css } from '@emotion/css';
import { DrawStyle, StackingMode, useStyles2 } from '@grafana/ui';
import { SelectAttributeWithValueAction } from '../../pages/Explore/SelectAttributeWithValueAction';
import { TableCellDisplayMode } from '@grafana/schema';

interface HomepageCardState extends SceneObjectState {
  panelData: PanelData;
  frame: DataFrame;
  aggregatePanel?: VizPanel;
  spansPanel?: VizPanel;
}

export class HomepageCard extends SceneObjectBase<HomepageCardState> {
  public constructor(state: HomepageCardState) {
    super({
      aggregatePanel: buildAggregatePanel(state.panelData, state.frame),
      spansPanel: buildSpansPanel(state.panelData, state.frame),
      ...state,
    });

    this.addActivationHandler(() => {});
  }

  public static Component = ({ model }: SceneComponentProps<HomepageCard>) => {
    const { aggregatePanel, spansPanel } = model.useState();
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        {aggregatePanel && <aggregatePanel.Component model={aggregatePanel} />}
        {spansPanel && <spansPanel.Component model={spansPanel} />}
      </div>
    );
  };
}

function buildAggregatePanel(data: PanelData, frame: DataFrame) {
  return PanelBuilders.timeseries()
    .setTitle(getLabelValue(frame))
    .setData(
      new SceneDataNode({
        data: {
          ...data,
          series: [
            {
              ...frame,
              fields: frame.fields
                .sort((a, b) => a.labels?.status?.localeCompare(b.labels?.status || '') || 0)
                .reverse(),
            },
          ],
        },
      })
    )
    .setOption('legend', { showLegend: false })
    .setCustomFieldConfig('drawStyle', DrawStyle.Bars)
    .setCustomFieldConfig('stacking', { mode: StackingMode.Normal })
    .setCustomFieldConfig('fillOpacity', 100)
    .setCustomFieldConfig('lineWidth', 0)
    .setCustomFieldConfig('pointSize', 0)
    .setOverrides((overrides) => {
      overrides.matchFieldsWithNameByRegex('.*status="error".*').overrideColor({
        mode: 'fixed',
        fixedColor: 'semi-dark-red',
      });
      overrides.matchFieldsWithNameByRegex('.*status="unset".*').overrideColor({
        mode: 'fixed',
        fixedColor: 'green',
      });
      overrides.matchFieldsWithNameByRegex('.*status="ok".*').overrideColor({
        mode: 'fixed',
        fixedColor: 'dark-green',
      });
    })
    .setHeaderActions(new SelectAttributeWithValueAction({ value: getLabelValue(frame) }))
    .setDisplayMode('transparent')
    .build();
}

function buildSpansPanel(data: PanelData, frame: DataFrame) {
  return PanelBuilders.table()
    .setTitle('Top Spans')
    .setData(
      new SceneDataTransformer({
        $data: new SceneDataNode({
          data: {
            ...data,
            series: [frame],
          },
        }),
        transformations: [
          {
            id: 'joinByLabels',
            options: {
              join: ['name'],
              value: 'status',
            },
          },
          {
            id: 'groupBy',
            options: {
              fields: {
                '"error"': {
                  aggregations: ['sum'],
                  operation: 'aggregate',
                },
                '"unset"': {
                  aggregations: ['sum'],
                  operation: 'aggregate',
                },
                name: {
                  aggregations: [],
                  operation: 'groupby',
                },
              },
            },
          },
          {
            id: 'sortBy',
            options: {
              fields: {},
              sort: [
                {
                  desc: true,
                  field: '"error" (sum)',
                },
              ],
            },
          },
          {
            id: 'limit',
            options: { limitField: 3 },
          },
        ],
      })
    )
    .setOption('sortBy', [
      { desc: true, displayName: '"error" (sum)' },
      { desc: true, displayName: '"ok" (sum)' },
      { desc: true, displayName: '"unset" (sum)' },
    ])
    .setColor({ mode: 'fixed', fixedColor: 'text' })
    .setCustomFieldConfig('cellOptions', { type: TableCellDisplayMode.ColorText })
    .setOverrides((b) =>
      b
        .matchFieldsWithName('"error" (sum)')
        .overrideDisplayName('Errors')
        .overrideColor({ mode: 'thresholds' })
        .overrideThresholds({
          mode: ThresholdsMode.Absolute,
          steps: [
            { color: 'green', value: 0 },
            { color: 'red', value: 1 },
          ],
        })
    )
    .setOverrides((b) => b.matchFieldsWithName('"unset" (sum)').overrideDisplayName('Unset'))
    .setOverrides((b) => b.matchFieldsWithName('"ok" (sum)').overrideDisplayName('Ok'))
    .setHeaderActions(new SelectAttributeWithValueAction({ value: getLabelValue(frame) }))
    .setDisplayMode('transparent')
    .build();
}

function getLabelValue(frame: DataFrame) {
  const labels = frame.fields[1]?.labels;

  if (!labels) {
    return 'No labels';
  }

  const keys = Object.keys(labels);
  if (keys.length === 0) {
    return 'No labels';
  }

  return labels[keys[0]].replace(/"/g, '');
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      gap: theme.spacing.x1,
      height: '100%',
      background: theme.colors.background.primary,
      border: theme.colors.border.weak,
    }),
  };
}
