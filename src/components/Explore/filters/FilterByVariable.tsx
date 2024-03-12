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
  return filters.map((filter) => renderFilter(filter)).join('&&');
}

function renderFilter(filter: AdHocVariableFilter) {
  return `${filter.key}${filter.operator}"${filter.value}"`;
}
