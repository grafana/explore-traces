import React from 'react';

import { AdHocVariableFilter, toOption } from '@grafana/data';
import { SceneComponentProps } from '@grafana/scenes';

import { FilterByVariable } from './FilterByVariable';

import { RangeSlider, Select, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';

export function DurationRenderer({ model }: SceneComponentProps<FilterByVariable>) {
  const { filters } = model.useState();
  const styles = useStyles2(getStyles);
  const fromValue = parseInt(getFrom(filters).value, 10);
  const toValue = parseInt(getTo(filters).value, 10);

  return (
    <div className={styles.container}>
      <RangeSlider
        min={0}
        max={1000}
        value={[fromValue, toValue]}
        onAfterChange={(v) => {
          if (v) {
            model._updateFilter(getFrom(filters), 'value', v[0].toString());
            model._updateFilter(getTo(filters), 'value', v[1].toString());
          }
        }}
      />
      <div className={styles.unit}>
        <Select
          value={getUnit(filters).value}
          options={[toOption('ms'), toOption('s'), toOption('m'), toOption('h')]}
          width="auto"
          onChange={(v) => {
            const unit = getUnit(filters);
            model._updateFilter(unit, 'value', v.value);
          }}
        />
      </div>
    </div>
  );
}

export const getFrom = (filters: AdHocVariableFilter[]) => filters.filter((f) => f.key === 'from')[0];
export const getTo = (filters: AdHocVariableFilter[]) => filters.filter((f) => f.key === 'to')[0];
export const getUnit = (filters: AdHocVariableFilter[]) => filters.filter((f) => f.key === 'unit')[0];

const getStyles = () => ({
  container: css({
    marginTop: '9px',
    width: '200px',
    display: 'flex',
  }),
  unit: css({
    margin: '0 -10px 0 15px',
    width: '105px',
  }),
});

