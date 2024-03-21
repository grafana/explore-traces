import React from 'react';

import { AdHocVariableFilter } from '@grafana/data';
import {
  AdHocFiltersVariable,
  SceneComponentProps,
} from '@grafana/scenes';
import { VariableHide } from '@grafana/schema';

import { FilterSetRenderer } from './FilterSetRenderer';
import { VAR_FILTERS, explorationDS } from 'utils/shared';

export type FilterByVariableState = ConstructorParameters<typeof AdHocFiltersVariable>[0] & {
  initialFilters?: AdHocVariableFilter[];
};

export class FilterByVariable extends AdHocFiltersVariable {
  static Component = ({ model }: SceneComponentProps<FilterByVariable>) => <FilterSetRenderer model={model} />;

  constructor({ initialFilters }: FilterByVariableState) {
    super({
      hide: VariableHide.hideLabel,
      name: VAR_FILTERS,
      datasource: explorationDS,
      layout: 'horizontal',
      filters: initialFilters ?? [],
      expressionBuilder: renderTraceQLLabelFilters,
    });
  }
}

export function renderTraceQLLabelFilters(filters: AdHocVariableFilter[]) {
  const prefix = filters.length ? ' && ' : ''; // Add '&&' if there are filters to separate from the rest of the query.
  return prefix + filters.map((filter) => renderFilter(filter)).join('&&');
}

function renderFilter(filter: AdHocVariableFilter) {
  let val = filter.value;
  // Add quotes if it's coming from the filter input and it's not already quoted. 
  // Adding a filter from a time series graph already has quotes. This should be handled better.
  if (typeof val === 'string' && !val.startsWith('"') && !val.endsWith('"')) {
    val = `"${val}"`;
  }
  
  return `${filter.key}${filter.operator}${val}`;
}
