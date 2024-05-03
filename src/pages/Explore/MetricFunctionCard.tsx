import {
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
} from '@grafana/scenes';
import { explorationDS, MetricFunction } from '../../utils/shared';
import { barsPanelConfig } from '../../components/Explore/panels/barsPanel';
import { rateByWithStatus } from '../../components/Explore/queries/rateByWithStatus';
import React from 'react';
import { css, cx } from '@emotion/css';
import { TraceExploration } from './TraceExploration';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

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
            new SceneQueryRunner({
              maxDataPoints: 250,
              datasource: explorationDS,
              queries: [rateByWithStatus('errors')],
            })
          )
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
      case 'latency':
        return barsPanelConfig()
          .setData(
            new SceneQueryRunner({
              maxDataPoints: 250,
              datasource: explorationDS,
              queries: [rateByWithStatus('latency')],
            })
          )
          .build();
      default:
        return barsPanelConfig()
          .setData(
            new SceneQueryRunner({
              maxDataPoints: 250,
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
      case 'latency':
        return 'Latency';
      default:
        return 'Span rate';
    }
  }

  public static Component = ({ model }: SceneComponentProps<MetricFunctionCard>) => {
    const { body, metric } = model.useState();
    const traceExploration = sceneGraph.getAncestor(model, TraceExploration);
    const { metric: selectedMetric } = traceExploration.useState();
    const styles = useStyles2(getStyles);

    const itemStyles = metric === selectedMetric ? [styles.item, styles.selected] : [styles.item];
    return (
      <div key={metric} className={cx(itemStyles)} onClick={() => traceExploration.onChangeMetricFunction(metric)}>
        <h6>{model.getLabel()}</h6>
        <body.Component model={body} />
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    item: css({
      display: 'flex',
      flexDirection: 'column',
      padding: theme.spacing(1),
      backgroundColor: theme.colors.secondary.main,
      borderRadius: '8px',
      border: `2px solid ${theme.colors.secondary.border}`,
      cursor: 'pointer',
      fontSize: '12px',
      flex: 1,
    }),
    selected: css({
      border: `2px solid #cc8c17`,
    }),
  };
}
