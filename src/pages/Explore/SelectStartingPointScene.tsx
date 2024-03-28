import { css } from '@emotion/css';
import React from 'react';

import { DataFrame, GrafanaTheme2, reduceField, ReducerID } from '@grafana/data';
import {
  CustomVariable,
  SceneComponentProps,
  SceneCSSGridItem,
  SceneCSSGridLayout,
  SceneDataTransformer,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
  SceneVariableSet,
  VariableDependencyConfig,
  VariableValue,
} from '@grafana/scenes';
import { Select, Tab, TabsBar, useStyles2 } from '@grafana/ui';

import { explorationDS, VAR_FILTERS_EXPR } from '../../utils/shared';
import { ByFrameRepeater } from '../../components/Explore/ByFrameRepeater';
import { map, Observable } from 'rxjs';
import { HomepageCard } from '../../components/Explore/HomepageCard';

export interface TraceSelectSceneState extends SceneObjectState {
  body: SceneCSSGridLayout;
  showHeading?: boolean;
  searchQuery?: string;
  showPreviews?: boolean;

  groupBy: string;
  metricFn: string;
}

const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, 100%)';

export const VAR_GROUPBY = 'groupBy';
const VAR_GROUPBY_EXPR = '${groupBy}';
const VAR_METRIC_FN = 'fn';
const VAR_METRIC_FN_EXPR = '${fn}';

export class SelectStartingPointScene extends SceneObjectBase<TraceSelectSceneState> {
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
    const variable = this.getGroupByVariable();
    return new SceneCSSGridLayout({
      isLazy: true,
      children: [
        new ByFrameRepeater({
          $data: new SceneDataTransformer({
            $data: new SceneQueryRunner({
              datasource: explorationDS,
              queries: [buildQuery()],
            }),
            transformations: [
              () => (source: Observable<DataFrame[]>) => {
                return source.pipe(
                  map((data: DataFrame[]) => {
                    data.forEach((a) => reduceField({ field: a.fields[1], reducers: [ReducerID.max] }));
                    return data.sort((a, b) => {
                      return (b.fields[1].state?.calcs?.max || 0) - (a.fields[1].state?.calcs?.max || 0);
                    });
                  })
                );
              },
            ],
          }),
          groupBy: variable.getValue().toString(),
          body: new SceneCSSGridLayout({
            templateColumns: GRID_TEMPLATE_COLUMNS,
            autoRows: '200px',
            children: [],
          }),
          getLayoutChild: (data, frame) => {
            return new SceneCSSGridItem({
              body: new HomepageCard({
                panelData: data,
                frame,
              }),
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

  public static Component = ({ model }: SceneComponentProps<SelectStartingPointScene>) => {
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
            width={20}
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
        <div className={styles.bodyWrapper}>
          <model.state.body.Component model={model.state.body} />
        </div>
      </div>
    );
  };
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
    query: `{${VAR_FILTERS_EXPR}} | ${VAR_METRIC_FN_EXPR} by (${VAR_GROUPBY_EXPR}, name, status)`,
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
    bodyWrapper: css({
      flexGrow: 1,
      display: 'flex',

      '& > div': {
        overflow: 'scroll',
      },
    }),
  };
}
