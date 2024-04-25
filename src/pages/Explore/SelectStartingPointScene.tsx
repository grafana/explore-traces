import { css } from '@emotion/css';
import React from 'react';

import { DataFrame, GrafanaTheme2, MetricFindValue } from '@grafana/data';
import {
  CustomVariable,
  SceneComponentProps,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneVariableSet,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { Button, Select, Tab, TabsBar, useStyles2 } from '@grafana/ui';

import { VAR_DATASOURCE_EXPR, VAR_FILTERS } from '../../utils/shared';
import { getExplorationFor, getLabelValue } from '../../utils/utils';
import { getDataSourceSrv } from '@grafana/runtime';
import { primarySignalOptions } from './primary-signals';
import { VARIABLE_ALL_VALUE } from '../../constants';
import { buildNormalLayout } from '../../components/Explore/layouts/attributeBreakdown';
import { buildAllLayout } from '../../components/Explore/layouts/allAttributes';
import { LayoutSwitcher } from '../../components/Explore/LayoutSwitcher';
import { AddToFiltersGraphAction } from '../../components/Explore/AddToFiltersGraphAction';
import { InvestigateAttributeWithValueAction } from './InvestigateAttributeWithValueAction';

export interface TraceSelectSceneState extends SceneObjectState {
  body?: LayoutSwitcher;
  showHeading?: boolean;
  searchQuery?: string;
  showPreviews?: boolean;

  attributes?: string[];
}

export const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

export const VAR_GROUPBY = 'groupBy';

export class SelectStartingPointScene extends SceneObjectBase<TraceSelectSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_GROUPBY, VAR_FILTERS],
  });

  constructor(state: Partial<TraceSelectSceneState>) {
    super({
      $variables: state.$variables ?? getVariableSet(),
      showPreviews: true,
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
    this.setState({
      body:
        variable.hasAllValue() || variable.getValue() === VARIABLE_ALL_VALUE
          ? buildAllLayout(
              this.state.attributes ?? [],
              (attribute) => new SelectAttributeAction({ attribute: attribute })
            )
          : buildNormalLayout(
              variable,
              (frame: DataFrame) =>
                new InvestigateAttributeWithValueAction({ value: getLabelValue(frame, variable.getValueText()) })
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
  };

  public static Component = ({ model }: SceneComponentProps<SelectStartingPointScene>) => {
    const styles = useStyles2(getStyles);
    const exploration = getExplorationFor(model);
    const { primarySignal } = exploration.useState();
    const { attributes, body } = model.useState();
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
        {body && (
          <div className={styles.bodyWrapper}>
            <body.Component model={body} />
          </div>
        )}
      </div>
    );
  };
}

function getAttributesAsOptions(attributes: string[]) {
  return [
    { label: 'All errors', value: VARIABLE_ALL_VALUE },
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
