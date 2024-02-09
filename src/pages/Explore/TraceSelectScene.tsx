import { css } from '@emotion/css';
import React from 'react';

import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  PanelBuilders,
  SceneCSSGridLayout,
  SceneCSSGridItem,
  SceneQueryRunner,
  SceneDataNode,
  SceneVariableSet,
  sceneGraph,
  VariableDependencyConfig,
  CustomVariable,
  VariableValue,
} from '@grafana/scenes';
import { useStyles2, Tab, TabsBar, Select } from '@grafana/ui';

import { SelectServiceNameAction } from './SelectServiceName';
import { explorationDS } from './shared';
import { getColorByIndex } from './utils';
import { ByFrameRepeater } from './TracesTabs/ByFrameRepeater';

export interface TraceSelectSceneState extends SceneObjectState {
  body: SceneCSSGridLayout;
  showHeading?: boolean;
  searchQuery?: string;
  showPreviews?: boolean;

  groupBy: string;
  metricFn: string;
}

const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

const VAR_GROUPBY = 'groupBy';
const VAR_GROUPBY_EXPR = '${groupBy}';
const VAR_METRIC_FN = 'fn';
const VAR_METRIC_FN_EXPR = '${fn}';

export class TraceSelectScene extends SceneObjectBase<TraceSelectSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_GROUPBY, VAR_METRIC_FN],
  });

  constructor(state: Partial<TraceSelectSceneState>) {
    super({
      body: state.body ?? new SceneCSSGridLayout({ children: [] }),
      $variables: state.$variables ?? getVariableSet(),
      showPreviews: true,
      groupBy: state.groupBy ?? 'resource.service.name',
      metricFn: state.metricFn ?? 'rate()',
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this.setState({
      body: this.buildBody(),
    });
  }

  private buildBody() {
    return new SceneCSSGridLayout({
      children: [
        new ByFrameRepeater({
          $data: new SceneQueryRunner({
            datasource: explorationDS,
            queries: [buildQuery()],
          }),
          body: new SceneCSSGridLayout({
            templateColumns: GRID_TEMPLATE_COLUMNS,
            autoRows: '200px',
            children: [],
          }),
          getLayoutChild: (data, frame, frameIndex) => {
            return new SceneCSSGridItem({
              body: PanelBuilders.timeseries()
                .setTitle(getLabelValue(frame))
                .setData(new SceneDataNode({ data: { ...data, series: [frame] } }))
                .setColor({ mode: 'fixed', fixedColor: getColorByIndex(frameIndex) })
                .setOption('legend', { showLegend: false })
                .setCustomFieldConfig('fillOpacity', 9)
                .setHeaderActions(new SelectServiceNameAction({ value: getLabelValue(frame) }))
                .build(),
            });
          },
        }),
      ],
    });
  }

  public getGroupByVariable() {
    const variable = sceneGraph.lookupVariable(VAR_GROUPBY, this);
    if (!(variable instanceof CustomVariable)) {
      throw new Error('Group by variable not found');
    }

    return variable;
  }

  public getMetricFnVariable() {
    const variable = sceneGraph.lookupVariable(VAR_METRIC_FN, this);
    if (!(variable instanceof CustomVariable)) {
      throw new Error('Metric function variable not found');
    }

    return variable;
  }

  public onChangeTab = (value: string) => {
    const groupByVariable = this.getGroupByVariable();
    groupByVariable.changeValueTo(value);
  };

  public onChangeMetricsFn = (value?: VariableValue) => {
    if (!value) {
      return;
    }
    const metricFnVariable = this.getMetricFnVariable();
    metricFnVariable.changeValueTo(value);
  };

  public static Component = ({ model }: SceneComponentProps<TraceSelectScene>) => {
    const styles = useStyles2(getStyles);
    const groupByVariable = model.getGroupByVariable();
    const { value: groupByValue } = groupByVariable.useState();
    const metricFnVariable = model.getMetricFnVariable();
    const { value: metricFnValue } = metricFnVariable.useState();

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Select
            options={metricFnOptions}
            value={metricFnValue}
            onChange={(value) => model.onChangeMetricsFn(value.value)}
            width={30}
            placeholder={'Select function'}
          />
        </div>
        <TabsBar>
          {groupByOptions.map(({ label, value }, index) => {
            return (
              <Tab
                key={index}
                label={label}
                active={value === groupByValue}
                onChangeTab={() => model.onChangeTab(value.toString())}
              />
            );
          })}
        </TabsBar>
        <model.state.body.Component model={model.state.body} />
      </div>
    );
  };
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

  return labels[keys[0]];
}

const groupByOptions = [
  { label: 'Service Name', value: 'resource.service.name' },
  { label: 'HTTP URL', value: 'span.http.url' },
  { label: 'HTTP Host', value: 'span.http.host' },
];

const metricFnOptions = [
  { label: 'Span Rate', value: 'rate()' },
  { label: 'Span Count', value: 'count_over_time()' },
];

function getVariableSet() {
  return new SceneVariableSet({
    variables: [
      new CustomVariable({
        name: VAR_GROUPBY,
        value: 'resource.service.name',
      }),
      new CustomVariable({
        name: VAR_METRIC_FN,
        value: 'rate()',
      }),
    ],
  });
}

function buildQuery() {
  return {
    refId: 'A',
    query: `{} | ${VAR_METRIC_FN_EXPR} by (${VAR_GROUPBY_EXPR})`,
    queryType: 'traceql',
    filters: [],
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      position: 'relative',
    }),
    headingWrapper: css({
      marginTop: theme.spacing(1),
    }),
    header: css({
      position: 'absolute',
      right: 0,
      top: '4px',
      zIndex: 2,
    }),
  };
}
