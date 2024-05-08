import { css } from '@emotion/css';
import React from 'react';

import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import {
  CustomVariable,
  SceneComponentProps,
  SceneFlexItem,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneVariableSet,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { Button, Field, useStyles2 } from '@grafana/ui';

import { BreakdownLabelSelector } from '../../BreakdownLabelSelector';
import { VAR_GROUPBY, VAR_FILTERS, ignoredAttributes } from '../../../../utils/shared';

import { LayoutSwitcher } from '../../LayoutSwitcher';
import { TracesByServiceScene } from '../TracesByServiceScene';
import { AddToFiltersGraphAction } from '../../AddToFiltersGraphAction';
import { VARIABLE_ALL_VALUE } from '../../../../constants';
import { buildAllLayout } from '../../layouts/allAttributes';
import { buildNormalLayout } from '../../layouts/attributeBreakdown';
import { debounce } from 'lodash';
import { TraceExploration } from 'pages/Explore';
import { AllLayoutRunners, getAllLayoutRunners, filterAllLayoutRunners, isGroupByAll } from 'pages/Explore/SelectStartingPointScene';
import { Search } from 'pages/Explore/Search';

export interface AttributesBreakdownSceneState extends SceneObjectState {
  body?: SceneObject;
  allLayoutRunners?: any;
  searchQuery?: string;
}

export class AttributesBreakdownScene extends SceneObjectBase<AttributesBreakdownSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_FILTERS],
    onReferencedVariableValueChanged: this.onReferencedVariableValueChanged.bind(this),
  });

  constructor(state: Partial<AttributesBreakdownSceneState>) {
    super({
      $variables:
        state.$variables ??
        new SceneVariableSet({
          variables: [new CustomVariable({ name: VAR_GROUPBY, defaultToAll: true, includeAll: true })],
        }),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    const variable = this.getVariable();

    variable.subscribeToState(() => {
      this.updateBody(variable);
    });

    this.subscribeToState((newState, prevState) => {
      if (newState.searchQuery !== prevState.searchQuery) {
        this.onSearchQueryChangeDebounced(newState.searchQuery ?? '');
      }
    });

    sceneGraph.getAncestor(this, TracesByServiceScene).subscribeToState(() => {
      this.updateBody(variable);
    });

    this.updateBody(variable);
  }

  private onSearchQueryChange = (evt: React.SyntheticEvent<HTMLInputElement>) => {
    this.setState({ searchQuery: evt.currentTarget.value });
  };

  private onSearchQueryChangeDebounced = debounce((searchQuery: string) => {
    const filtered = filterAllLayoutRunners(this.state.allLayoutRunners ?? [], searchQuery);
    this.setBody(filtered, this.getVariable());
  }, 250);

  private getVariable(): CustomVariable {
    const variable = sceneGraph.lookupVariable(VAR_GROUPBY, this)!;
    if (!(variable instanceof CustomVariable)) {
      throw new Error('Group by variable not found');
    }

    return variable;
  }

  private onReferencedVariableValueChanged() {
    const variable = this.getVariable();
    variable.changeValueTo(VARIABLE_ALL_VALUE);
    this.updateBody(variable);
  }

  private getAttributes() {
    const allAttributes = sceneGraph.getAncestor(this, TracesByServiceScene).state.attributes;
    return allAttributes?.filter((attr) => !ignoredAttributes.includes(attr));
  }

  private async updateBody(variable: CustomVariable) {
    const allLayoutRunners = getAllLayoutRunners(sceneGraph.getAncestor(this, TraceExploration), this.getAttributes() ?? []);
    this.setState({ allLayoutRunners });
    this.setBody(allLayoutRunners, variable);
  }

  private setBody = (runners: AllLayoutRunners[], variable: CustomVariable) => {
    this.setState({
      body:
        variable.hasAllValue() || variable.getValue() === VARIABLE_ALL_VALUE
          ? buildAllLayout((attribute) => new SelectAttributeAction({ attribute }), runners)
          : buildNormalLayout(
              this, 
              variable, 
              (frame: DataFrame) => [
                new AddToFiltersGraphAction({ frame, variableName: VAR_FILTERS, labelKey: variable.getValueText() }),
              ],
            ),
    });
  }

  public onChange = (value?: string) => {
    if (!value) {
      return;
    }

    const variable = this.getVariable();

    variable.changeValueTo(value);

    // reset searchQuery
    this.setState({ searchQuery: '' });
  };

  public static Component = ({ model }: SceneComponentProps<AttributesBreakdownScene>) => {
    const { body, searchQuery } = model.useState();
    const variable = model.getVariable();
    const { attributes } = sceneGraph.getAncestor(model, TracesByServiceScene).useState();
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        <div className={styles.controls}>
          {attributes?.length && (
            <div className={styles.controlsLeft}>
              <Field label="By attribute">
                <BreakdownLabelSelector
                  options={getAttributesAsOptions(attributes)}
                  value={variable.getValueText()}
                  onChange={model.onChange}
                />
              </Field>
            </div>
          )}
          {body instanceof LayoutSwitcher && (
            <div className={styles.controlsRight}>
              <body.Selector model={body} />
            </div>
          )}
        </div>
        {isGroupByAll(variable) && (
          <Search searchQuery={searchQuery ?? ''} onSearchQueryChange={model.onSearchQueryChange} />
        )}
        <div className={styles.content}>{body && <body.Component model={body} />}</div>
      </div>
    );
  };
}

function getAttributesAsOptions(attributes: string[]) {
  return attributes.map((attribute) => ({ label: attribute, value: attribute }));
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      flexGrow: 1,
      display: 'flex',
      minHeight: '100%',
      flexDirection: 'column',
    }),
    content: css({
      flexGrow: 1,
      display: 'flex',
      paddingTop: theme.spacing(0),
    }),
    controls: css({
      flexGrow: 0,
      display: 'flex',
      alignItems: 'top',
      gap: theme.spacing(2),
    }),
    controlsRight: css({
      flexGrow: 0,
      display: 'flex',
      justifyContent: 'flex-end',
    }),
    controlsLeft: css({
      display: 'flex',
      justifyContent: 'flex-left',
      justifyItems: 'left',
      width: '100%',
      flexDirection: 'column',
    }),
  };
}

interface SelectAttributeActionState extends SceneObjectState {
  attribute: string;
}
export class SelectAttributeAction extends SceneObjectBase<SelectAttributeActionState> {
  public onClick = () => {
    const attributesBreakdownScene = sceneGraph.getAncestor(this, AttributesBreakdownScene);
    attributesBreakdownScene.onChange(this.state.attribute);
  };

  public static Component = ({ model }: SceneComponentProps<AddToFiltersGraphAction>) => {
    return (
      <Button variant="secondary" size="sm" fill="solid" onClick={model.onClick}>
        Select
      </Button>
    );
  };
}

export function buildAttributesBreakdownScene() {
  return new SceneFlexItem({
    body: new AttributesBreakdownScene({}),
  });
}
