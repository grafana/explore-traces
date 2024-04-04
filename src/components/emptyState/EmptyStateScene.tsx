import { SceneObjectState, SceneObjectBase, SceneComponentProps } from "@grafana/scenes";
import React from "react";
import { EmptyState } from "./EmptyState";

interface EmptyStateSceneState extends SceneObjectState {
  message: string;
}

export class EmptyStateScene extends SceneObjectBase<EmptyStateSceneState> {
  public static Component = ({ model }: SceneComponentProps<EmptyStateScene>) => {
    const { message } = model.useState();
    return (
      <EmptyState message={message} />
    );
  };
}
