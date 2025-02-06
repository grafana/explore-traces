import { css } from '@emotion/css';
import React from 'react';
// eslint-disable-next-line no-restricted-imports
import { duration } from 'moment';

import { AdHocVariableFilter, GrafanaTheme2 } from '@grafana/data';
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
  SceneTimeRangeLike,
  SceneVariableSet,
} from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import {
  DATASOURCE_LS_KEY,
  RESOURCE_ATTR,
  SPAN_ATTR,
  VAR_DATASOURCE,
} from '../../utils/shared';
import { AttributePanel } from 'components/Home/AttributePanel';
import { HeaderScene } from 'components/Home/HeaderScene';
import { getDatasourceVariable, getHomeFilterVariable, isNumber } from 'utils/utils';
import { HomeFilterVariable } from 'components/Home/HomeFilterVariable';

export interface HomeState extends SceneObjectState {
  controls?: SceneObject[];
  initialDS?: string;
  initialFilters: AdHocVariableFilter[];
  body?: SceneCSSGridLayout;
}

export class Home extends SceneObjectBase<HomeState> {
  public constructor(state: HomeState) {
    super({
      $timeRange: state.$timeRange ?? new SceneTimeRange({}),
      $variables: state.$variables ?? getVariableSet(state.initialFilters, state.initialDS),
      controls: state.controls ?? [new SceneTimePicker({}), new SceneRefreshPicker({})],
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    getDatasourceVariable(this).subscribeToState((newState) => {
      if (newState.value) {
        localStorage.setItem(DATASOURCE_LS_KEY, newState.value.toString());
      }
    });

    getHomeFilterVariable(this).subscribeToState((newState) => {
      if (newState.filters.length > 0) {
        this.buildPanels(sceneTimeRange, newState.filters[0]);
      }
    });

    const filterVariable = getHomeFilterVariable(this);
    const sceneTimeRange = sceneGraph.getTimeRange(this);
    sceneTimeRange.subscribeToState((newState, prevState) => {
      if (newState.value.from !== prevState.value.from || newState.value.to !== prevState.value.to) {
        this.buildPanels(sceneTimeRange, filterVariable.state.filters[0]);
      }
    });
    this.buildPanels(sceneTimeRange, filterVariable.state.filters[0]);
  }

  buildPanels(sceneTimeRange: SceneTimeRangeLike, filter: AdHocVariableFilter) {
    const from = sceneTimeRange.state.value.from.unix();
    const to = sceneTimeRange.state.value.to.unix();
    const dur = duration(to - from, 's');
    const durString = `${dur.asSeconds()}s`;
    const renderedFilter = this.renderFilter(filter);

    this.setState({
      body: new SceneCSSGridLayout({
        children: [
          new SceneCSSGridLayout({
            autoRows: 'min-content',
            columnGap: 2,
            rowGap: 2,
            children: [
              new SceneCSSGridItem({
                body: new AttributePanel({
                  query: {
                    query: `{nestedSetParent < 0 && status = error ${renderedFilter}} | count_over_time() by (${filter.key})`,
                    step: durString
                  },
                  title: 'Errors', 
                  type: 'errors',
                }),
              }),
              new SceneCSSGridItem({
                body: new AttributePanel({ 
                  query: {
                    query: `{nestedSetParent<0 ${renderedFilter}} | histogram_over_time(duration)`,
                  },
                  title: 'Slow traces', 
                  type: 'duration',
                  filter: renderedFilter,
                }),
              }),
            ],
          }),
        ],
      }),
    });
  }
  
  renderFilter(filter: AdHocVariableFilter) {
    let val = filter.value;
    if (val === undefined || val === null || val === '') {
      return '';
    }
  
    if (!isNumber.test(val) && (filter.key.includes(RESOURCE_ATTR) || filter.key.includes(SPAN_ATTR))) {
      if (typeof val === 'string' && !val.startsWith('"') && !val.endsWith('"')) {
        val = `"${val}"`;
      }
    }
  
    return `&& ${filter.key}${filter.operator}${val}`;
  }

  static Component = ({ model }: SceneComponentProps<Home>) => {
    const { body } = model.useState();
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        <HeaderScene.Component model={model} />
        {body && <body.Component model={body} />}
      </div>
    );
  };
}

function getVariableSet(initialFilters: AdHocVariableFilter[], initialDS?: string) {
  return new SceneVariableSet({
    variables: [
      new DataSourceVariable({
        name: VAR_DATASOURCE,
        label: 'Data source',
        value: initialDS,
        pluginId: 'tempo',
      }),
      new HomeFilterVariable({
        initialFilters,
      }),
    ],
  });
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      margin: `${theme.spacing(4)} auto`,
      width: '75%',

      '@media (max-width: 900px)': {
        width: '95%',
      },
    }),
  };
}
