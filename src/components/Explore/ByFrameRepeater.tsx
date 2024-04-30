import React from 'react';

import { LoadingState, PanelData, DataFrame, GrafanaTheme2 } from '@grafana/data';
import {
  SceneObjectState,
  SceneFlexItem,
  SceneObjectBase,
  sceneGraph,
  SceneComponentProps,
  SceneLayout,
  SceneCSSGridLayout,
  SceneDataProvider,
  SceneDataState,
  CustomVariable,
} from '@grafana/scenes';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { css } from '@emotion/css';
import { Field, Icon, Input, useStyles2 } from '@grafana/ui';
import Skeleton from 'react-loading-skeleton';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { GRID_TEMPLATE_COLUMNS } from 'pages/Explore/SelectStartingPointScene';
import { ErrorStateScene } from 'components/states/ErrorState/ErrorStateScene';
import { debounce } from 'lodash';
import { groupSeriesBy } from '../../utils/panels';
import { VAR_GROUPBY } from '../../utils/shared';

interface ByFrameRepeaterState extends SceneObjectState {
  body: SceneLayout;
  groupBy?: boolean;
  getLayoutChild(data: PanelData, frame: DataFrame, frameIndex: number): SceneFlexItem;
  searchQuery?: string;
}

export class ByFrameRepeater extends SceneObjectBase<ByFrameRepeaterState> {
  public constructor(state: ByFrameRepeaterState) {
    super(state);

    this.addActivationHandler(() => {
      const data = sceneGraph.getData(this);

      this._subs.add(
        data.subscribeToState((data) => {
          if (data.data?.state === LoadingState.Done) {
            if (data.data.series.length === 0) {
              this.state.body.setState({
                children: [
                  new SceneFlexItem({
                    body: new EmptyStateScene({
                      message: 'No data for selected query',
                    }),
                  }),
                ],
              });
            } else {
              this.performRepeat(data.data);
            }
          } else if (data.data?.state === LoadingState.Error) {
            this.state.body.setState({
              children: [
                new SceneCSSGridLayout({
                  children: [
                    new ErrorStateScene({
                      message: data.data.error?.message ?? 'An error occurred in the query',
                    }),
                  ],
                }),
              ],
            });
          } else if (data.data?.state === LoadingState.Loading) {
            this.state.body.setState({
              children: [
                new SceneCSSGridLayout({
                  children: [
                    new LoadingStateScene({
                      component: SkeletonComponent,
                    }),
                  ],
                }),
              ],
            });
          }
        })
      );

      this.subscribeToState((newState, prevState) => {
        if (newState.searchQuery !== prevState.searchQuery) {
          this.onSearchQueryChangeDebounced(data, newState.searchQuery ?? '');
        }
      });

      if (data.state.data) {
        this.performRepeat(data.state.data);
      }
    });
  }

  private onSearchQueryChange = (evt: React.SyntheticEvent<HTMLInputElement>) => {
    this.setState({ searchQuery: evt.currentTarget.value });
  };

  private onSearchQueryChangeDebounced = debounce((data: SceneDataProvider<SceneDataState>, searchQuery: string) => {
    const filteredData = {
      ...data.state.data,
      series: data.state.data?.series.filter((frame) => {
        return frame.fields.some((field) => {
          if (!field.labels) {
            return false;
          }

          const matchFound = Object.values(field.labels).find((label) => label.toLowerCase().includes(searchQuery));
          return matchFound ? true : false;
        });
      }),
    }
    
    if (filteredData.series && filteredData.series.length > 0) {
      this.performRepeat(filteredData as PanelData);
    } else {
      this.state.body.setState({
        children: [
          new SceneFlexItem({
            body: new EmptyStateScene({
              message: 'No data for search term',
            }),
          }),
        ],
      });
    }
  }, 250);
  public getGroupByVariable() {
    const variable = sceneGraph.lookupVariable(VAR_GROUPBY, this);
    if (!(variable instanceof CustomVariable)) {
      throw new Error('Group by variable not found');
    }

    return variable;
  }

  private performRepeat(data: PanelData) {
    const newChildren: SceneFlexItem[] = [];
    let frames = data.series;

    if (this.state.groupBy) {
      frames = groupSeriesBy(data, this.getGroupByVariable().getValueText());
    }

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const layoutChild = this.state.getLayoutChild(data, frames[frameIndex], frameIndex);
      newChildren.push(layoutChild);
    }

    this.state.body.setState({ children: newChildren });
  }

  public static Component = ({ model }: SceneComponentProps<ByFrameRepeater>) => {
    const { body, searchQuery } = model.useState();
    const styles = useStyles2(getStyles);
    
    return (
      <div className={styles.container}>
        <Field className={styles.searchField}>
          <Input
            placeholder="Search"
            prefix={<Icon name={'search'} />}
            value={searchQuery}
            onChange={model.onSearchQueryChange}
          />
        </Field>
        <body.Component model={body} />
      </div>
    );
  };
}

function getStyles() {
  return {
    container: css({
      display: 'flex',    
      flexDirection: 'column',
      flexGrow: 1,
    }),
    searchField: css({
      marginBottom: '7px',
      marginTop: '10px',
    }),
  };
}

const SkeletonComponent = () => {
  const styles = useStyles2(getSkeletonStyles);

  return (
    <div className={styles.container}>
      {[...Array(8)].map((_, i) => (
        <div className={styles.itemContainer} key={i}>
          <div className={styles.header}>
            <div className={styles.title}>
              <Skeleton count={1} />
            </div>
            <div className={styles.action}>
              <Skeleton count={1} />
            </div>
          </div>
          <div className={styles.yAxis}>
            {[...Array(2)].map((_, i) => (
              <div className={styles.yAxisItem} key={i}>
                <Skeleton count={1} />
              </div>
            ))}
          </div>
          <div className={styles.xAxis}>
            {[...Array(2)].map((_, i) => (
              <div className={styles.xAxisItem} key={i}>
                <Skeleton count={1} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

function getSkeletonStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'grid',
      gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
      gridAutoRows: '200px',
      rowGap: theme.spacing(1),
      columnGap: theme.spacing(1),
    }),
    itemContainer: css({
      backgroundColor: theme.colors.background.primary,
      border: `1px solid ${theme.colors.background.secondary}`,
      padding: '5px',
    }),
    header: css({
      display: 'flex',
      justifyContent: 'space-between',
    }),
    title: css({
      width: '100px',
    }),
    action: css({
      width: '60px',
    }),
    yAxis: css({
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-around',
      marginTop: '35px',
    }),
    yAxisItem: css({
      width: '60px',
      height: '55px',
    }),
    xAxis: css({
      display: 'flex',
      justifyContent: 'space-evenly',
    }),
    xAxisItem: css({
      width: '55px',
    }),
  };
}
