import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
} from '@grafana/scenes';
import { Button } from '@grafana/ui';

interface InspectAttributeActionState extends SceneObjectState {
  attribute?: string;
  onClick: () => void;
}

export class InspectAttributeAction extends SceneObjectBase<InspectAttributeActionState> {
  public static Component = ({ model }: SceneComponentProps<InspectAttributeAction>) => {
    if (!model.state.attribute) {
      return null;
    }

    return (
      <Button variant="secondary" size="sm" fill="solid" onClick={() => model.state.onClick()}>
        Inspect
      </Button>
    );
  };
}
