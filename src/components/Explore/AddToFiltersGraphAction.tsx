import React from 'react';

import { DataFrame } from '@grafana/data';
import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  sceneGraph,
  AdHocFiltersVariable,
} from '@grafana/scenes';
import { Button } from '@grafana/ui';
import { getLabelValue } from '../../utils/utils';
import { VAR_FILTERS } from 'utils/shared';

export interface AddToFiltersGraphActionState extends SceneObjectState {
  frame: DataFrame;
  labelKey?: string;
}

export class AddToFiltersGraphAction extends SceneObjectBase<AddToFiltersGraphActionState> {
  public onClick = () => {
    const variable = sceneGraph.lookupVariable(VAR_FILTERS, this);
    if (!(variable instanceof AdHocFiltersVariable)) {
      throw new Error(`${VAR_FILTERS} variable not found`);
    }

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

    // ensure we set the new filter with latest value
    // and remove any existing filter for the same key
    const filtersWithoutNew = variable.state.filters.filter(
      (f) => f.key !== labelName
    );

    variable.setState({
      filters: [
        ...filtersWithoutNew,
        {
          key: labelName,
          operator: '=',
          value: getLabelValue(this.state.frame, this.state.labelKey),
        },
      ],
    });
  };

  public static Component = ({ model }: SceneComponentProps<AddToFiltersGraphAction>) => {
    return (
      <Button variant="primary" size="sm" fill="text" onClick={model.onClick} icon={'search-plus'}>
        Add to filters
      </Button>
    );
  };
}
