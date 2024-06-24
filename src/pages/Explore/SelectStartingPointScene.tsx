import { css } from '@emotion/css';
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
import { Button, useStyles2 } from '@grafana/ui';

import {
  VAR_DATASOURCE_EXPR,
  VAR_FILTERS,
  VAR_GROUPBY,
  explorationDS,
  MetricFunction,
  VAR_METRIC,
  StartingPointSelectedEvent,
} from '../../utils/shared';
import { getLabelValue } from '../../utils/utils';
import { getDataSourceSrv } from '@grafana/runtime';
import { VARIABLE_ALL_VALUE } from '../../constants';
import { buildNormalLayout } from '../../components/Explore/layouts/attributeBreakdown';
import { buildAllLayout } from '../../components/Explore/layouts/allAttributes';
import { LayoutSwitcher } from '../../components/Explore/LayoutSwitcher';
import { AddToFiltersGraphAction } from '../../components/Explore/AddToFiltersGraphAction';
import { InvestigateAttributeWithValueAction } from './InvestigateAttributeWithValueAction';
import { MetricFunctionCard } from './MetricFunctionCard';
import { TraceExploration } from './TraceExploration';
import { rateByWithStatus } from 'components/Explore/queries/rateByWithStatus';
import { Search } from './Search';
import { GroupBySelector } from 'components/Explore/GroupBySelector';

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
    variableNames: [VAR_GROUPBY, VAR_FILTERS, VAR_METRIC],
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

    const traceExploration = sceneGraph.getAncestor(this, TraceExploration);
    const metricVariable = traceExploration.getMetricVariable();
    metricVariable?.subscribeToState((newState, prevState) => {
      if (newState.value !== prevState.value) {
        this.buildBody();
      }
    });

    groupByVariable.subscribeToState((newState, prevState) => {
      if (newState.value !== prevState.value) {
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
    const allLayoutRunners = getAllLayoutRunners(
      sceneGraph.getAncestor(this, TraceExploration),
      this.state.attributes ?? []
    );
    this.setState({ allLayoutRunners });
    this.setBody(allLayoutRunners);
  }

  private setBody = (runners: AllLayoutRunners[]) => {
    const variable = this.getGroupByVariable();
    this.setState({
      body:
        variable.hasAllValue() || variable.getValue() === VARIABLE_ALL_VALUE
          ? buildAllLayout(this, (attribute) => new SelectAttributeAction({ attribute }), runners)
          : buildNormalLayout(this, variable, (frame: DataFrame) => [
              new AddToFiltersGraphAction({ frame, variableName: VAR_FILTERS, labelKey: variable.getValueText() }),
              new InvestigateAttributeWithValueAction({ value: getLabelValue(frame, variable.getValueText()) }),
            ]),
    });
  };

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

  public onSelectStartingPoint() {
    this.publishEvent(new StartingPointSelectedEvent(), true);
  }

  public static Component = ({ model }: SceneComponentProps<SelectStartingPointScene>) => {
    const styles = useStyles2(getStyles);
    const { attributes, body, metricCards, searchQuery } = model.useState();
    const groupByVariable = model.getGroupByVariable();
    const { value: groupByValue } = groupByVariable.useState();
    const mainAttributes = ['resource.cluster', 'resource.environment', 'resource.namespace', 'resource.service.name'];

    return (
      <div className={styles.container}>
        <div className={styles.primarySignalHeading}>1. Select a metric</div>
        <div className={styles.primarySignal}>
          {metricCards.map((card, index) => (
            <card.Component key={index} model={card} />
          ))}
        </div>
        <div className={styles.stack}>
          <div>2. Add filters to find relevant data or</div>
          <button onClick={() => model.onSelectStartingPoint()} className={styles.inlineButton}>
            analyze the current selection
          </button>
        </div>
        <div className={styles.groupBy}>
          <GroupBySelector
            options={getAttributesAsOptions(attributes || [])}
            mainAttributes={mainAttributes}
            value={groupByValue.toString()}
            onChange={(value) => model.onChangeGroupBy(value)}
          />
        </div>
        {isGroupByAll(groupByVariable) && (
          <Search searchQuery={searchQuery ?? ''} onSearchQueryChange={model.onSearchQueryChange} />
        )}
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
  const variable = traceExploration.getMetricVariable();
  for (const attribute of attributes) {
    runners.push({
      attribute: attribute,
      runner: new SceneQueryRunner({
        maxDataPoints: 250,
        datasource: explorationDS,
        queries: [rateByWithStatus(variable.getValue() as MetricFunction, attribute)],
      }),
    });
  }
  return runners;
}

export function filterAllLayoutRunners(runners: AllLayoutRunners[], searchQuery: string) {
  return (
    runners.filter((runner: AllLayoutRunners) => {
      return runner.attribute.toLowerCase().includes(searchQuery);
    }) ?? []
  );
}

export function isGroupByAll(variable: CustomVariable) {
  return variable.hasAllValue() || variable.getValue() === VARIABLE_ALL_VALUE;
}

function getAttributesAsOptions(attributes: string[]) {
  return [...attributes.map((attribute) => ({ label: attribute, value: attribute }))];
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
      '&:hover': {
        border: `2px solid ${theme.colors.secondary.borderTransparent}`,
      },
    }),
    primarySignalItemSelected: css({
      border: `2px solid ${theme.colors.primary.border}`,
      '&:hover': {
        border: `2px solid ${theme.colors.primary.border}`,
      },
    }),
    groupBy: css({
      margin: `${theme.spacing(2)} 0 0 0`,
    }),
    bodyWrapper: css({
      flexGrow: 1,
      display: 'flex',

      '& > div': {
        overflow: 'scroll',
      },
    }),
    inlineButton: css({
      border: 'none',
      background: 'none',
      color: theme.colors.primary.main,
      cursor: 'pointer',
      padding: 0,
    }),
    stack: css({
      display: 'flex',
      flexDirection: 'row',
      gap: theme.spacing(0.5),
      marginTop: theme.spacing(2),
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
