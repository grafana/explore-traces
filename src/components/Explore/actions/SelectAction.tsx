import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
} from '@grafana/scenes';
import { Button } from '@grafana/ui';

interface SelectAttributeActionState extends SceneObjectState {
  attribute?: string;
  onClick: () => void;
}

export class SelectAttributeAction extends SceneObjectBase<SelectAttributeActionState> {
  public static Component = ({ model }: SceneComponentProps<SelectAttributeAction>) => {
    if (!model.state.attribute) {
      return null;
    }

    return (
      <Button variant="secondary" size="sm" fill="solid" onClick={() => model.state.onClick()}>
        Select
      </Button>
    );
  };
}
