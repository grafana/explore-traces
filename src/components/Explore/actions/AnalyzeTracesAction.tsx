import React from 'react';

import { SceneObjectState, SceneObjectBase, SceneComponentProps } from '@grafana/scenes';
import { Button } from '@grafana/ui';

import { StartingPointSelectedEvent } from '../../../utils/shared';
import { getFiltersVariable, getGroupByVariable } from 'utils/utils';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';

export interface AnalyzeTracesActionState extends SceneObjectState {
  attribute: string;
}

export class AnalyzeTracesAction extends SceneObjectBase<AnalyzeTracesActionState> {
  public onClick = () => {
    if (!this.state.attribute) {
      return;
    }

    const groupByVariable = getGroupByVariable(this);
    const filtersVariable = getFiltersVariable(this);

    // ensure we set the new filter with latest value
    // and remove any existing filter for the same key
    const filtersWithoutNew = filtersVariable.state.filters.filter(
      (f) => f.key !== groupByVariable.getValue().toString()
    );

    reportAppInteraction(USER_EVENTS_PAGES.starting_page, USER_EVENTS_ACTIONS.starting_page.analyze_traces_clicked, {
      currentFiltersLength: filtersWithoutNew.length,
      key: groupByVariable.getValue().toString(),
      operator: '=',
      value: this.state.attribute,
    });

    filtersVariable.setState({
      filters: [
        ...filtersWithoutNew,
        {
          key: groupByVariable.getValue().toString(),
          operator: '=',
          value: this.state.attribute,
        },
      ],
    });
    this.publishEvent(new StartingPointSelectedEvent(), true);
  };

  public static Component = ({ model }: SceneComponentProps<AnalyzeTracesAction>) => {
    return (
      <Button variant="secondary" size="sm" fill="solid" onClick={model.onClick}>
        Analyze Traces
      </Button>
    );
  };
}
