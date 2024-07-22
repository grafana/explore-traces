import { css } from '@emotion/css';
import React from 'react';

import { DataFrame, GrafanaTheme2, MetricFindValue } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState, VariableDependencyConfig } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import {
  VAR_DATASOURCE_EXPR,
  VAR_FILTERS,
  VAR_GROUPBY,
  VAR_METRIC,
  StartingPointSelectedEvent,
  radioAttributesResource,
  RESOURCE_ATTR,
  VAR_DATASOURCE,
} from '../../utils/shared';
import {
  getLabelValue,
  getGroupByVariable,
  getTraceExplorationScene,
  getAttributesAsOptions,
  getFiltersVariable,
  getDatasourceVariable,
} from '../../utils/utils';
import { getDataSourceSrv } from '@grafana/runtime';
import { buildNormalLayout } from '../../components/Explore/layouts/attributeBreakdown';
import { LayoutSwitcher } from '../../components/Explore/LayoutSwitcher';
import { AnalyzeTracesAction } from '../../components/Explore/actions/AnalyzeTracesAction';
import { MetricFunctionCard } from './MetricFunctionCard';
import { GroupBySelector } from 'components/Explore/GroupBySelector';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../utils/analytics';

export interface TraceSelectSceneState extends SceneObjectState {
  body?: LayoutSwitcher;
  showHeading?: boolean;
  showPreviews?: boolean;

  attributes?: string[];
  metricCards: MetricFunctionCard[];
}

export const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

export class SelectStartingPointScene extends SceneObjectBase<TraceSelectSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_GROUPBY, VAR_FILTERS, VAR_METRIC, VAR_DATASOURCE],
  });

  constructor(state: Partial<TraceSelectSceneState>) {
    super({
      showPreviews: true,
      metricCards: [
        new MetricFunctionCard({ metric: 'rate' }),
        new MetricFunctionCard({ metric: 'errors' }),
        new MetricFunctionCard({ metric: 'duration' }),
      ],
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this.updateAttributes();

    const groupByVariable = getGroupByVariable(this);

    this.subscribeToState((newState, prevState) => {
      if (newState.attributes !== prevState.attributes) {
        this.setBody();
      }
    });

    const traceExploration = getTraceExplorationScene(this);
    const metricVariable = traceExploration.getMetricVariable();
    metricVariable?.subscribeToState((newState, prevState) => {
      if (newState.value !== prevState.value) {
        this.setBody();
      }
    });

    groupByVariable.subscribeToState((newState, prevState) => {
      if (newState.value !== prevState.value) {
        this.setBody();
      }
    });

    getDatasourceVariable(this).subscribeToState(() => {
      this.updateAttributes();
    });
  }

  private async updateAttributes() {
    const ds = await getDataSourceSrv().get(VAR_DATASOURCE_EXPR, { __sceneObject: { value: this } });

    if (!ds) {
      return;
    }

    ds.getTagKeys?.().then((tagKeys: MetricFindValue[]) => {
      const attributes = tagKeys.filter((l) => l.text.startsWith(RESOURCE_ATTR)).map((l) => l.text);
      if (attributes !== this.state.attributes) {
        this.setState({ attributes });
      }
    });
  }

  private setBody = () => {
    const variable = getGroupByVariable(this);
    this.setState({
      body: buildNormalLayout(this, variable, (frame: DataFrame) => [
        new AnalyzeTracesAction({
          attribute: getLabelValue(frame, variable.getValueText()),
        }),
      ]),
    });
  };

  public onChange = (value: string) => {
    const variable = getGroupByVariable(this);
    variable.changeValueTo(value);

    reportAppInteraction(USER_EVENTS_PAGES.starting_page, USER_EVENTS_ACTIONS.starting_page.group_by_changed, {
      groupBy: value,
    });
  };

  public onSelectStartingPoint() {
    const filtersVariable = getFiltersVariable(this);
    reportAppInteraction(USER_EVENTS_PAGES.starting_page, USER_EVENTS_ACTIONS.starting_page.analyze_current, {
      filtersLength: filtersVariable.state.filters.length,
    });
    this.publishEvent(new StartingPointSelectedEvent(), true);
  }

  public static Component = ({ model }: SceneComponentProps<SelectStartingPointScene>) => {
    const styles = useStyles2(getStyles);
    const { attributes, body, metricCards } = model.useState();
    const groupByVariable = getGroupByVariable(model);
    const { value: groupByValue } = groupByVariable.useState();

    return (
      <div className={styles.container}>
        <div className={styles.primarySignalHeading}>1. Select a metric</div>
        <div className={styles.primarySignal}>
          {metricCards.map((card, index) => (
            <card.Component key={index} model={card} />
          ))}
        </div>
        <div className={styles.stack}>
          <div>2. Select a starting point to analyze traces or</div>
          <button onClick={() => model.onSelectStartingPoint()} className={styles.inlineButton}>
            analyze the current selection
          </button>
        </div>
        <div className={styles.groupBy}>
          <GroupBySelector
            options={getAttributesAsOptions(attributes || [])}
            radioAttributes={radioAttributesResource}
            value={groupByValue.toString()}
            onChange={(value) => model.onChange(value)}
          />
        </div>
        {body && (
          <div className={styles.bodyWrapper}>
            <body.Component model={body} />
          </div>
        )}
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      position: 'relative',
    }),
    primarySignalHeading: css({
      margin: `${theme.spacing(1)} 0`,
    }),
    primarySignal: css({
      display: 'flex',
      gap: theme.spacing(1),
    }),
    primarySignalItem: css({
      display: 'flex',
      flexDirection: 'column',
      padding: theme.spacing(1),
      backgroundColor: theme.colors.secondary.main,
      borderRadius: '8px',
      border: `2px solid ${theme.colors.secondary.border}`,
      cursor: 'pointer',
      fontSize: '12px',
      flex: 1,
      '&:hover': {
        border: `2px solid ${theme.colors.secondary.borderTransparent}`,
      },
    }),
    primarySignalItemSelected: css({
      border: `2px solid ${theme.colors.primary.border}`,
      '&:hover': {
        border: `2px solid ${theme.colors.primary.border}`,
      },
    }),
    groupBy: css({
      margin: `${theme.spacing(2)} 0 0 0`,
    }),
    bodyWrapper: css({
      flexGrow: 1,
      display: 'flex',

      '& > div': {
        overflow: 'scroll',
      },
    }),
    inlineButton: css({
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      padding: 0,
      textDecoration: 'underline',
    }),
    stack: css({
      display: 'flex',
      flexDirection: 'row',
      gap: theme.spacing(0.5),
      marginTop: theme.spacing(2),
    }),
  };
}
