import { css } from '@emotion/css';
import React, { useState } from 'react';

import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import {
  CustomVariable,
  SceneComponentProps,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneVariableSet,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { Button, Field, RadioButtonGroup, useStyles2 } from '@grafana/ui';

import { GroupBySelector } from '../../../GroupBySelector';
import { VAR_GROUPBY, VAR_FILTERS, ignoredAttributes, VAR_METRIC, radioAttributesResource, radioAttributesSpan, getAttributesAsOptions } from '../../../../../utils/shared';

import { LayoutSwitcher } from '../../../LayoutSwitcher';
import { TracesByServiceScene } from '../../TracesByServiceScene';
import { AddToFiltersGraphAction } from '../../../AddToFiltersGraphAction';
import { ALL, RESOURCE, RESOURCE_ATTR, SPAN, SPAN_ATTR } from '../../../../../constants';
import { buildAllLayout } from '../../../layouts/allAttributes';
import { buildNormalLayout } from '../../../layouts/attributeBreakdown';
import { debounce } from 'lodash';
import { TraceExploration } from 'pages/Explore';
import {
  AllLayoutRunners,
  getAllLayoutRunners,
  filterAllLayoutRunners,
  isGroupByAll,
} from 'pages/Explore/SelectStartingPointScene';
import { Search } from 'pages/Explore/Search';
import { getGroupByVariable } from 'utils/utils';

export interface AttributesBreakdownSceneState extends SceneObjectState {
  body?: SceneObject;
  allLayoutRunners?: any;
  searchQuery?: string;
}

export class AttributesBreakdownScene extends SceneObjectBase<AttributesBreakdownSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_FILTERS, VAR_METRIC],
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
    const variable = getGroupByVariable(this);

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
    this.setBody(filtered, getGroupByVariable(this));
  }, 250);

  private onReferencedVariableValueChanged() {
    const variable = getGroupByVariable(this);
    variable.changeValueTo(ALL);
    this.updateBody(variable);
  }

  private getAttributes() {
    const allAttributes = sceneGraph.getAncestor(this, TracesByServiceScene).state.attributes;
    return allAttributes?.filter((attr) => !ignoredAttributes.includes(attr));
  }

  private async updateBody(variable: CustomVariable) {
    const allLayoutRunners = getAllLayoutRunners(
      sceneGraph.getAncestor(this, TraceExploration),
      this.getAttributes() ?? []
    );
    this.setState({ allLayoutRunners });
    this.setBody(allLayoutRunners, variable);
  }

  private setBody = (runners: AllLayoutRunners[], variable: CustomVariable) => {
    this.setState({
      body:
        variable.hasAllValue() || variable.getValue() === ALL
          ? buildAllLayout(this, (attribute) => new SelectAttributeAction({ attribute }), runners)
          : buildNormalLayout(this, variable, (frame: DataFrame) => [
              new AddToFiltersGraphAction({ frame, variableName: VAR_FILTERS, labelKey: variable.getValueText() }),
            ]),
    });
  };

  public onChange = (value: string) => {
    const variable = getGroupByVariable(this);
    variable.changeValueTo(value);

    // reset searchQuery
    this.setState({ searchQuery: '' });
  };

  public static Component = ({ model }: SceneComponentProps<AttributesBreakdownScene>) => {
    const [scope, setScope] = useState(RESOURCE)
    const { body, searchQuery } = model.useState();
    const variable = getGroupByVariable(model);
    const { attributes } = sceneGraph.getAncestor(model, TracesByServiceScene).useState();
    const styles = useStyles2(getStyles);  
    
    const filterType = scope === RESOURCE ? RESOURCE_ATTR : SPAN_ATTR;
    let filteredAttributes = attributes?.filter((attr) => attr.includes(filterType));
    filteredAttributes = scope === RESOURCE ? filteredAttributes?.concat(radioAttributesResource) : filteredAttributes?.concat(radioAttributesSpan);

    return (
      <div className={styles.container}>
        <div className={styles.controls}>
          {filteredAttributes?.length && (
            <div className={styles.controlsLeft}>
              <div className={styles.scope}>
                <Field label="Scope">
                  <RadioButtonGroup
                    options={getAttributesAsOptions([RESOURCE, SPAN])}
                    value={scope}
                    onChange={setScope}
                  />
                </Field>
              </div>
              
              <div className={styles.groupBy}>
                <GroupBySelector
                  options={getAttributesAsOptions(filteredAttributes!)}
                  radioAttributes={scope === RESOURCE ? radioAttributesResource : radioAttributesSpan}
                  value={variable.getValueText()}
                  onChange={model.onChange}
                />
              </div>
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
    scope: css({
      marginRight: theme.spacing(2),
    }),
    groupBy: css({
      width: '100%',
    }),
    controlsLeft: css({
      display: 'flex',
      justifyContent: 'flex-left',
      justifyItems: 'left',
      width: '100%',
      flexDirection: 'row',
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
