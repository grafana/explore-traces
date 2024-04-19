import { css } from '@emotion/css';
import React from 'react';

import { DataFrame, GrafanaTheme2, MetricFindValue, reduceField, ReducerID } from '@grafana/data';
import {
  CustomVariable,
  PanelBuilders,
  SceneComponentProps,
  SceneCSSGridItem,
  SceneCSSGridLayout,
  SceneDataNode,
  SceneDataTransformer,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
  SceneVariableSet,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { DrawStyle, Select, StackingMode, Tab, TabsBar, useStyles2 } from '@grafana/ui';

import { SelectAttributeWithValueAction } from './SelectAttributeWithValueAction';
import { explorationDS, VAR_DATASOURCE_EXPR, VAR_FILTERS, VAR_FILTERS_EXPR } from '../../utils/shared';
import { getExplorationFor, getLabelValue } from '../../utils/utils';
import { ByFrameRepeater } from '../../components/Explore/ByFrameRepeater';
import { map, Observable } from 'rxjs';
import { getDataSourceSrv } from '@grafana/runtime';
import { primarySignalOptions } from './primary-signals';

export interface TraceSelectSceneState extends SceneObjectState {
  body: SceneCSSGridLayout;
  showHeading?: boolean;
  searchQuery?: string;
  showPreviews?: boolean;

  attributes?: string[];
}

export const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

export const VAR_GROUPBY = 'groupBy';
const VAR_GROUPBY_EXPR = '${groupBy}';
const defaultGroupBy = 'resource.service.name';

export class SelectStartingPointScene extends SceneObjectBase<TraceSelectSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_GROUPBY, VAR_FILTERS],
  });

  constructor(state: Partial<TraceSelectSceneState>) {
    super({
      body: state.body ?? new SceneCSSGridLayout({ children: [] }),
      $variables: state.$variables ?? getVariableSet(),
      showPreviews: true,
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this.updateAttributes();

    this.setState({
      body: this.buildBody(),
    });
  }

  private async updateAttributes() {
    const ds = await getDataSourceSrv().get(VAR_DATASOURCE_EXPR, { __sceneObject: { value: this } });

    if (!ds) {
      return;
    }

    ds.getTagKeys?.().then((tagKeys: MetricFindValue[]) => {
      const attributes = tagKeys.filter((l) => l.text.startsWith('resource.')).map((l) => l.text);
      if (attributes !== this.state.attributes) {
        this.setState({ attributes });
      }
    });
  }

  private buildBody() {
    const variable = this.getGroupByVariable();
    return new SceneCSSGridLayout({
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
          body: new SceneCSSGridLayout({
            templateColumns: GRID_TEMPLATE_COLUMNS,
            autoRows: '200px',
            children: [],
          }),
          groupBy: true,
          getLayoutChild: (data, frame, frameIndex) => {
            return new SceneCSSGridItem({
              body: PanelBuilders.timeseries()
                .setTitle(getLabelValue(frame, variable.state.query))
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
                .setHeaderActions(
                  new SelectAttributeWithValueAction({ value: getLabelValue(frame, variable.state.query) })
                )
                .setDisplayMode('transparent')
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

  public onChangeGroupBy = (value?: string) => {
    if (!value) {
      return;
    }
    const groupByVariable = this.getGroupByVariable();
    groupByVariable.setState({ query: value });
    groupByVariable.changeValueTo(value);
  };

  public static Component = ({ model }: SceneComponentProps<SelectStartingPointScene>) => {
    const styles = useStyles2(getStyles);
    const exploration = getExplorationFor(model);
    const { primarySignal } = exploration.useState();
    const { attributes } = model.useState();
    const groupByVariable = model.getGroupByVariable();
    const { value: groupByValue } = groupByVariable.useState();

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>Group by</div>
          <Select
            options={getAttributesAsOptions(attributes || [])}
            value={groupByValue}
            onChange={(value) => model.onChangeGroupBy(value.value?.toString())}
            width={'auto'}
            placeholder={'Select an attribute'}
            className={styles.select}
          />
        </div>
        <TabsBar>
          {primarySignalOptions.map((option, index) => {
            return (
              <Tab
                key={index}
                label={option.label || ''}
                active={option.value === primarySignal}
                onChangeTab={() => option.value && exploration.onChangePrimarySignal(option.value)}
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

function getAttributesAsOptions(attributes: string[]) {
  return attributes.map((attribute) => ({ label: attribute.replace('resource.', ''), value: attribute }));
}

function getVariableSet() {
  return new SceneVariableSet({
    variables: [
      new CustomVariable({
        name: VAR_GROUPBY,
        query: defaultGroupBy,
      }),
    ],
  });
}

function buildQuery() {
  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR}} | rate() by (${VAR_GROUPBY_EXPR}, status)`,
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
      display: 'flex',
      gap: theme.spacing(1),
      alignItems: 'center',
    }),
    bodyWrapper: css({
      flexGrow: 1,
      display: 'flex',

      '& > div': {
        overflow: 'scroll',
      },
    }),
    select: css({
      minWidth: 240,
    }),
  };
}
