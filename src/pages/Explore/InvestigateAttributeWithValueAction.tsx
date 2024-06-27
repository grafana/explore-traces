import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
} from '@grafana/scenes';
import { Button } from '@grafana/ui';

import { StartingPointSelectedEvent } from '../../utils/shared';
import { getFiltersVariable, getGroupByVariable } from 'utils/utils';

export interface InvestigateAttributeWithValueActionState extends SceneObjectState {
  value: string;
}

export class InvestigateAttributeWithValueAction extends SceneObjectBase<InvestigateAttributeWithValueActionState> {
  public onClick = () => {
    const variable = getFiltersVariable(this);

    if (!this.state.value) {
      return;
    }

    const groupByVariable = getGroupByVariable(this)

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
