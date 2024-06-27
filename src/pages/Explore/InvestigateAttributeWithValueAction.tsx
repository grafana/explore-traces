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

import { StartingPointSelectedEvent, VAR_GROUPBY } from '../../utils/shared';

export interface InvestigateAttributeWithValueActionState extends SceneObjectState {
  value: string;
}

export class InvestigateAttributeWithValueAction extends SceneObjectBase<InvestigateAttributeWithValueActionState> {
  public onClick = () => {
    const variable = sceneGraph.lookupVariable('filters', this);
    if (!(variable instanceof AdHocFiltersVariable)) {
      throw new Error('Filters variable not found');
    }

    if (!this.state.value) {
      return;
    }

    const groupByVariable = sceneGraph.lookupVariable(VAR_GROUPBY, this);
    if (!(groupByVariable instanceof CustomVariable)) {
      throw new Error('Group by variable not found');
    }

    // ensure we set the new filter with latest value
    // and remove any existing filter for the same key
    const filtersWithoutNew = variable.state.filters.filter(
      (f) => f.key !== groupByVariable.getValue().toString()
    );

    variable.setState({
      filters: [
        ...filtersWithoutNew,
        {
          key: groupByVariable.getValue().toString(),
          operator: '=',
          value: this.state.value,
        },
      ],
    });
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
