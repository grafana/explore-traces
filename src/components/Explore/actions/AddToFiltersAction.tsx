import React from 'react';

import { DataFrame } from '@grafana/data';
import { SceneObjectState, SceneObjectBase, SceneComponentProps, AdHocFiltersVariable } from '@grafana/scenes';
import { Button } from '@grafana/ui';
import { getFiltersVariable, getLabelValue } from '../../../utils/utils';
import {
  reportAppInteraction,
  USER_EVENTS_ACTIONS,
  USER_EVENTS_PAGES,
  UserEventPagesType,
} from '../../../utils/analytics';

export interface AddToFiltersActionState extends SceneObjectState {
  frame: DataFrame;
  pageForReporting: UserEventPagesType;
  labelKey?: string;
}

export class AddToFiltersAction extends SceneObjectBase<AddToFiltersActionState> {
  public onClick = () => {
    const variable = getFiltersVariable(this);

    const labels = this.state.frame.fields.find((f) => f.labels)?.labels ?? {};
    if (this.state.labelKey) {
      if (!labels[this.state.labelKey]) {
        return;
      }
    } else {
      if (Object.keys(labels).length !== 1) {
        return;
      }
    }

    const labelName = this.state.labelKey ?? Object.keys(labels)[0];
    const value = getLabelValue(this.state.frame, this.state.labelKey);

    addToFilters(variable, labelName, value);

    reportAppInteraction(
      USER_EVENTS_PAGES[this.state.pageForReporting],
      USER_EVENTS_ACTIONS[this.state.pageForReporting].add_to_filters_clicked,
      {
        labelName,
        value,
      }
    );
  };

  public static Component = ({ model }: SceneComponentProps<AddToFiltersAction>) => {
    return (
      <Button variant="primary" size="sm" fill="text" onClick={model.onClick} icon={'search-plus'}>
        Add to filters
      </Button>
    );
  };
}

export const addToFilters = (variable: AdHocFiltersVariable, label: string, value: string) => {
  // ensure we set the new filter with latest value
  // and remove any existing filter for the same key
  const filtersWithoutNew = variable.state.filters.filter((f) => f.key !== label);

  variable.setState({
    filters: [
      ...filtersWithoutNew,
      {
        key: label,
        operator: '=',
        value: value,
      },
    ],
  });
};
