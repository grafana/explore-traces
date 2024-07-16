import React from 'react';

import { DataFrame } from '@grafana/data';
import { SceneObjectState, SceneObjectBase, SceneComponentProps, AdHocFiltersVariable } from '@grafana/scenes';
import { Button } from '@grafana/ui';
import { getFiltersVariable, getLabelValue } from '../../../utils/utils';

export interface AddToFiltersActionState extends SceneObjectState {
  frame: DataFrame;
  onClick: (payload: any) => void;
  labelKey?: string;
}

export class AddToFiltersAction extends SceneObjectBase<AddToFiltersActionState> {
  public onClick = () => {
    const variable = getFiltersVariable(this);

    const labels = this.state.frame.fields.find((f) => f.labels)?.labels ?? {};
    if (this.state.labelKey) {
      if (!labels[this.state.labelKey]) {
        return;
      }
    } else {
      if (Object.keys(labels).length !== 1) {
        return;
      }
    }

    const labelName = this.state.labelKey ?? Object.keys(labels)[0];
    const value = getLabelValue(this.state.frame, this.state.labelKey);

    addToFilters(variable, labelName, value);

    this.state.onClick({ labelName });
  };

  public static Component = ({ model }: SceneComponentProps<AddToFiltersAction>) => {
    return (
      <Button variant="primary" size="sm" fill="text" onClick={model.onClick} icon={'search-plus'}>
        Add to filters
      </Button>
    );
  };
}

export const addToFilters = (variable: AdHocFiltersVariable, label: string, value: string) => {
  // ensure we set the new filter with latest value
  // and remove any existing filter for the same key
  const filtersWithoutNew = variable.state.filters.filter((f) => f.key !== label);

  variable.setState({
    filters: [
      ...filtersWithoutNew,
      {
        key: label,
        operator: '=',
        value: value,
      },
    ],
  });
};
