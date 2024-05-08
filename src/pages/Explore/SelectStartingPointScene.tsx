import { css, cx } from '@emotion/css';
import React from 'react';
import { debounce } from 'lodash';

import { DataFrame, GrafanaTheme2, MetricFindValue } from '@grafana/data';
import {
  CustomVariable,
  SceneComponentProps,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
  SceneVariableSet,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { Button, Field, Icon, Input, Select, useStyles2 } from '@grafana/ui';

import { VAR_DATASOURCE_EXPR, VAR_FILTERS, VAR_GROUPBY, explorationDS } from '../../utils/shared';
import { getExplorationFor, getLabelValue } from '../../utils/utils';
import { getDataSourceSrv } from '@grafana/runtime';
import { primarySignalOptions } from './primary-signals';
import { VARIABLE_ALL_VALUE } from '../../constants';
import { buildNormalLayout } from '../../components/Explore/layouts/attributeBreakdown';
import { buildAllLayout } from '../../components/Explore/layouts/allAttributes';
import { LayoutSwitcher } from '../../components/Explore/LayoutSwitcher';
import { AddToFiltersGraphAction } from '../../components/Explore/AddToFiltersGraphAction';
import { InvestigateAttributeWithValueAction } from './InvestigateAttributeWithValueAction';
import { MetricFunctionCard } from './MetricFunctionCard';
import { TraceExploration } from './TraceExploration';
import { rateByWithStatus } from 'components/Explore/queries/rateByWithStatus';

export type AllLayoutRunners = {
  attribute: string;
  runner: SceneQueryRunner;
};

export interface TraceSelectSceneState extends SceneObjectState {
  body?: LayoutSwitcher;
  allLayoutRunners?: AllLayoutRunners[];
  showHeading?: boolean;
  searchQuery?: string;
  showPreviews?: boolean;

  attributes?: string[];
  metricCards: MetricFunctionCard[];
}

export const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

export class SelectStartingPointScene extends SceneObjectBase<TraceSelectSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_GROUPBY, VAR_FILTERS],
  });

  constructor(state: Partial<TraceSelectSceneState>) {
    super({
      $variables: state.$variables ?? getVariableSet(),
      showPreviews: true,
      metricCards: [
        new MetricFunctionCard({ metric: 'rate' }),
        new MetricFunctionCard({ metric: 'errors' }),
        new MetricFunctionCard({ metric: 'duration' }),
      ],
      allLayoutRunners: [],
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this.updateAttributes();

    const groupByVariable = this.getGroupByVariable();

    this.subscribeToState((newState, prevState) => {
      if (newState.attributes !== prevState.attributes) {
        this.buildBody();
      }
    });

    groupByVariable.subscribeToState((newState, prevState) => {
      if (newState.value !== prevState.value) {
        this.buildBody();
      }
    });

    const exploration = sceneGraph.getAncestor(this, TraceExploration);
    exploration.subscribeToState((newState, prevState) => {
      if (newState.metric !== prevState.metric) {
        this.buildBody();
      }
    });

    this.subscribeToState((newState, prevState) => {
      if (newState.searchQuery !== prevState.searchQuery) {
        this.onSearchQueryChangeDebounced(newState.searchQuery ?? '');
      }
    });
  }

  private onSearchQueryChange = (evt: React.SyntheticEvent<HTMLInputElement>) => {
    this.setState({ searchQuery: evt.currentTarget.value });
  };

  private onSearchQueryChangeDebounced = debounce((searchQuery: string) => {
    const filtered = filterAllLayoutRunners(this.state.allLayoutRunners ?? [], searchQuery);
    this.setBody(filtered);
  }, 250);

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
    const allLayoutRunners = getAllLayoutRunners(sceneGraph.getAncestor(this, TraceExploration), this.state.attributes ?? []);
    this.setState({ allLayoutRunners });
    this.setBody(allLayoutRunners);
  }

  private setBody = (runners: AllLayoutRunners[]) => {
    const variable = this.getGroupByVariable();
    this.setState({
      body:
        variable.hasAllValue() || variable.getValue() === VARIABLE_ALL_VALUE
          ? buildAllLayout((attribute) => new SelectAttributeAction({ attribute }), runners)
          : buildNormalLayout(
              this, 
              variable, 
              (frame: DataFrame) => [
                new AddToFiltersGraphAction({ frame, variableName: VAR_FILTERS, labelKey: variable.getValueText() }),
                new InvestigateAttributeWithValueAction({ value: getLabelValue(frame, variable.getValueText()) }),
              ], 
              this.state.searchQuery ?? ''
            ),
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
    groupByVariable.changeValueTo(value);

    // reset searchQuery
    this.setState({ searchQuery: '' });
  };

  public static Component = ({ model }: SceneComponentProps<SelectStartingPointScene>) => {
    const styles = useStyles2(getStyles);
    const exploration = getExplorationFor(model);
    const { primarySignal } = exploration.useState();
    const { attributes, body, metricCards, searchQuery } = model.useState();
    const groupByVariable = model.getGroupByVariable();
    const { value: groupByValue } = groupByVariable.useState();

    return (
      <div className={styles.container}>
        <div className={styles.primarySignalHeading}>Choose your exploration type</div>
        <div className={styles.primarySignal}>
          {primarySignalOptions.map((option) => {
            const itemStyles =
              option.value === primarySignal
                ? [styles.primarySignalItem, styles.primarySignalItemSelected]
                : [styles.primarySignalItem];
            return (
              <div
                key={option.value}
                className={cx(itemStyles)}
                onClick={() => option.value && exploration.onChangePrimarySignal(option.value)}
              >
                <h6>{option.label}</h6>
                <span>{option.text}</span>
              </div>
            );
          })}
        </div>
        <div className={styles.primarySignalHeading}>Select a metric</div>
        <div className={styles.primarySignal}>
          {metricCards.map((card, index) => (
            <card.Component key={index} model={card} />
          ))}
        </div>
        <div className={styles.groupBy}>
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
        <Field className={styles.searchField}>
          <Input
            placeholder='Search'
            prefix={<Icon name={'search'} />}
            value={searchQuery}
            onChange={model.onSearchQueryChange}
            id='searchFieldInput'
          />
        </Field>
        {body && (
          <div className={styles.bodyWrapper}>
            <body.Component model={body} />
          </div>
        )}
      </div>
    );
  };
}

export function getAllLayoutRunners(traceExploration: TraceExploration, attributes: string[]) {
  const runners = [];
  for (const attribute of attributes) {
    runners.push({
      attribute: attribute,
      runner: new SceneQueryRunner({
        maxDataPoints: 250,
        datasource: explorationDS,
        queries: [rateByWithStatus(traceExploration.state.metric, attribute)],
      })
    });
  }
  return runners;
}

export function filterAllLayoutRunners(runners: AllLayoutRunners[], searchQuery: string) {
  return runners.filter((runner: AllLayoutRunners) => {
    return runner.attribute.toLowerCase().includes(searchQuery);
  }) ?? [];
}

function getAttributesAsOptions(attributes: string[]) {
  return [
    { label: 'All', value: VARIABLE_ALL_VALUE },
    ...attributes.map((attribute) => ({ label: attribute.replace('resource.', ''), value: attribute })),
  ];
}

function getVariableSet() {
  return new SceneVariableSet({
    variables: [
      new CustomVariable({
        name: VAR_GROUPBY,
        defaultToAll: true,
        includeAll: true,
        value: VARIABLE_ALL_VALUE,
      }),
    ],
  });
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      position: 'relative',
    }),
    primarySignalHeading: css({
      margin: `${theme.spacing(1)} 0`,
    }),
    primarySignal: css({
      display: 'flex',
      gap: theme.spacing(1),
    }),
    primarySignalItem: css({
      display: 'flex',
      flexDirection: 'column',
      padding: theme.spacing(1),
      backgroundColor: theme.colors.secondary.main,
      borderRadius: '8px',
      border: `2px solid ${theme.colors.secondary.border}`,
      cursor: 'pointer',
      fontSize: '12px',
      flex: 1,
    }),
    primarySignalItemSelected: css({
      border: `2px solid #cc8c17`,
    }),
    groupBy: css({
      right: 0,
      top: '4px',
      zIndex: 2,
      display: 'flex',
      gap: theme.spacing(1),
      alignItems: 'center',
      margin: `${theme.spacing(2)} 0 ${theme.spacing(1)} 0`,
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
    searchField: css({
      marginBottom: theme.spacing(1),
    }),
  };
}

interface SelectAttributeActionState extends SceneObjectState {
  attribute: string;
}
export class SelectAttributeAction extends SceneObjectBase<SelectAttributeActionState> {
  public onClick = () => {
    const startingPointScene = sceneGraph.getAncestor(this, SelectStartingPointScene);
    startingPointScene.onChangeGroupBy(this.state.attribute);
  };

  public static Component = ({ model }: SceneComponentProps<AddToFiltersGraphAction>) => {
    return (
      <Button variant="secondary" size="sm" fill="solid" onClick={model.onClick}>
        Select
      </Button>
    );
  };
}
