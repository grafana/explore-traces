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
  SceneTimeRangeLike,
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
} from '../../../../../utils/shared';

import { LayoutSwitcher } from '../../../LayoutSwitcher';
import { TracesByServiceScene } from '../../TracesByServiceScene';
import { AddToFiltersGraphAction } from '../../../AddToFiltersGraphAction';
import { VARIABLE_ALL_VALUE } from '../../../../../constants';
import { buildNormalLayout } from '../../../layouts/attributeBreakdown';
import { debounce } from 'lodash';
import { TraceExploration } from 'pages/Explore';
import { AllLayoutRunners, getAllLayoutRunners, filterAllLayoutRunners } from 'pages/Explore/SelectStartingPointScene';
import { map, Observable } from 'rxjs';
import { buildAllComparisonLayout } from '../../../layouts/allComparison';
import moment from 'moment';

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
    const variable = this.getVariable();

    this.updateData();

    variable.subscribeToState(() => {
      this.updateBody(variable);
    });

    this.subscribeToState((newState, prevState) => {
      if (newState.searchQuery !== prevState.searchQuery) {
        this.onSearchQueryChangeDebounced(newState.searchQuery ?? '');
      }
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
    this.setState({
      $data: new SceneDataTransformer({
        $data: new SceneQueryRunner({
          datasource: explorationDS,
          queries: [buildQuery(sceneGraph.getTimeRange(this))],
        }),
        transformations: [
          () => (source: Observable<DataFrame[]>) => {
            return source.pipe(
              map((data: DataFrame[]) => {
                const groupedFrames = groupFrameListByAttribute(data);
                return Object.entries(groupedFrames).map(([attribute, frames]) =>
                  frameGroupToDataframe(attribute, frames)
                );
              })
            );
          },
        ],
      }),
    });
  }

  private onSearchQueryChangeDebounced = debounce((searchQuery: string) => {
    const filtered = filterAllLayoutRunners(this.state.allLayoutRunners ?? [], searchQuery);
    this.setBody(filtered, this.getVariable());
  }, 250);

  private getVariable(): CustomVariable {
    const variable = sceneGraph.lookupVariable(VAR_GROUPBY, this)!;
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
        variable.hasAllValue() || variable.getValue() === VARIABLE_ALL_VALUE
          ? buildAllComparisonLayout((frame: DataFrame) => [
              new AddToFiltersGraphAction({ frame, variableName: VAR_FILTERS, labelKey: variable.getValueText() }),
            ])
          : buildNormalLayout(this, variable, (frame: DataFrame) => [
              new AddToFiltersGraphAction({ frame, variableName: VAR_FILTERS, labelKey: variable.getValueText() }),
            ]),
    });
  };

  public onChange = (value: string) => {
    const variable = this.getVariable();
    variable.changeValueTo(value);
  };

  public static Component = ({ model }: SceneComponentProps<AttributesComparisonScene>) => {
    const { body } = model.useState();
    const variable = model.getVariable();
    const { attributes } = sceneGraph.getAncestor(model, TracesByServiceScene).useState();
    const styles = useStyles2(getStyles);
    const mainAttributes = ['name', 'rootName', 'rootServiceName', 'status', 'span.http.status_code'];

    return (
      <div className={styles.container}>
        <div className={styles.controls}>
          {attributes?.length && (
            <div className={styles.controlsLeft}>
              <GroupBySelector
                options={getAttributesAsOptions(attributes)}
                mainAttributes={mainAttributes}
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

export function buildQuery(timeRange: SceneTimeRangeLike) {
  const dur = moment.duration(timeRange.state.value.to.subtract(timeRange.state.value.from).unix(), 's');
  const durString = `${dur.asSeconds()}s`;
  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR} && status != error} | compare({status = error})`,
    step: durString,
    queryType: 'traceql',
    tableType: 'spans',
    limit: 100,
    spss: 10,
    filters: [],
  };
}

function getAttributesAsOptions(attributes: string[]) {
  return attributes.map((attribute) => ({ label: attribute, value: attribute }));
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

  newFrame.length = Object.keys(values).length;

  Object.entries(values).forEach(([value, fields]) => {
    valueNameField.values.push(value);
    baselineField.values.push(fields.find((field) => field.labels?.['__meta_type'] === '"baseline"')?.values[0]);
    selectionField.values.push(fields.find((field) => field.labels?.['__meta_type'] === '"selection"')?.values[0]);
  });
  newFrame.fields = [valueNameField, baselineField, selectionField];
  return newFrame;
};

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
  attribute: string;
}
export class SelectAttributeAction extends SceneObjectBase<SelectAttributeActionState> {
  public onClick = () => {
    const attributesComparisonScene = sceneGraph.getAncestor(this, AttributesComparisonScene);
    attributesComparisonScene.onChange(this.state.attribute);
  };

  public static Component = ({ model }: SceneComponentProps<AddToFiltersGraphAction>) => {
    return (
      <Button variant="secondary" size="sm" fill="solid" onClick={model.onClick}>
        Select
      </Button>
    );
  };
}
