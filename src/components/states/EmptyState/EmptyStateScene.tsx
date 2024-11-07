import { SceneObjectState, SceneObjectBase, SceneComponentProps } from '@grafana/scenes';
import React from 'react';
import { EmptyState } from './EmptyState';

interface EmptyStateSceneState extends SceneObjectState {
  message?: string;
  remedyMessage?: string;
  imgWidth?: number;
  padding?: string;
}

export class EmptyStateScene extends SceneObjectBase<EmptyStateSceneState> {
  public static Component = ({ model }: SceneComponentProps<EmptyStateScene>) => {
    const { message, remedyMessage, imgWidth, padding } = model.useState();
    return <EmptyState message={message} remedyMessage={remedyMessage} imgWidth={imgWidth} padding={padding} />;
  };
}
