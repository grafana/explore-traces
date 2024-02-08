import React from 'react';

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
  value: string;
}

export class SelectServiceNameAction extends SceneObjectBase<SelectServiceNameActionState> {
  public onClick = () => {
    const variable = sceneGraph.lookupVariable('filters', this);
    if (!(variable instanceof AdHocFiltersVariable)) {
      return;
    }

    if (!this.state.value) {
      return;
    }

    variable.state.set.setState({
      filters: [
        ...variable.state.set.state.filters,
        {
          key: 'resource.service.name',
          operator: '=',
          value: this.state.value,
          condition: '',
        },
        {
          key: 'span.http.method',
          operator: '=',
          value: 'GET',
          condition: '',
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
