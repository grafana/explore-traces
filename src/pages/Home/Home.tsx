import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import {
  DataSourceVariable,
  SceneComponentProps,
  SceneCSSGridItem,
  SceneCSSGridLayout,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
} from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import {
  DATASOURCE_LS_KEY,
  VAR_DATASOURCE,
} from '../../utils/shared';
import { AttributePanel } from 'components/Home/AttributePanel';
import { HomeHeaderScene } from 'components/Home/HomeHeaderScene';
import { DurationAttributePanel } from 'components/Home/DurationAttributePanel';

export interface HomeState extends SceneObjectState {
  controls: SceneObject[];
  initialDS?: string;
  body: SceneCSSGridLayout;
}

export class Home extends SceneObjectBase<HomeState> {
  public constructor(state: Partial<HomeState>) {
    super({
      $timeRange: state.$timeRange ?? new SceneTimeRange({}),
      $variables: state.$variables ?? getVariableSet(state.initialDS),
      controls: state.controls ?? [new SceneTimePicker({}), new SceneRefreshPicker({})],
      body: buildSplitLayout(),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    const datasourceVar = sceneGraph.lookupVariable(VAR_DATASOURCE, this) as DataSourceVariable;
    datasourceVar.subscribeToState((newState) => {
      if (newState.value) {
        localStorage.setItem(DATASOURCE_LS_KEY, newState.value.toString());
      }
    });
  }

  static Component = ({ model }: SceneComponentProps<Home>) => {
    const { body } = model.useState();
    const styles = useStyles2(getStyles);

    return (
      <>
        <HomeHeaderScene.Component model={model} />
        <div className={styles.container}> {body && <body.Component model={body} />} </div>
      </>
    );
  };
}

function buildSplitLayout() {
  return new SceneCSSGridLayout({
    children: [
      new SceneCSSGridLayout({
        autoRows: 'min-content',
        columnGap: 2,
        rowGap: 2,
        children: [
          new SceneCSSGridItem({
            body: new AttributePanel({ query: '{nestedSetParent<0 && status=error}', title: 'Errored traces', type: 'errors' }),
          }),
          new SceneCSSGridItem({
            body: new DurationAttributePanel({}),
          }),
        ],
      }),
    ],
  })
}

function getVariableSet(initialDS?: string) {
  return new SceneVariableSet({
    variables: [
      new DataSourceVariable({
        name: VAR_DATASOURCE,
        label: 'Data source',
        value: initialDS,
        pluginId: 'tempo',
      }),
    ],
  });
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      padding: theme.spacing(2),
    }),
  };
}
