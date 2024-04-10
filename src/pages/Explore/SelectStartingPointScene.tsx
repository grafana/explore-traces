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
import { Select, Tab, TabsBar, useStyles2 } from '@grafana/ui';

import { SelectAttributeWithValueAction } from './SelectAttributeWithValueAction';
import { explorationDS, VAR_DATASOURCE_EXPR, VAR_FILTERS_EXPR } from '../../utils/shared';
import { getColorByIndex } from '../../utils/utils';
import { ByFrameRepeater } from '../../components/Explore/ByFrameRepeater';
import { map, Observable } from 'rxjs';
import { getDataSourceSrv } from '@grafana/runtime';

export interface TraceSelectSceneState extends SceneObjectState {
  body: SceneCSSGridLayout;
  showHeading?: boolean;
  searchQuery?: string;
  showPreviews?: boolean;

  attributes?: string[];

  groupBy: string;
}

export const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

export const VAR_GROUPBY = 'groupBy';
const VAR_GROUPBY_EXPR = '${groupBy}';
const VAR_PRIMARY_SIGNAL = 'primarySignal';
const VAR_PRIMARY_SIGNAL_EXPR = '${primarySignal}';

export class SelectStartingPointScene extends SceneObjectBase<TraceSelectSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_GROUPBY, VAR_PRIMARY_SIGNAL],
  });

  constructor(state: Partial<TraceSelectSceneState>) {
    super({
      body: state.body ?? new SceneCSSGridLayout({ children: [] }),
      $variables: state.$variables ?? getVariableSet(),
      showPreviews: true,
      groupBy: state.groupBy ?? 'resource.service.name',
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
      const attributes = tagKeys.map((l) => l.text);
      if (attributes !== this.state.attributes) {
        this.setState({ attributes });
      }
    });
  }

  private buildBody() {
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
          getLayoutChild: (data, frame, frameIndex) => {
            return new SceneCSSGridItem({
              body: PanelBuilders.timeseries()
                .setTitle(getLabelValue(frame))
                .setData(new SceneDataNode({ data: { ...data, series: [frame] } }))
                .setColor({ mode: 'fixed', fixedColor: getColorByIndex(frameIndex) })
                .setOption('legend', { showLegend: false })
                .setCustomFieldConfig('fillOpacity', 9)
                .setHeaderActions(new SelectAttributeWithValueAction({ value: getLabelValue(frame) }))
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

  public getPrimarySignalVariable() {
    const variable = sceneGraph.lookupVariable(VAR_PRIMARY_SIGNAL, this);
    if (!(variable instanceof CustomVariable)) {
      throw new Error('Primary signal variable not found');
    }

    return variable;
  }

  public onChangeGroupBy = (value?: string) => {
    if (!value) {
      return;
    }
    const groupByVariable = this.getGroupByVariable();
    groupByVariable.changeValueTo(value);
  };

  public onChangePrimarySignal = (value?: string) => {
    if (!value) {
      return;
    }
    const variable = this.getPrimarySignalVariable();
    variable.changeValueTo(value);
  };

  public static Component = ({ model }: SceneComponentProps<SelectStartingPointScene>) => {
    const styles = useStyles2(getStyles);
    const { attributes } = model.useState();
    const groupByVariable = model.getGroupByVariable();
    const { value: groupByValue } = groupByVariable.useState();
    const primarySignalVariable = model.getPrimarySignalVariable();
    const { value: primarySignal } = primarySignalVariable.useState();

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
          {primarySignalOptions.map(({ label, value }, index) => {
            return (
              <Tab
                key={index}
                label={label}
                active={value === primarySignal}
                onChangeTab={() => model.onChangePrimarySignal(value.toString())}
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
  return attributes.map((attribute) => ({ label: attribute, value: attribute }));
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

const primarySignalOptions = [
  { label: 'Trace roots', value: 'nestedSetParent = -1' },
  { label: 'Server spans', value: 'kind = server' },
  { label: 'Consumer spans', value: 'kind = consumer' },
  { label: 'HTTP paths', value: 'span.http.path != ""' },
  { label: 'Databases', value: 'span.db.name != ""' },
];

function getVariableSet() {
  return new SceneVariableSet({
    variables: [
      new CustomVariable({
        name: VAR_GROUPBY,
        value: 'resource.service.name',
      }),
      new CustomVariable({
        name: VAR_PRIMARY_SIGNAL,
        value: 'nestedSetParent = -1',
      }),
    ],
  });
}

function buildQuery() {
  return {
    refId: 'A',
    query: `{${VAR_PRIMARY_SIGNAL_EXPR} ${VAR_FILTERS_EXPR}} | rate() by (${VAR_GROUPBY_EXPR}, status)`,
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
