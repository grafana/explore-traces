import { css } from '@emotion/css';
import React from 'react';

import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import { InlineSelect } from '@grafana/experimental';
import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  PanelBuilders,
  SceneCSSGridLayout,
  SceneCSSGridItem,
  SceneQueryRunner,
  SceneDataNode,
} from '@grafana/scenes';
import { useStyles2, Tab, TabsBar } from '@grafana/ui';

import { SelectServiceNameAction } from './SelectServiceName';
import { explorationDS } from './shared';
import { getColorByIndex } from './utils';
import {ByFrameRepeater} from "./TracesTabs/ByFrameRepeater";

export interface TraceSelectSceneState extends SceneObjectState {
  body: SceneCSSGridLayout;
  showHeading?: boolean;
  searchQuery?: string;
  showPreviews?: boolean;
}

const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

export class TraceSelectScene extends SceneObjectBase<TraceSelectSceneState> {
  constructor(state: Partial<TraceSelectSceneState>) {
    super({
      body: state.body ?? new SceneCSSGridLayout({ children: [] }),
      showPreviews: true,
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this.setState({
      body: this.buildBody(),
    });
  }

  private buildBody() {
    console.log(buildQuery());
    return new SceneCSSGridLayout({
      children: [
        new ByFrameRepeater({
          $data: new SceneQueryRunner({
            datasource: explorationDS,
            queries: [buildQuery()],
          }),
          body: new SceneCSSGridLayout({
            templateColumns: GRID_TEMPLATE_COLUMNS,
            autoRows: '200px',
            children: [],
          }),
          getLayoutChild: (data, frame, frameIndex) => {
            console.log(data);
            return new SceneCSSGridItem({
              body: PanelBuilders.timeseries()
                .setTitle(getLabelValue(frame))
                .setData(new SceneDataNode({ data: { ...data, series: [frame] } }))
                .setColor({ mode: 'fixed', fixedColor: getColorByIndex(frameIndex) })
                .setOption('legend', { showLegend: false })
                .setCustomFieldConfig('fillOpacity', 9)
                .setHeaderActions(new SelectServiceNameAction({ frame }))
                .build(),
            });
          },
        }),
      ],
    });
  }

  public onTogglePreviews = () => {
    this.setState({ showPreviews: !this.state.showPreviews });
    this.setState({ body: this.buildBody() });
  };

  public static Component = ({ model }: SceneComponentProps<TraceSelectScene>) => {
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <InlineSelect
            label="Function"
            options={[
              { value: 'rate', label: 'Rate' },
              { value: 'count', label: 'Count' },
              { value: 'avg', label: 'Avg Duration' },
              { value: 'max', label: 'Max Duration' },
            ]}
            value={'rate'}
            onChange={model.onTogglePreviews}
            width={30}
          />
        </div>
        <TabsBar>
          {['Service Name', 'Cluster', 'Namespace'].map((tab, index) => {
            return <Tab key={index} label={tab} active={index === 0} />;
          })}
        </TabsBar>
        <model.state.body.Component model={model.state.body} />
      </div>
    );
  };
}

function getLabelValue(frame: DataFrame) {
  const name = frame.fields[1]?.name;

  if (!name) {
    return 'No name';
  }
  return name;
}

function buildQuery() {
  return {
    refId: 'A',
    query: `{} | rate() by (resource.service.name)`,
    queryType: 'traceql',
    filters: [],
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
    }),
    headingWrapper: css({
      marginTop: theme.spacing(1),
    }),
    header: css({
      position: 'absolute',
      right: '16px',
      zIndex: 2,
    }),
  };
}
