import { css } from '@emotion/css';
import React, { useEffect, useMemo, useState } from 'react';

import { AdHocVariableFilter, GrafanaTheme2, SelectableValue, toOption } from '@grafana/data';
import { Button, Select, useStyles2 } from '@grafana/ui';

import { FilterByVariable } from './FilterByVariable';

interface Props {
  filter: AdHocVariableFilter;
  model: FilterByVariable;
}

export function FilterRenderer({ filter, model }: Props) {
  const styles = useStyles2(getStyles);

  const [state, setState] = useState<{
    keys?: SelectableValue[];
    values?: SelectableValue[];
    isKeysLoading?: boolean;
    isValuesLoading?: boolean;
  }>({});

  const key = filter.key !== '' ? state?.keys?.find((key) => key.value === filter.key) ?? toOption(filter.key) : null;
  const value = filter.value !== '' ? toOption(filter.value) : null;

  const operators = useMemo(() => {
    const operators = model._getOperators();
    return operators;
  }, [model]);

  useEffect(() => {
    async function updateKeys() {
      setState({ ...state, isKeysLoading: true });
      const keys = await model._getKeys(filter.key);
      setState({ ...state, isKeysLoading: false, keys });
    }

    if (key && state.keys === undefined && !state.isKeysLoading) {
      updateKeys();
    }
  }, [filter, key, model, state]);

  const keySelect = (
    <Select
      width='auto'
      value={key}
      placeholder={'Select label'}
      options={state.keys}
      onChange={(v) => model._updateFilter(filter, 'key', v.value)}
      isLoading={state.isKeysLoading}
      onOpenMenu={async () => {
        setState({ ...state, isKeysLoading: true });
        const keys = await model._getKeys(filter.key);
        setState({ ...state, isKeysLoading: false, keys });
      }}
    />
  );

  const valueSelect = (
    <Select
      width='auto'
      value={value}
      placeholder={'value'}
      options={state.values}
      onChange={(v) => model._updateFilter(filter, 'value', v.value)}
      isLoading={state.isValuesLoading}
      onOpenMenu={async () => {
        setState({ ...state, isValuesLoading: true });
        const values = await model._getValuesFor(filter);
        setState({ ...state, isValuesLoading: false, values });
      }}
    />
  );

  return (
    <>
      {keySelect}
      <Select
        width='auto'
        value={filter.operator}
        disabled={model.state.readOnly}
        options={operators}
        onChange={(v) => model._updateFilter(filter, 'operator', v.value)}
      />
      {valueSelect}
      <Button
        variant='secondary'
        aria-label='Remove filter'
        title='Remove filter'
        className={styles.removeButton}
        icon='times'
        onClick={() => model._removeFilter(filter)}
      />
    </>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  removeButton: css({
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
  }),
});
