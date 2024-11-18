import { css } from '@emotion/css';
import React from 'react';

import { AdHocVariableFilter, GrafanaTheme2 } from '@grafana/data';
import {
  CustomVariable,
  DataSourceVariable,
  SceneComponentProps,
  SceneFlexItem,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectRef,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
  SplitLayout,
} from '@grafana/scenes';
import {
  LocationService,
  config,
  // @ts-ignore
  sidecarServiceSingleton_EXPERIMENTAL,
} from '@grafana/runtime';
import { Badge, Button, Dropdown, Icon, Menu, Stack, Tooltip, useStyles2 } from '@grafana/ui';

import { TracesByServiceScene } from '../../components/Explore/TracesByService/TracesByServiceScene';
import {
  DATASOURCE_LS_KEY,
  DetailsSceneUpdated,
  MetricFunction,
  VAR_DATASOURCE,
  VAR_GROUPBY,
  VAR_LATENCY_PARTIAL_THRESHOLD,
  VAR_LATENCY_THRESHOLD,
  VAR_METRIC,
} from '../../utils/shared';
import { getTraceExplorationScene, getFilterSignature, getFiltersVariable } from '../../utils/utils';
import { DetailsScene } from '../../components/Explore/TracesByService/DetailsScene';
import { FilterByVariable } from 'components/Explore/filters/FilterByVariable';
import { getSignalForKey, primarySignalOptions } from './primary-signals';
import { VariableHide } from '@grafana/schema';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from 'utils/analytics';
import pluginJson from '../../plugin.json';

export interface TraceExplorationState extends SceneObjectState {
  topScene?: SceneObject;
  controls: SceneObject[];

  splitBody: SplitLayout;
  singleBody: SceneObject;

  detailsScene?: SceneObjectRef<DetailsScene>;
  showDetails?: boolean;
  primarySignal?: string;

  // details scene
  traceId?: string;
  spanId?: string;

  // just for the starting data source
  initialDS?: string;
  initialFilters?: AdHocVariableFilter[];

  locationService: LocationService;
}

const version = process.env.VERSION;
const buildTime = process.env.BUILD_TIME;
const commitSha = process.env.COMMIT_SHA;
const compositeVersion = `v${version} - ${buildTime?.split('T')[0]} (${commitSha})`;

export class TraceExploration extends SceneObjectBase<TraceExplorationState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['primarySignal', 'traceId', 'spanId'] });

  public constructor(state: { locationService: LocationService } & Partial<TraceExplorationState>) {
    super({
      $timeRange: state.$timeRange ?? new SceneTimeRange({}),
      $variables: state.$variables ?? getVariableSet(state.initialDS, state.initialFilters),
      controls: state.controls ?? [new SceneTimePicker({}), new SceneRefreshPicker({})],
      singleBody: new TraceExplorationScene({}),
      splitBody: buildSplitLayout(),
      detailsScene: new DetailsScene({}).getRef(),
      primarySignal: state.primarySignal ?? primarySignalOptions[0].value,
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    if (!this.state.topScene) {
      this.setState({ topScene: getTopScene(this.getMetricVariable().getValue() as MetricFunction) });
    }

    // Some scene elements publish this
    this.subscribeToEvent(DetailsSceneUpdated, this._handleDetailsSceneUpdated.bind(this));

    const datasourceVar = sceneGraph.lookupVariable(VAR_DATASOURCE, this) as DataSourceVariable;
    datasourceVar.subscribeToState((newState) => {
      if (newState.value) {
        localStorage.setItem(DATASOURCE_LS_KEY, newState.value.toString());
      }
    });
    this.subscribeToState((newState, oldState) => {
      if (newState.showDetails !== oldState.showDetails) {
        if (newState.showDetails) {
          this.setSecondaryScene(this.state.detailsScene?.resolve());
        } else {
          this.setSecondaryScene(undefined);
        }
      }
      if (newState.primarySignal && newState.primarySignal !== oldState.primarySignal) {
        this.updateFiltersWithPrimarySignal(newState.primarySignal, oldState.primarySignal);
      }
    });
  }

  public updateFiltersWithPrimarySignal(newSignal?: string, oldSignal?: string) {
    let signal = newSignal ?? this.state.primarySignal;

    const filtersVar = getFiltersVariable(this);
    let filters = filtersVar.state.filters;
    // Remove previous filter for primary signal
    if (oldSignal) {
      filters = filters.filter((f) => getFilterSignature(f) !== getFilterSignature(getSignalForKey(oldSignal)?.filter));
    }
    // Add new filter
    const newFilter = getSignalForKey(signal)?.filter;
    if (newFilter) {
      filters.unshift(newFilter);
    }
    filtersVar.setState({ filters });
  }

  private _handleDetailsSceneUpdated(evt: DetailsSceneUpdated) {
    const showDetails = evt.payload.showDetails ?? false;
    const stateUpdate: Partial<TraceExplorationState> = { showDetails };

    if (!showDetails) {
      stateUpdate.traceId = undefined;
      stateUpdate.spanId = undefined;
    }

    this.setState(stateUpdate);
  }

  getUrlState() {
    return { primarySignal: this.state.primarySignal, traceId: this.state.traceId, spanId: this.state.spanId };
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    const stateUpdate: Partial<TraceExplorationState> = {};

    if (values.traceId || values.spanId) {
      stateUpdate.showDetails = true;
      stateUpdate.traceId = values.traceId ? (values.traceId as string) : undefined;
      stateUpdate.spanId = values.spanId ? (values.spanId as string) : undefined;

      const detailsScene = this.state.detailsScene?.resolve();
      this.setSecondaryScene(detailsScene);
    }

    if (values.primarySignal && values.primarySignal !== this.state.primarySignal) {
      stateUpdate.primarySignal = values.primarySignal as string;
    }

    this.setState(stateUpdate);
  }

  public getMetricVariable() {
    const variable = sceneGraph.lookupVariable(VAR_METRIC, this);
    if (!(variable instanceof CustomVariable)) {
      throw new Error('Metric variable not found');
    }

    if (!variable.getValue()) {
      variable.changeValueTo('rate');
    }

    return variable;
  }

  public onChangePrimarySignal = (signal: string) => {
    if (!signal || this.state.primarySignal === signal) {
      return;
    }
    this.setState({ primarySignal: signal });
  };

  public onChangeMetricFunction = (metric: string) => {
    const variable = this.getMetricVariable();
    if (!metric || variable.getValue() === metric) {
      return;
    }
    variable.changeValueTo(metric);
  };

  public getMetricFunction() {
    return this.getMetricVariable().getValue() as MetricFunction;
  }

  static Component = ({ model }: SceneComponentProps<TraceExploration>) => {
    const { singleBody, splitBody } = model.useState();
    const styles = useStyles2(getStyles);

    // The API looks a bit weird because duh we are opened if we are here, but this specifically means we are in a
    // sidecar with some other app. In that case we don't want to show additional split layout as there is not much
    // space and 3 splits is a bit too much.
    const body: SceneObject =
      config.featureToggles.appSidecar && sidecarServiceSingleton_EXPERIMENTAL?.isAppOpened(pluginJson.id)
        ? singleBody
        : splitBody;

    return <div className={styles.bodyContainer}> {body && <body.Component model={body} />} </div>;
  };

  // Because we have two modes of how to present the secondary scene depending on sidecar we need to set it 2 ways.
  // This could have been easier but we have to keep the split scene in memory to no trigger unmount (this is a bit
  // different from react where components can be returned from a function without triggering unmount) and use
  // `setState` to change the secondary scene. We could also just keep the splitScene and not use the secondary prop
  // for the sidecar use case but splitScene adds some css that makes responsive sizing in sidecar complicated.
  private setSecondaryScene(scene?: SceneObject) {
    this.state.splitBody.setState({ secondary: scene });
    if (scene) {
      this.setState({ singleBody: scene });
    } else {
      this.setState({ singleBody: new TraceExplorationScene({}) });
    }
  }
}

export class TraceExplorationScene extends SceneObjectBase {
  static Component = ({ model }: SceneComponentProps<TraceExplorationScene>) => {
    const traceExploration = getTraceExplorationScene(model);
    const { controls, topScene } = traceExploration.useState();
    const styles = useStyles2(getStyles);
    const [menuVisible, setMenuVisible] = React.useState(false);

    const dsVariable = sceneGraph.lookupVariable(VAR_DATASOURCE, traceExploration);
    const filtersVariable = getFiltersVariable(traceExploration);

    const menu = (
      <Menu>
        <div className={styles.menu}>
          <Menu.Item
            label="Give feedback"
            ariaLabel="Give feedback"
            icon={'comment-alt-message'}
            url="https://grafana.qualtrics.com/jfe/form/SV_9LUZ21zl3x4vUcS"
            target="_blank"
            onClick={() =>
              reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.global_docs_link_clicked)
            }
          />
          <Menu.Item
            label="Documentation"
            ariaLabel="Documentation"
            icon={'external-link-alt'}
            url="https://grafana.com/docs/grafana/next/explore/simplified-exploration/traces/"
            target="_blank"
            onClick={() =>
              reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.feedback_link_clicked)
            }
          />
        </div>
      </Menu>
    );

    return (
      <div className={styles.container}>
        <div className={styles.headerContainer}>
          <Stack gap={2} justifyContent={'space-between'} wrap={'wrap'}>
            {dsVariable && (
              <Stack gap={1} alignItems={'center'}>
                <div className={styles.datasourceLabel}>Data source</div>
                <dsVariable.Component model={dsVariable} />
              </Stack>
            )}
            <div className={styles.controls}>
              <Tooltip content={<PreviewTooltip text={compositeVersion} />} interactive>
                <span className={styles.preview}>
                  <Badge text="&nbsp;Preview" color="blue" icon="rocket" />
                </span>
              </Tooltip>

              <Dropdown overlay={menu} onVisibleChange={() => setMenuVisible(!menuVisible)}>
                <Button variant="secondary" icon="info-circle">
                  Need help
                  <Icon className={styles.helpIcon} name={menuVisible ? 'angle-up' : 'angle-down'} size="lg" />
                </Button>
              </Dropdown>
              {controls.map((control) => (
                <control.Component key={control.state.key} model={control} />
              ))}
            </div>
          </Stack>
          <div className={styles.filters}>
            {filtersVariable && <filtersVariable.Component model={filtersVariable} />}
          </div>
        </div>
        <div className={styles.body}>{topScene && <topScene.Component model={topScene} />}</div>
      </div>
    );
  };
}

const PreviewTooltip = ({ text }: { text: string }) => {
  const styles = useStyles2(getStyles);

  return (
    <Stack direction={'column'} gap={2}>
      <div className={styles.tooltip}>{text}</div>
    </Stack>
  );
};

function buildSplitLayout() {
  return new SplitLayout({
    direction: 'row',
    initialSize: 0.6,
    primary: new SceneFlexItem({
      body: new TraceExplorationScene({}),
    }),
  });
}

function getTopScene(metric?: MetricFunction) {
  return new TracesByServiceScene({ metric });
}

function getVariableSet(initialDS?: string, initialFilters?: AdHocVariableFilter[]) {
  return new SceneVariableSet({
    variables: [
      new DataSourceVariable({
        name: VAR_DATASOURCE,
        label: 'Data source',
        value: initialDS,
        pluginId: 'tempo',
      }),
      new FilterByVariable({
        initialFilters,
      }),
      new CustomVariable({
        name: VAR_METRIC,
        hide: VariableHide.hideVariable,
      }),
      new CustomVariable({
        name: VAR_GROUPBY,
        defaultToAll: false,
      }),
      new CustomVariable({
        name: VAR_LATENCY_THRESHOLD,
        defaultToAll: false,
        hide: VariableHide.hideVariable,
      }),
      new CustomVariable({
        name: VAR_LATENCY_PARTIAL_THRESHOLD,
        defaultToAll: false,
        hide: VariableHide.hideVariable,
      }),
    ],
  });
}

function getStyles(theme: GrafanaTheme2) {
  return {
    bodyContainer: css({
      label: 'bodyContainer',
      flexGrow: 1,
      display: 'flex',
      minHeight: '100%',
      flexDirection: 'column',
    }),
    container: css({
      label: 'container',
      flexGrow: 1,
      display: 'flex',
      gap: theme.spacing(2),
      minHeight: '100%',
      flexDirection: 'column',
      padding: `0 ${theme.spacing(2)} ${theme.spacing(2)} ${theme.spacing(2)}`,
      overflow: 'auto' /* Needed for sticky positioning */,
      height: '1px' /* Needed for sticky positioning */,
    }),
    body: css({
      label: 'body',
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
    headerContainer: css({
      label: 'headerContainer',
      backgroundColor: theme.colors.background.canvas,
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      zIndex: 3,
      padding: `${theme.spacing(1.5)} 0`,
    }),
    datasourceLabel: css({
      label: 'datasourceLabel',
      fontSize: '12px',
    }),
    controls: css({
      label: 'controls',
      display: 'flex',
      gap: theme.spacing(1),
      zIndex: 3,
      flexWrap: 'wrap',
    }),
    menu: css({
      label: 'menu',
      'svg, span': {
        color: theme.colors.text.link,
      },
    }),
    preview: css({
      label: 'preview',
      cursor: 'help',

      '> div:first-child': {
        padding: '5.5px',
      },
    }),
    tooltip: css({
      label: 'tooltip',
      fontSize: '14px',
      lineHeight: '22px',
      width: '180px',
      textAlign: 'center',
    }),
    helpIcon: css({
      label: 'helpIcon',
      marginLeft: theme.spacing(1),
    }),
    filters: css({
      label: 'filters',
      backgroundColor: theme.colors.background.primary,
      paddingTop: theme.spacing(1),
    }),
  };
}
