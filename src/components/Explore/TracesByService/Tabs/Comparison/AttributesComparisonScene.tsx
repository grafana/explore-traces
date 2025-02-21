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
  VariableDependencyConfig,
} from '@grafana/scenes';
import { getTheme, useStyles2 } from '@grafana/ui';

import { GroupBySelector } from '../../../GroupBySelector';
import { VAR_FILTERS, explorationDS, VAR_FILTERS_EXPR, ALL, radioAttributesSpan } from '../../../../../utils/shared';

import { LayoutSwitcher } from '../../../LayoutSwitcher';
import { AddToFiltersAction } from '../../../actions/AddToFiltersAction';
import { map, Observable } from 'rxjs';
import { BaselineColor, buildAllComparisonLayout, SelectionColor } from '../../../layouts/allComparison';
// eslint-disable-next-line no-restricted-imports
import { duration } from 'moment';
import { comparisonQuery } from '../../../queries/comparisonQuery';
import { buildAttributeComparison } from '../../../layouts/attributeComparison';
import {
  getAttributesAsOptions,
  getGroupByVariable,
  getTraceByServiceScene,
  getTraceExplorationScene,
} from 'utils/utils';
import { InspectAttributeAction } from 'components/Explore/actions/InspectAttributeAction';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../../../utils/analytics';
import { computeHighestDifference } from '../../../../../utils/comparison';
import { AttributesDescription } from '../Breakdown/AttributesDescription';
import { isEqual } from 'lodash';

export interface AttributesComparisonSceneState extends SceneObjectState {
  body?: SceneObject;
}

export class AttributesComparisonScene extends SceneObjectBase<AttributesComparisonSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_FILTERS],
    onReferencedVariableValueChanged: this.onReferencedVariableValueChanged.bind(this),
  });

  constructor(state: Partial<AttributesComparisonSceneState>) {
    super({
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    const variable = getGroupByVariable(this);

    variable.changeValueTo(ALL);

    this.updateData();

    variable.subscribeToState((newState, prevState) => {
      if (newState.value !== prevState.value) {
        this.setBody(variable);
      }
    });

    getTraceByServiceScene(this).subscribeToState((newState, prevState) => {
      if (!isEqual(newState.selection, prevState.selection)) {
        this.updateData();
        this.setBody(variable);
      }
    });

    sceneGraph.getTimeRange(this).subscribeToState(() => {
      this.updateData();
    });

    this.setBody(variable);
  }

  private updateData() {
    const byServiceScene = getTraceByServiceScene(this);
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
                    const aCompare = computeHighestDifference(a);
                    const bCompare = computeHighestDifference(b);
                    return bCompare.maxDifference - aCompare.maxDifference;
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
    this.setBody(variable);
  }

  private onAddToFiltersClick(payload: any) {
    reportAppInteraction(
      USER_EVENTS_PAGES.analyse_traces,
      USER_EVENTS_ACTIONS.analyse_traces.comparison_add_to_filters_clicked,
      payload
    );
  }

  private setBody = (variable: CustomVariable) => {
    const traceExploration = getTraceExplorationScene(this);
    this.setState({
      body:
        variable.hasAllValue() || variable.getValue() === ALL
          ? buildAllComparisonLayout(
              (frame) =>
                new InspectAttributeAction({
                  attribute: frame.name,
                  onClick: () => this.onChange(frame.name || ''),
                }),
              traceExploration.getMetricFunction()
            )
          : buildAttributeComparison(
              this,
              variable,
              (frame: DataFrame) => [
                new AddToFiltersAction({
                  frame,
                  labelKey: variable.getValueText(),
                  onClick: this.onAddToFiltersClick,
                }),
              ],
              traceExploration.getMetricFunction()
            ),
    });
  };

  public onChange = (value: string, ignore?: boolean) => {
    const variable = getGroupByVariable(this);
    variable.changeValueTo(value, undefined, !ignore);

    reportAppInteraction(
      USER_EVENTS_PAGES.analyse_traces,
      USER_EVENTS_ACTIONS.analyse_traces.select_attribute_in_comparison_clicked,
      { value }
    );
  };

  public static Component = ({ model }: SceneComponentProps<AttributesComparisonScene>) => {
    const { body } = model.useState();
    const variable = getGroupByVariable(model);
    const traceExploration = getTraceExplorationScene(model);
    const { attributes } = getTraceByServiceScene(model).useState();
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        <AttributesDescription
          description="Attributes are ordered by the difference between the baseline and selection values for each value."
          tags={[
            {
              label: 'Baseline',
              color:
                traceExploration.getMetricFunction() === 'duration'
                  ? BaselineColor
                  : getTheme().visualization.getColorByName('semi-dark-green'),
            },
            {
              label: 'Selection',
              color:
                traceExploration.getMetricFunction() === 'duration'
                  ? SelectionColor
                  : getTheme().visualization.getColorByName('semi-dark-red'),
            },
          ]}
        />

        <div className={styles.controls}>
          {attributes?.length && (
            <div className={styles.controlsLeft}>
              <GroupBySelector
                options={getAttributesAsOptions(attributes)}
                radioAttributes={radioAttributesSpan}
                value={variable.getValueText()}
                onChange={model.onChange}
                showAll={true}
                model={model}
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
    labels: { [attribute]: attribute },
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
