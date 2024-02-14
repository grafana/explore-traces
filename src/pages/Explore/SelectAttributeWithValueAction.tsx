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

export interface SelectAttributeWithValueActionState extends SceneObjectState {
  value: string;
}

export class SelectAttributeWithValueAction extends SceneObjectBase<SelectAttributeWithValueActionState> {
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

    variable.setState({
      filters: [
        ...variable.state.filters,
        {
          key: groupByVariable.getValue().toString(),
          operator: '=',
          value: this.state.value,
        },
      ],
    });
    this.publishEvent(new StartingPointSelectedEvent(), true);
  };

  public static Component = ({ model }: SceneComponentProps<SelectAttributeWithValueAction>) => {
    return (
      <Button variant="primary" size="sm" fill="text" onClick={model.onClick}>
        Select
      </Button>
    );
  };
}
