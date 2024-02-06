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

import { ServiceNameSelectedEvent } from './shared';

export interface SelectServiceNameActionState extends SceneObjectState {
  frame: DataFrame;
}

export class SelectServiceNameAction extends SceneObjectBase<SelectServiceNameActionState> {
  public onClick = () => {
    const variable = sceneGraph.lookupVariable('filters', this);
    if (!(variable instanceof AdHocFiltersVariable)) {
      return;
    }

    const name = this.state.frame.fields[1]?.name;
    if (!name || name.length === 0) {
      return;
    }

    variable.state.set.setState({
      filters: [
        ...variable.state.set.state.filters,
        {
          key: 'resource.service.name',
          operator: '=',
          value: name,
        },
      ],
    });
    this.publishEvent(new ServiceNameSelectedEvent(), true);
  };

  public static Component = ({ model }: SceneComponentProps<SelectServiceNameAction>) => {
    return (
      <Button variant="primary" size="sm" fill="text" onClick={model.onClick}>
        Select
      </Button>
    );
  };
}
