import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  sceneGraph,
  AdHocFiltersVariable,
  CustomVariable,
} from '@grafana/scenes';
import { Button } from '@grafana/ui';

import { StartingPointSelectedEvent } from '../../utils/shared';
import { VAR_GROUPBY } from './SelectStartingPointScene';

export interface InvestigateAttributeWithValueActionState extends SceneObjectState {
  value: string;
}

export class InvestigateAttributeWithValueAction extends SceneObjectBase<InvestigateAttributeWithValueActionState> {
  public onClick = () => {
    const variable = sceneGraph.lookupVariable('filters', this);
    if (!(variable instanceof AdHocFiltersVariable)) {
      return;
    }

    if (!this.state.value) {
      return;
    }

    const groupByVariable = sceneGraph.lookupVariable(VAR_GROUPBY, this);
    if (!(groupByVariable instanceof CustomVariable)) {
      return;
    }

    let newFilters = variable.state.filters;
    newFilters.push({
      key: groupByVariable.getValue().toString(),
      operator: '=',
      value: this.state.value,
    });

    variable.setState({ filters: newFilters });
    this.publishEvent(new StartingPointSelectedEvent(), true);
  };

  public static Component = ({ model }: SceneComponentProps<InvestigateAttributeWithValueAction>) => {
    return (
      <Button variant="secondary" size="sm" fill="solid" onClick={model.onClick}>
        Select
      </Button>
    );
  };
}
