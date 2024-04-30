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

export interface AddToFiltersGraphActionState extends SceneObjectState {
  frame: DataFrame;
  variableName: string;
  labelKey?: string;
}

export class AddToFiltersGraphAction extends SceneObjectBase<AddToFiltersGraphActionState> {
  public onClick = () => {
    const variable = sceneGraph.lookupVariable(this.state.variableName, this);
    if (!(variable instanceof AdHocFiltersVariable)) {
      throw new Error(`${this.state.variableName} variable not found`);
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

    variable.setState({
      filters: [
        ...variable.state.filters,
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
