import { css } from '@emotion/css';
import React from 'react';

import { DataFrame, GrafanaTheme2, PanelData } from '@grafana/data';
import {
  CustomVariable,
  PanelBuilders,
  SceneComponentProps,
  SceneCSSGridItem,
  SceneCSSGridLayout,
  SceneDataNode,
  SceneFlexItem,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
  SceneVariableSet,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { Field, useStyles2 } from '@grafana/ui';

import { BreakdownLabelSelector } from '../../BreakdownLabelSelector';
import { explorationDS, VAR_ATTRIBUTE_GROUP_BY, VAR_FILTERS, VAR_FILTERS_EXPR } from '../../../../utils/shared';

import { ByFrameRepeater } from '../../ByFrameRepeater';
import { LayoutSwitcher } from '../../LayoutSwitcher';
import { TracesByServiceScene } from '../TracesByServiceScene';
import { getColorByIndex } from '../../../../utils/utils';
import { AddToFiltersGraphAction } from '../../AddToFiltersGraphAction';

export interface AttributesBreakdownSceneState extends SceneObjectState {
  body?: SceneObject;
}

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
          variables: [
            new CustomVariable({ name: VAR_ATTRIBUTE_GROUP_BY, defaultToAll: false, includeAll: false, text: 'name' }),
          ],
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
    variable.changeValueTo('name');
    this.updateBody(variable);
  }

  private async updateBody(variable: CustomVariable) {
    this.setState({ body: buildNormalLayout(variable) });
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
  console.log('variable.getValueText()', variable.getValueText(), variable);
  const query = buildQuery(variable.getValueText());

  return new LayoutSwitcher({
    $data: new SceneQueryRunner({
      datasource: explorationDS,
      maxDataPoints: 300,
      queries: [query],
    }),
    options: [
      { value: 'grid', label: 'Grid' },
      { value: 'rows', label: 'Rows' },
    ],
    active: 'grid',
    layouts: [
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

export function buildAttributesBreakdownActionScene() {
  return new SceneFlexItem({
    body: new AttributesBreakdown({}),
  });
}
