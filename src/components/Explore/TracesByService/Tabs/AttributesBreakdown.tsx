import { css } from '@emotion/css';
import React from 'react';

import { DataFrame, GrafanaTheme2, PanelData } from '@grafana/data';
import {
  CustomVariable,
  PanelBuilders,
  PanelOptionsBuilders,
  SceneComponentProps,
  SceneCSSGridItem,
  SceneCSSGridLayout,
  SceneDataNode,
  SceneFlexItem,
  SceneFlexItemLike,
  SceneFlexLayout,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
  SceneVariableSet,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { Button, Field, TooltipDisplayMode, useStyles2 } from '@grafana/ui';

import { BreakdownLabelSelector } from '../../BreakdownLabelSelector';
import { explorationDS, VAR_ATTRIBUTE_GROUP_BY, VAR_FILTERS, VAR_FILTERS_EXPR } from '../../../../utils/shared';

import { ByFrameRepeater } from '../../ByFrameRepeater';
import { LayoutSwitcher } from '../../LayoutSwitcher';
import { TracesByServiceScene } from '../TracesByServiceScene';
import { getColorByIndex } from '../../../../utils/utils';
import { AddToFiltersGraphAction } from '../../AddToFiltersGraphAction';
import { VARIABLE_ALL_VALUE } from '../../../../constants';

export interface AttributesBreakdownSceneState extends SceneObjectState {
  body?: SceneObject;
}

const MAX_PANELS_IN_ALL_ATTRIBUTES_BREAKDOWN = 100;
const ignoredAttributes = ['duration', 'traceDuration'];

export class AttributesBreakdown extends SceneObjectBase<AttributesBreakdownSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_FILTERS],
    onReferencedVariableValueChanged: this.onReferencedVariableValueChanged.bind(this),
  });

  constructor(state: Partial<AttributesBreakdownSceneState>) {
    super({
      $variables:
        state.$variables ??
        new SceneVariableSet({
          variables: [new CustomVariable({ name: VAR_ATTRIBUTE_GROUP_BY, defaultToAll: true, includeAll: true })],
        }),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    const variable = this.getVariable();

    variable.subscribeToState(() => {
      this.updateBody(variable);
    });

    sceneGraph.getAncestor(this, TracesByServiceScene).subscribeToState(() => {
      this.updateBody(variable);
    });

    this.updateBody(variable);
  }

  private getVariable(): CustomVariable {
    const variable = sceneGraph.lookupVariable(VAR_ATTRIBUTE_GROUP_BY, this)!;
    if (!(variable instanceof CustomVariable)) {
      throw new Error('Group by variable not found');
    }

    return variable;
  }

  private onReferencedVariableValueChanged() {
    const variable = this.getVariable();
    variable.changeValueTo(VARIABLE_ALL_VALUE);
    this.updateBody(variable);
  }

  private getAttributes() {
    const allAttributes = sceneGraph.getAncestor(this, TracesByServiceScene).state.attributes;
    return allAttributes?.filter((attr) => !ignoredAttributes.includes(attr));
  }

  private async updateBody(variable: CustomVariable) {
    this.setState({
      body:
        variable.hasAllValue() || variable.getValue() === VARIABLE_ALL_VALUE
          ? buildAllLayout(this.getAttributes())
          : buildNormalLayout(variable),
    });
  }

  public onChange = (value?: string) => {
    if (!value) {
      return;
    }

    const variable = this.getVariable();

    variable.changeValueTo(value);
  };

  public static Component = ({ model }: SceneComponentProps<AttributesBreakdown>) => {
    const { body } = model.useState();
    const variable = model.getVariable();
    const { attributes } = sceneGraph.getAncestor(model, TracesByServiceScene).useState();
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        <div className={styles.controls}>
          {attributes?.length && (
            <div className={styles.controlsLeft}>
              <Field label="By attribute">
                <BreakdownLabelSelector
                  options={getAttributesAsOptions(attributes)}
                  value={variable.getValueText()}
                  onChange={model.onChange}
                />
              </Field>
            </div>
          )}
          {body instanceof LayoutSwitcher && (
            <div className={styles.controlsRight}>
              <body.Selector model={body} />
            </div>
          )}
        </div>
        <div className={styles.content}>{body && <body.Component model={body} />}</div>
      </div>
    );
  };
}

function getAttributesAsOptions(attributes: string[]) {
  return attributes.map((attribute) => ({ label: attribute, value: attribute }));
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      flexGrow: 1,
      display: 'flex',
      minHeight: '100%',
      flexDirection: 'column',
    }),
    content: css({
      flexGrow: 1,
      display: 'flex',
      paddingTop: theme.spacing(0),
    }),
    controls: css({
      flexGrow: 0,
      display: 'flex',
      alignItems: 'top',
      gap: theme.spacing(2),
    }),
    controlsRight: css({
      flexGrow: 0,
      display: 'flex',
      justifyContent: 'flex-end',
    }),
    controlsLeft: css({
      display: 'flex',
      justifyContent: 'flex-left',
      justifyItems: 'left',
      width: '100%',
      flexDirection: 'column',
    }),
  };
}

function getExpr(attr: string) {
  return `{${VAR_FILTERS_EXPR}} | rate() by(${attr})`;
}

function buildQuery(tagKey: string) {
  return {
    refId: 'A',
    query: getExpr(tagKey),
    queryType: 'traceql',
    tableType: 'spans',
    limit: 100,
    spss: 10,
    filters: [],
  };
}

const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

function buildNormalLayout(variable: CustomVariable) {
  const query = buildQuery(variable.getValueText());

  return new LayoutSwitcher({
    $data: new SceneQueryRunner({
      datasource: explorationDS,
      maxDataPoints: 300,
      queries: [query],
    }),
    options: [
      { value: 'single', label: 'Single' },
      { value: 'grid', label: 'Grid' },
      { value: 'rows', label: 'Rows' },
    ],
    active: 'grid',
    layouts: [
      new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            minHeight: 300,
            body: PanelBuilders.timeseries().build(),
          }),
        ],
      }),
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: GRID_TEMPLATE_COLUMNS,
          autoRows: '200px',
          children: [],
        }),
        getLayoutChild: getLayoutChild(getLabelValue),
      }),
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: '1fr',
          autoRows: '200px',
          children: [],
        }),
        getLayoutChild: getLayoutChild(getLabelValue),
      }),
    ],
  });
}

function buildAllLayout(attributes?: string[]) {
  const children: SceneFlexItemLike[] = [];

  if (!attributes) {
    return new SceneFlexLayout({ children });
  }

  for (const attribute of attributes) {
    if (children.length === MAX_PANELS_IN_ALL_ATTRIBUTES_BREAKDOWN) {
      break;
    }

    const vizPanel = PanelBuilders.timeseries()
      .setTitle(attribute)
      .setData(
        new SceneQueryRunner({
          maxDataPoints: 250,
          datasource: explorationDS,
          queries: [buildQuery(attribute)],
        })
      )
      .setHeaderActions(new SelectAttributeAction({ attribute: attribute }))
      .build();

    vizPanel.addActivationHandler(() => {
      vizPanel.onOptionsChange(
        PanelOptionsBuilders.timeseries()
          .setOption('tooltip', { mode: TooltipDisplayMode.Multi })
          .setOption('legend', { showLegend: false })
          .build()
      );
    });

    children.push(
      new SceneCSSGridItem({
        body: vizPanel,
      })
    );
  }
  return new LayoutSwitcher({
    active: 'grid',
    options: [
      { value: 'grid', label: 'Grid' },
      { value: 'rows', label: 'Rows' },
    ],
    layouts: [
      new SceneCSSGridLayout({
        templateColumns: GRID_TEMPLATE_COLUMNS,
        autoRows: '200px',
        children: children,
        isLazy: true,
      }),
      new SceneCSSGridLayout({
        templateColumns: '1fr',
        autoRows: '200px',
        // Clone children since a scene object can only have one parent at a time
        children: children.map((c) => c.clone()),
        isLazy: true,
      }),
    ],
  });
}

function getLabelValue(frame: DataFrame) {
  const labels = frame.fields[1]?.labels;

  if (!labels) {
    return 'No labels';
  }

  const keys = Object.keys(labels);
  if (keys.length === 0) {
    return 'No labels';
  }

  return labels[keys[0]];
}

export function getLayoutChild(getTitle: (df: DataFrame) => string) {
  return (data: PanelData, frame: DataFrame, frameIndex: number) => {
    const panel = PanelBuilders.timeseries() //
      .setOption('legend', { showLegend: true })
      .setCustomFieldConfig('fillOpacity', 9)
      .setTitle(getTitle(frame))
      .setData(new SceneDataNode({ data: { ...data, series: [frame] } }))
      .setColor({ mode: 'fixed', fixedColor: getColorByIndex(frameIndex) })
      .setHeaderActions(new AddToFiltersGraphAction({ frame, variableName: VAR_FILTERS }));
    return new SceneCSSGridItem({
      body: panel.build(),
    });
  };
}

interface SelectAttributeActionState extends SceneObjectState {
  attribute: string;
}
export class SelectAttributeAction extends SceneObjectBase<SelectAttributeActionState> {
  public onClick = () => {
    const attributesBreakdownScene = sceneGraph.getAncestor(this, AttributesBreakdown);
    attributesBreakdownScene.onChange(this.state.attribute);
  };

  public static Component = ({ model }: SceneComponentProps<AddToFiltersGraphAction>) => {
    return (
      <Button variant="secondary" size="sm" fill="solid" onClick={model.onClick}>
        Select
      </Button>
    );
  };
}

export function buildAttributesBreakdownActionScene() {
  return new SceneFlexItem({
    body: new AttributesBreakdown({}),
  });
}
