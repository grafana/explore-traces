import React from 'react';

import {
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { arrayToDataFrame, GrafanaTheme2, LoadingState } from '@grafana/data';
import { ComparisonSelection, explorationDS, MetricFunction } from 'utils/shared';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { SkeletonComponent } from '../ByFrameRepeater';
import { barsPanelConfig } from '../panels/barsPanel';
import { rateByWithStatus } from '../queries/rateByWithStatus';
import { StepQueryRunner } from '../queries/StepQueryRunner';
import { css } from '@emotion/css';
import { RadioButtonList, useStyles2 } from '@grafana/ui';
import {
  fieldHasEmptyValues,
  getLatencyPartialThresholdVariable,
  getLatencyThresholdVariable,
  getMetricVariable,
  getTraceByServiceScene,
  shouldShowSelection,
} from '../../../utils/utils';
import { getHistogramVizPanel, yBucketToDuration } from '../panels/histogram';
import { TraceSceneState } from './TracesByServiceScene';
import { SelectionColor } from '../layouts/allComparison';
import { buildHistogramQuery } from '../queries/histogram';
import { isEqual } from 'lodash';
import { DurationComparisonControl } from './DurationComparisonControl';

export interface RateMetricsPanelState extends SceneObjectState {
  panel?: SceneFlexLayout;
  actions?: SceneObject[];
  yBuckets?: number[];
}

export class REDPanel extends SceneObjectBase<RateMetricsPanelState> {
  constructor(state: RateMetricsPanelState) {
    super({
      yBuckets: [],
      actions: [],
      ...state,
    });

    this.addActivationHandler(() => {
      this._onActivate();
      const data = sceneGraph.getData(this);
      const parent = getTraceByServiceScene(this);
      const timeRange = sceneGraph.getTimeRange(this);

      this._subs.add(
        data.subscribeToState((newData) => {
          if (newData.data?.state === LoadingState.Done) {
            if (newData.data.series.length === 0 || newData.data.series[0].length === 0 || fieldHasEmptyValues(newData)) {
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
              let yBuckets: number[] | undefined = [];
              if (this.isDuration()) {
                yBuckets = data.state.data?.series.map((s) => parseFloat(s.fields[1].name)).sort((a, b) => a - b);
                if (parent.state.selection && newData.data?.state === LoadingState.Done) {
                  // set selection annotation if it exists
                  const annotations = this.buildSelectionAnnotation(parent.state);

                  if (annotations && !data.state.data?.annotations?.length) {
                    data.setState({
                      data: {
                        ...data.state.data!,
                        annotations: annotations,
                      },
                    });
                  }
                }

                if (yBuckets?.length) {
                  const slowestBuckets = Math.floor(yBuckets.length / 4);
                  let minBucket = yBuckets.length - slowestBuckets - 1;
                  if (minBucket < 0) {
                    minBucket = 0;
                  }

                  const selection: ComparisonSelection = { type: 'auto' };
                  const minDuration = yBucketToDuration(minBucket - 1, yBuckets);

                  getLatencyThresholdVariable(this).changeValueTo(minDuration);
                  getLatencyPartialThresholdVariable(this).changeValueTo(
                    yBucketToDuration(minBucket - 1, yBuckets, 0.3)
                  );

                  selection.duration = { from: minDuration, to: '' };
                  selection.raw = {
                    x: {
                      from: timeRange.state.value.from.unix() * 1000,
                      to: timeRange.state.value.to.unix() * 1000,
                    },
                    y: { from: minBucket - 0.5, to: yBuckets.length - 0.5 },
                  };

                  this.setState({
                    actions: [
                      new DurationComparisonControl({
                        selection,
                      }),
                    ],
                  });
                  if (!parent.state.selection?.duration || parent.state.selection.type === 'auto') {
                    parent.setState({ selection });
                  }
                }
              }

              // update panel
              this.setState({
                yBuckets,
                panel: this.getVizPanel(),
              });
            }
          } else if (newData.data?.state === LoadingState.Loading) {
            this.setState({
              panel: new SceneFlexLayout({
                direction: 'column',
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

      this._subs.add(
        parent.subscribeToState((newState, prevState) => {
          if (data.state.data?.state === LoadingState.Done) {
            if (!isEqual(newState.selection, prevState.selection) || newState.actionView !== prevState.actionView) {
              const annotations = this.buildSelectionAnnotation(newState);
              data.setState({
                data: {
                  ...data.state.data!,
                  annotations: annotations,
                },
              });
            }
          }
        })
      );
    });
  }

  private isDuration() {
    return getMetricVariable(this).state.value === 'duration';
  }

  private _onActivate() {
    const metric = getMetricVariable(this).state.value as MetricFunction;
    this.setState({
      $data: new StepQueryRunner({
        maxDataPoints: this.isDuration() ? 24 : 64,
        datasource: explorationDS,
        queries: [this.isDuration() ? buildHistogramQuery() : rateByWithStatus(metric)],
      }),
      panel: this.getVizPanel(),
    });
  }

  private getVizPanel() {
    const metric = getMetricVariable(this).state.value as MetricFunction;
    if (this.isDuration()) {
      return getHistogramVizPanel(this, this.state.yBuckets ?? []);
    }

    return this.getRateOrErrorVizPanel(metric);
  }

  private getRateOrErrorVizPanel(type: MetricFunction) {
    const panel = barsPanelConfig().setHoverHeader(true).setDisplayMode('transparent');
    if (type === 'errors') {
      panel.setCustomFieldConfig('axisLabel', 'Errors').setColor({
        fixedColor: 'semi-dark-red',
        mode: 'fixed',
      });
    }
    return new SceneFlexLayout({
      direction: 'row',
      children: [
        new SceneFlexItem({
          body: panel.build(),
        }),
      ],
    });
  }

  private buildSelectionAnnotation(state: TraceSceneState) {
    if (!shouldShowSelection(state.actionView)) {
      return undefined;
    }

    const xSel = state.selection?.raw?.x;
    const ySel = state.selection?.raw?.y;

    const frame = arrayToDataFrame([
      {
        time: xSel?.from || 0,
        xMin: xSel?.from || 0,
        xMax: xSel?.to || 0,
        yMin: ySel?.from,
        yMax: ySel?.to,
        isRegion: true,
        fillOpacity: 0.15,
        lineWidth: 1,
        lineStyle: 'solid',
        color: SelectionColor,
        text: 'Comparison selection',
      },
    ]);
    frame.name = 'xymark';

    return [frame];
  }

  public static Component = ({ model }: SceneComponentProps<REDPanel>) => {
    const { panel, actions } = model.useState();
    const { value: metric } = getMetricVariable(model).useState();
    const styles = useStyles2(getStyles);

    if (!panel) {
      return;
    }

    const getTitle = () => {
      switch (metric) {
        case 'errors':
          return 'Errors rate';
        case 'rate':
          return 'Span rate';
        case 'duration':
          return 'Histogram by duration';
        default:
          return '';
      }
    };

    const getSubtitle = () => {
      switch (metric) {
        case 'duration':
          return 'Click and drag to compare selection with baseline.';
        default:
          return '';
      }
    };

    const subtitle = getSubtitle();

    return (
      <div className={styles.container}>
        <div className={styles.headerContainer}>
          <div className={styles.titleContainer}>
            <div className={styles.titleRadioWrapper}>
              <RadioButtonList
                name={`metric-${metric}`}
                options={[{ title: '', value: 'selected' }]}
                value={'selected'}
              />
              <span>{getTitle()}</span>
            </div>
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          </div>
          <div className={styles.actions}>
            {actions?.map((action) => (
              <action.Component model={action} key={action.state.key} />
            ))}
          </div>
        </div>
        <panel.Component model={panel} />
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: '2px',
      background: theme.colors.background.primary,

      '.show-on-hover': {
        display: 'none',
      },
      'section, section:hover': {
        borderColor: 'transparent',
      },
      '& .u-select': {
        border: '1px solid #ffffff75',
      },
    }),
    headerContainer: css({
      width: '100%',
      display: 'flex',
      flexDirection: 'row',
      padding: '8px',
      gap: '8px',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      fontWeight: theme.typography.fontWeightBold,
    }),
    titleContainer: css({
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }),
    titleRadioWrapper: css({
      display: 'flex',
    }),
    actions: css({
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    }),
    subtitle: css({
      display: 'flex',
      color: theme.colors.text.secondary,
      fontSize: '12px',
      fontWeight: 400,

      '& svg': {
        margin: '0 2px',
      },
    }),
  };
}
