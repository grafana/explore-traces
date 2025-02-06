import React from 'react';

import { AdHocVariableFilter } from '@grafana/data';
import { AdHocFiltersVariable, SceneComponentProps } from '@grafana/scenes';
import { VariableHide } from '@grafana/schema';

import { VAR_HOME_FILTER, explorationDS } from 'utils/shared';
import { HomeFilter } from './HomeFilter';

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
