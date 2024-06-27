import { css } from '@emotion/css';
import React from 'react';

import { DataFrame, FieldType, GrafanaTheme2, Field } from '@grafana/data';
import {
  CustomVariable,
  SceneComponentProps,
  SceneDataTransformer,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
  SceneVariableSet,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { Button, useStyles2 } from '@grafana/ui';

import { GroupBySelector } from '../../../GroupBySelector';
import {
  VAR_GROUPBY,
  VAR_FILTERS,
  ignoredAttributes,
  explorationDS,
  VAR_FILTERS_EXPR,
  getAttributesAsOptions,
} from '../../../../../utils/shared';

import { LayoutSwitcher } from '../../../LayoutSwitcher';
import { TracesByServiceScene } from '../../TracesByServiceScene';
import { AddToFiltersGraphAction } from '../../../AddToFiltersGraphAction';
import { ALL } from '../../../../../constants';
import { TraceExploration } from 'pages/Explore';
import { AllLayoutRunners, getAllLayoutRunners } from 'pages/Explore/SelectStartingPointScene';
import { map, Observable } from 'rxjs';
import { buildAllComparisonLayout } from '../../../layouts/allComparison';
// eslint-disable-next-line no-restricted-imports
import { duration } from 'moment';
import { comparisonQuery } from '../../../queries/comparisonQuery';
import { buildAttributeComparison } from '../../../layouts/attributeComparison';
import { getGroupByVariable } from 'utils/utils';

export interface AttributesComparisonSceneState extends SceneObjectState {
  body?: SceneObject;
  allLayoutRunners?: any;
}

export class AttributesComparisonScene extends SceneObjectBase<AttributesComparisonSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_FILTERS],
    onReferencedVariableValueChanged: this.onReferencedVariableValueChanged.bind(this),
  });

  constructor(state: Partial<AttributesComparisonSceneState>) {
    super({
      $variables:
        state.$variables ??
        new SceneVariableSet({
          variables: [new CustomVariable({ name: VAR_GROUPBY, defaultToAll: true, includeAll: true })],
        }),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    const variable = getGroupByVariable(this);

    this.updateData();

    variable.subscribeToState(() => {
      this.updateBody(variable);
    });

    sceneGraph.getAncestor(this, TracesByServiceScene).subscribeToState(() => {
      this.updateBody(variable);
    });

    sceneGraph.getTimeRange(this).subscribeToState(() => {
      this.updateData();
    });

    this.updateBody(variable);
  }

  private updateData() {
    const byServiceScene = sceneGraph.getAncestor(this, TracesByServiceScene);
    const sceneTimeRange = sceneGraph.getTimeRange(this);
    const from = sceneTimeRange.state.value.from.unix();
    const to = sceneTimeRange.state.value.to.unix();

    this.setState({
      $data: new SceneDataTransformer({
        $data: new SceneQueryRunner({
          datasource: explorationDS,
          queries: [buildQuery(from, to, comparisonQuery(byServiceScene.state.selection))],
        }),
        transformations: [
          () => (source: Observable<DataFrame[]>) => {
            return source.pipe(
              map((data: DataFrame[]) => {
                const groupedFrames = groupFrameListByAttribute(data);
                return Object.entries(groupedFrames)
                  .map(([attribute, frames]) => frameGroupToDataframe(attribute, frames))
                  .sort((a, b) => {
                    const aCompare = a.fields[1].values
                      .map((val, i) => (val || 0) - (a.fields[2].values[i] || 0))
                      .reduce((acc, val) => acc + val, 0);
                    const bCompare = b.fields[1].values
                      .map((val, i) => (val || 0) - (b.fields[2].values[i] || 0))
                      .reduce((acc, val) => acc + val, 0);
                    return aCompare - bCompare;
                  });
              })
            );
          },
        ],
      }),
    });
  }

  private onReferencedVariableValueChanged() {
    const variable = getGroupByVariable(this);
    variable.changeValueTo(ALL);
    this.updateBody(variable);
  }

  private getAttributes() {
    const allAttributes = sceneGraph.getAncestor(this, TracesByServiceScene).state.attributes;
    return allAttributes?.filter((attr) => !ignoredAttributes.includes(attr));
  }

  private async updateBody(variable: CustomVariable) {
    const allLayoutRunners = getAllLayoutRunners(
      sceneGraph.getAncestor(this, TraceExploration),
      this.getAttributes() ?? []
    );
    this.setState({ allLayoutRunners });
    this.setBody(allLayoutRunners, variable);
  }

  private setBody = (runners: AllLayoutRunners[], variable: CustomVariable) => {
    this.setState({
      body:
        variable.hasAllValue() || variable.getValue() === ALL
          ? buildAllComparisonLayout((frame) => new SelectAttributeAction({ attribute: frame.name }))
          : buildAttributeComparison(this, variable, (frame: DataFrame) => [
              new AddToFiltersGraphAction({ frame, variableName: VAR_FILTERS, labelKey: variable.getValueText() }),
            ]),
    });
  };

  public onChange = (value: string) => {
    const variable = getGroupByVariable(this);
    variable.changeValueTo(value);
  };

  public static Component = ({ model }: SceneComponentProps<AttributesComparisonScene>) => {
    const { body } = model.useState();
    const variable = getGroupByVariable(model);
    const { attributes } = sceneGraph.getAncestor(model, TracesByServiceScene).useState();
    const styles = useStyles2(getStyles);
    const radioAttributes = ['name', 'rootName', 'rootServiceName', 'status', 'span.http.status_code'];

    return (
      <div className={styles.container}>
        <div className={styles.controls}>
          {attributes?.length && (
            <div className={styles.controlsLeft}>
              <GroupBySelector
                options={getAttributesAsOptions(attributes)}
                radioAttributes={radioAttributes}
                value={variable.getValueText()}
                onChange={model.onChange}
              />
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

export function buildQuery(from: number, to: number, compareQuery: string) {
  const dur = duration(to - from, 's');
  const durString = `${dur.asSeconds()}s`;
  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR}} | compare(${compareQuery})`,
    step: durString,
    queryType: 'traceql',
    tableType: 'spans',
    limit: 100,
    spss: 10,
    filters: [],
  };
}

const groupFrameListByAttribute = (frames: DataFrame[]) => {
  return frames.reduce((acc: Record<string, DataFrame[]>, series) => {
    const numberField = series.fields.find((field) => field.type === 'number');
    const nonInternalKey = Object.keys(numberField?.labels || {}).find((key) => !key.startsWith('__'));
    if (nonInternalKey) {
      acc[nonInternalKey] = [...(acc[nonInternalKey] || []), series];
    }
    return acc;
  }, {});
};

const frameGroupToDataframe = (attribute: string, frames: DataFrame[]): DataFrame => {
  const newFrame: DataFrame = {
    name: attribute,
    refId: attribute,
    fields: [],
    length: 0,
  };

  const valueNameField: Field = {
    name: 'Value',
    type: FieldType.string,
    values: [],
    config: {},
  };
  const baselineField: Field = {
    name: 'Baseline',
    type: FieldType.number,
    values: [],
    config: {},
  };
  const selectionField: Field = {
    name: 'Selection',
    type: FieldType.number,
    values: [],
    config: {},
  };

  const values = frames.reduce((acc: Record<string, Field[]>, frame) => {
    const numberField = frame.fields.find((field) => field.type === 'number');
    const val = numberField?.labels?.[attribute];
    if (val) {
      acc[val] = [...(acc[val] || []), numberField];
    }
    return acc;
  }, {});

  const baselineTotal = getValueForMetaType(frames, '"baseline_total"');
  const selectionTotal = getValueForMetaType(frames, '"selection_total"');

  newFrame.length = Object.keys(values).length;

  Object.entries(values).forEach(([value, fields]) => {
    valueNameField.values.push(value);
    baselineField.values.push(
      fields.find((field) => field.labels?.['__meta_type'] === '"baseline"')?.values[0] / baselineTotal
    );
    selectionField.values.push(
      fields.find((field) => field.labels?.['__meta_type'] === '"selection"')?.values[0] / selectionTotal
    );
  });
  newFrame.fields = [valueNameField, baselineField, selectionField];
  return newFrame;
};

function getValueForMetaType(frames: DataFrame[], metaType: string) {
  return frames.reduce((currentValue, frame) => {
    const field = frame.fields.find((f) => f.type === 'number');
    if (field?.labels?.['__meta_type'] === metaType) {
      return field.values[0];
    }
    return currentValue;
  }, 1);
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

interface SelectAttributeActionState extends SceneObjectState {
  attribute?: string;
}

export class SelectAttributeAction extends SceneObjectBase<SelectAttributeActionState> {
  public onClick = () => {
    const attributesComparisonScene = sceneGraph.getAncestor(this, AttributesComparisonScene);
    attributesComparisonScene.onChange(this.state.attribute || '');
  };

  public static Component = ({ model }: SceneComponentProps<SelectAttributeAction>) => {
    if (!model.state.attribute) {
      return null;
    }

    return (
      <Button variant="secondary" size="sm" fill="solid" onClick={model.onClick}>
        Select
      </Button>
    );
  };
}
