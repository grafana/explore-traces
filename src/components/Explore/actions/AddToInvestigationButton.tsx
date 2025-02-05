import { TimeRange } from '@grafana/data';
import { usePluginLinks } from '@grafana/runtime';
import { SceneComponentProps, sceneGraph, SceneObject, SceneObjectBase, SceneObjectState, SceneQueryRunner } from '@grafana/scenes';
import { DataQuery, DataSourceRef } from '@grafana/schema';
import { IconButton } from '@grafana/ui';

import Logo from '../../../../src/img/logo.svg';
import React from 'react';
import { VAR_DATASOURCE_EXPR } from 'utils/shared';

export const explorationsPluginId = 'grafana-explorations-app';
export const extensionPointId = 'grafana-exploretraces-app/exploration/v1';

export interface AddToInvestigationButtonState extends SceneObjectState {
  dsUid?: string;
  labelKey: string;
  labelValue: string | number;
  context?: ExtensionContext;
  queries: DataQuery[];
}

interface ExtensionContext {
  timeRange: TimeRange;
  queries: DataQuery[];
  datasource: DataSourceRef;
  origin: string;
  url: string;
  type: string;
  title: string;
  id: string;
  logoPath: string;
}

export class AddToInvestigationButton extends SceneObjectBase<AddToInvestigationButtonState> {
  constructor(state: Omit<AddToInvestigationButtonState, 'queries'>) {
    super({ ...state, queries: [] });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate = () => {
    this._subs.add(
      this.subscribeToState(() => {
        this.getQueries();
        this.getContext();
      })
    );

    const datasourceUid = sceneGraph.interpolate(this, VAR_DATASOURCE_EXPR);
    this.setState({ dsUid: datasourceUid });
  };

  private readonly getQueries = () => {
    const data = sceneGraph.getData(this);
    const queryRunner = sceneGraph.findObject(data, isQueryRunner);

    if (isQueryRunner(queryRunner)) {
      const queries = queryRunner.state.queries.map((q) => ({
        ...q,
        query: `{nestedSetParent<0 && ${this.state.labelKey}=${this.state.labelValue} && ${this.state.labelKey} != nil} | rate() by(${this.state.labelKey})`
      }));

      if (JSON.stringify(queries) !== JSON.stringify(this.state.queries)) {
        this.setState({ queries });
      }
    }
  };

  private readonly getContext = () => {
    const { queries, dsUid, labelValue } = this.state;
    const timeRange = sceneGraph.getTimeRange(this);

    if (!timeRange || !queries || !dsUid) {
      return;
    }
    const ctx = {
      origin: 'Explore Traces',
      type: 'traces',
      queries,
      timeRange: { ...timeRange.state.value },
      datasource: { uid: dsUid },
      url: window.location.href,
      id: `${JSON.stringify(queries)}`,
      title: `${labelValue}`.replace(/"/g, ''),
      logoPath: Logo,
    };
    if (JSON.stringify(ctx) !== JSON.stringify(this.state.context)) {
      this.setState({ context: ctx });
    }
  };

  public static Component = ({ model }: SceneComponentProps<AddToInvestigationButton>) => {
    const { context } = model.useState();
    const { links } = usePluginLinks({ extensionPointId, context, limitPerPlugin: 1 });
    const link = links.find((link) => link.pluginId === explorationsPluginId);

    if (!link) {
      return null;
    }

    return (
      <IconButton
        tooltip={link.description}
        key={link.id}
        name={link.icon ?? 'panel-add'}
        onClick={(e) => {
          if (link.onClick) {
            link.onClick(e);
          }
        }}
      />
    );
  };
}

function isQueryRunner(o: SceneObject<SceneObjectState> | null): o is SceneQueryRunner {
  return o instanceof SceneQueryRunner;
}
