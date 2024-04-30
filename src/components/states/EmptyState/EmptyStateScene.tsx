import { SceneObjectState, SceneObjectBase, SceneComponentProps } from '@grafana/scenes';
import React from 'react';
import { EmptyState } from './EmptyState';

interface EmptyStateSceneState extends SceneObjectState {
  message: string;
  imgWidth?: number;
}

export class EmptyStateScene extends SceneObjectBase<EmptyStateSceneState> {
  public static Component = ({ model }: SceneComponentProps<EmptyStateScene>) => {
    const { message, imgWidth } = model.useState();
    return <EmptyState message={message} imgWidth={imgWidth} />;
  };
}
