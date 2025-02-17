import React from 'react';

import { AdHocVariableFilter } from '@grafana/data';
import { AdHocFiltersVariable, SceneComponentProps } from '@grafana/scenes';
import { VariableHide } from '@grafana/schema';

import { RESOURCE_ATTR, SPAN_ATTR, VAR_HOME_FILTER, explorationDS } from 'utils/shared';
import { HomeFilter } from './HomeFilter';
import { isNumber } from 'utils/utils';

export type HomeFilterVariableState = ConstructorParameters<typeof AdHocFiltersVariable>[0] & {
  initialFilters: AdHocVariableFilter[];
};

export class HomeFilterVariable extends AdHocFiltersVariable {
  static Component = ({ model }: SceneComponentProps<HomeFilterVariable>) => <HomeFilter model={model} />;

  constructor({ initialFilters }: HomeFilterVariableState) {
    super({
      hide: VariableHide.hideLabel,
      name: VAR_HOME_FILTER,
      datasource: explorationDS,
      layout: 'horizontal',
      filters: initialFilters,
    });
  }
}

export const renderFilter = (filter: AdHocVariableFilter) => {
  let val = filter.value;
  if (val === undefined || val === null || val === '') {
    return '';
  }

  if (!isNumber.test(val) && (filter.key.includes(RESOURCE_ATTR) || filter.key.includes(SPAN_ATTR))) {
    if (typeof val === 'string' && !val.startsWith('"') && !val.endsWith('"')) {
      val = `"${val}"`;
    }
  }

  return `&& ${filter.key}${filter.operator}${val}`;
}
