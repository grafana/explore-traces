import {
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { explorationDS, MetricFunction } from '../../utils/shared';
import { barsPanelConfig } from '../../components/Explore/panels/barsPanel';
import { rateByWithStatus } from '../../components/Explore/queries/rateByWithStatus';
import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Card, useStyles2 } from '@grafana/ui';
import { buildQuery, histogramPanelConfig } from 'components/Explore/TracesByService/HistogramPanel';
import { getTraceExplorationScene } from 'utils/utils';
import { StepQueryRunner } from '../../components/Explore/queries/StepQueryRunner';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../utils/analytics';

export interface MetricFunctionCardState extends SceneObjectState {
  metric: MetricFunction;
  body: SceneFlexLayout;
}

export class MetricFunctionCard extends SceneObjectBase<MetricFunctionCardState> {
  constructor(state: Partial<MetricFunctionCardState>) {
    super({
      metric: state.metric ?? 'rate',
      body: state.body ?? new SceneFlexLayout({ children: [] }),
    });
    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this.updateBody();
  }

  private updateBody() {
    this.state.body.setState({
      children: [new SceneFlexItem({ body: this.getPanelFor(this.state.metric), height: '120px' })],
    });
  }

  private getPanelFor(metric: MetricFunction) {
    switch (metric) {
      case 'errors':
        return barsPanelConfig()
          .setData(
            new StepQueryRunner({
              maxDataPoints: 64,
              datasource: explorationDS,
              queries: [rateByWithStatus('errors')],
            })
          )
          .setDisplayMode('transparent')
          .setCustomFieldConfig('axisLabel', 'Errors rate')
          .setHoverHeader(true)
          .setOverrides((overrides) => {
            overrides
              .matchFieldsWithNameByRegex('"rate"')
              .overrideColor({
                mode: 'fixed',
                fixedColor: 'semi-dark-red',
              })
              .overrideDisplayName('Errors rate');
          })
          .build();
      case 'duration':
        return histogramPanelConfig()
          .setData(
            new StepQueryRunner({
              maxDataPoints: 24,
              datasource: explorationDS,
              queries: [buildQuery()],
            })
          )
          .setHoverHeader(true)
          .setDisplayMode('transparent')
          .build();
      default:
        return barsPanelConfig()
          .setDisplayMode('transparent')
          .setData(
            new StepQueryRunner({
              maxDataPoints: 64,
              datasource: explorationDS,
              queries: [rateByWithStatus('rate')],
            })
          )
          .setHoverHeader(true)
          .build();
    }
  }

  private getLabel() {
    switch (this.state.metric) {
      case 'errors':
        return 'Errors';
      case 'duration':
        return 'Duration';
      default:
        return 'Rate';
    }
  }

  private onCardClicked(newMetric: string) {
    const traceExploration = getTraceExplorationScene(this);
    const oldMetric = traceExploration.getMetricVariable().getValueText();
    reportAppInteraction(USER_EVENTS_PAGES.starting_page, USER_EVENTS_ACTIONS.starting_page.metric_card_clicked, {
      newMetric,
      oldMetric,
    });
    traceExploration.onChangeMetricFunction(newMetric);
  }

  public static Component = ({ model }: SceneComponentProps<MetricFunctionCard>) => {
    const { body, metric } = model.useState();
    const traceExploration = getTraceExplorationScene(model);
    const { value: selectedMetric } = traceExploration.getMetricVariable().useState();
    const styles = useStyles2(getStyles);

    return (
      <div key={metric} className={styles.itemContainer} onClick={() => model.onCardClicked(metric)}>
        <Card isSelected={metric === selectedMetric} className={styles.item}>
          <h6>{model.getLabel()}</h6>
          <body.Component model={body} />
        </Card>
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    itemContainer: css({
      display: 'flex',
      flex: 1,
    }),
    item: css({
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.colors.secondary.main,
      borderRadius: '8px',
      border: `2px solid ${theme.colors.secondary.border}`,
      cursor: 'pointer',
      fontSize: '12px',
      flex: 1,
      '&:hover': {
        border: `2px solid ${theme.colors.secondary.borderTransparent}`,
      },
      'h6': {
        marginTop: '-18px',
      },
      'h2': { // radio button
        justifyContent: 'flex-end',
      }
    }),
  };
}
