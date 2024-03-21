import React from 'react';

import {
  AdHocFiltersVariable,
  SceneComponentProps,
} from '@grafana/scenes';
import { VariableHide } from '@grafana/schema';

import { VAR_DURATION, explorationDS } from 'utils/shared';
import { DurationRenderer, getFrom, getTo, getUnit } from './DurationRenderer';

export class DurationVariable extends AdHocFiltersVariable {
  static Component = ({ model }: SceneComponentProps<DurationVariable>) => <DurationRenderer model={model} />;

  constructor() {
    super({
      hide: VariableHide.hideLabel,
      name: VAR_DURATION,
      datasource: explorationDS,
      layout: 'horizontal',
      filters: [
        {
          key: 'from',
          operator: '>=',
          value: '0',
        },
        {
          key: 'to',
          operator: '<=',
          value: '500',
        },
        {
          key: 'unit',
          operator: '=',
          value: 'ms',
        }
      ],
      expressionBuilder: (filters => {
        if (filters.length) {
          const from = getFrom(filters);
          const to = getTo(filters);
          const unit = getUnit(filters);

          return `duration${from.operator}${from.value}${unit.value} && duration${to.operator}${to.value}${unit.value}`;
        }
        return '';
      })
    });
  }
}
