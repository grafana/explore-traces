import React from 'react';

import {
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { GrafanaTheme2, LoadingState } from '@grafana/data';
import { explorationDS, MetricFunction } from 'utils/shared';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { SkeletonComponent } from '../ByFrameRepeater';
import { barsPanelConfig } from '../panels/barsPanel';
import { rateByWithStatus } from '../queries/rateByWithStatus';
import { StepQueryRunner } from '../queries/StepQueryRunner';
import { RadioButtonList, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { getTraceExplorationScene } from '../../../utils/utils';
import { MINI_PANEL_HEIGHT } from './TracesByServiceScene';
import { buildHistogramQuery } from '../queries/histogram';
import { histogramPanelConfig } from '../panels/histogram';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from 'utils/analytics';

export interface MiniREDPanelState extends SceneObjectState {
  panel?: SceneFlexLayout;
  metric: MetricFunction;
}

export class MiniREDPanel extends SceneObjectBase<MiniREDPanelState> {
  constructor(state: MiniREDPanelState) {
    super({
      ...state,
    });

    this.addActivationHandler(() => {
      this._onActivate();
      const data = sceneGraph.getData(this);

      this._subs.add(
        data.subscribeToState((data) => {
          if (data.data?.state === LoadingState.Done) {
            if (data.data.series.length === 0 || data.data.series[0].length === 0) {
              this.setState({
                panel: new SceneFlexLayout({
                  children: [
                    new SceneFlexItem({
                      body: new EmptyStateScene({
                        message: 'No data for selected query',
                        imgWidth: 150,
                      }),
                    }),
                  ],
                }),
              });
            } else {
              this.setState({
                panel: this.getVizPanel(this.state.metric),
              });
            }
          } else if (data.data?.state === LoadingState.Loading) {
            this.setState({
              panel: new SceneFlexLayout({
                direction: 'column',
                maxHeight: MINI_PANEL_HEIGHT,
                height: MINI_PANEL_HEIGHT,
                children: [
                  new LoadingStateScene({
                    component: () => SkeletonComponent(1),
                  }),
                ],
              }),
            });
          }
        })
      );
    });
  }

  private _onActivate() {
    this.setState({
      $data: new StepQueryRunner({
        maxDataPoints: this.state.metric === 'duration' ? 24 : 64,
        datasource: explorationDS,
        queries: [this.state.metric === 'duration' ? buildHistogramQuery() : rateByWithStatus(this.state.metric)],
      }),
      panel: this.getVizPanel(this.state.metric),
    });
  }

  private getVizPanel(metric: MetricFunction) {
    return new SceneFlexLayout({
      direction: 'row',
      children: [
        new SceneFlexItem({
          body: metric === 'duration' ? this.getDurationVizPanel() : this.getRateOrErrorPanel(metric),
        }),
      ],
    });
  }

  private getRateOrErrorPanel(metric: MetricFunction) {
    const panel = barsPanelConfig().setHoverHeader(true).setDisplayMode('transparent');
    if (metric === 'errors') {
      panel.setTitle('Errors rate').setCustomFieldConfig('axisLabel', 'Errors').setColor({
        fixedColor: 'semi-dark-red',
        mode: 'fixed',
      });
    } else {
      panel.setTitle('Span rate');
    }

    return panel.build();
  }

  private getDurationVizPanel() {
    return histogramPanelConfig()
      .setTitle('Histogram by duration')
      .setHoverHeader(true)
      .setDisplayMode('transparent')
      .build();
  }

  public static Component = ({ model }: SceneComponentProps<MiniREDPanel>) => {
    const { panel } = model.useState();
    const styles = useStyles2(getStyles);
    const traceExploration = getTraceExplorationScene(model);

    const selectMetric = () => {
      reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.metric_changed, {
        metric: model.state.metric,
        location: 'panel',
      });
      traceExploration.onChangeMetricFunction(model.state.metric);
    };

    if (!panel) {
      return;
    }

    return (
      <div className={css([styles.container, styles.clickable])} onClick={selectMetric}>
        <RadioButtonList
          className={styles.radioButton}
          name={`metric-${model.state.metric}`}
          options={[{ title: '', value: 'selected' }]}
          onChange={() => selectMetric()}
          value={'not-selected'}
        />
        <panel.Component model={panel} />
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      flex: 1,
      width: '100%',
      display: 'flex',
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: '2px',
      background: theme.colors.background.primary,
      paddingTop: '8px',

      'section, section:hover': {
        borderColor: 'transparent',
      },

      '& .show-on-hover': {
        display: 'none',
      },
    }),
    clickable: css({
      cursor: 'pointer',
      maxHeight: MINI_PANEL_HEIGHT,

      ['[class*="loading-state-scene"]']: {
        height: MINI_PANEL_HEIGHT,
        overflow: 'hidden',
      },

      ':hover': {
        background: theme.colors.background.secondary,
        input: {
          backgroundColor: '#ffffff',
          border: '5px solid #3D71D9',
          cursor: 'pointer',
        },
      },
    }),
    radioButton: css({
      display: 'block',
      position: 'absolute',
      top: '4px',
      left: '8px',
      zIndex: 2,
    }),
  };
}
