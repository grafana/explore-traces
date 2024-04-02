import { css } from '@emotion/css';
import React, { useEffect, useMemo, useState } from 'react';

import { AdHocVariableFilter, GrafanaTheme2, SelectableValue, toOption } from '@grafana/data';
import { Button, Select, SelectBaseProps, useStyles2 } from '@grafana/ui';

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
    <BaseSelect
      value={key}
      placeholder={'Select attribute'}
      options={state.keys}
      onChange={(v) => model._updateFilter(filter, 'key', v.value)}
      isLoading={state.isKeysLoading}
      className={styles.key}
      onOpenMenu={async () => {
        setState({ ...state, isKeysLoading: true });
        const keys = await model._getKeys(filter.key);
        setState({ ...state, isKeysLoading: false, keys });
      }}
    />
  );

  const valueSelect = (
    <BaseSelect
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
    <div className={styles.wrapper}>
      {keySelect}
      <BaseSelect
        value={filter.operator}
        disabled={model.state.readOnly}
        options={operators}
        onChange={(v) => model._updateFilter(filter, 'operator', v.value)}
      />
      {valueSelect}
      <Button
        variant="secondary"
        aria-label="Remove filter"
        title="Remove filter"
        className={styles.removeButton}
        icon="times"
        onClick={() => model._removeFilter(filter)}
      />
    </div>
  );
}

const BaseSelect = (props: SelectBaseProps<string>) => {
  const styles = useStyles2(getStyles);
  return (
    <Select
      width="auto"
      {...props}
      className={css(styles.control, props.className)}
      components={{
        IndicatorsContainer: () => null,
        IndicatorSeparator: () => null,
      }}
    />
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  removeButton: css({
    padding: '2px',
    height: 'fit-content',

    '& > svg': {
      margin: 0,
    },
  }),
  wrapper: css({
    display: 'flex',
    alignItems: 'center',

    '> div, > button': {
      borderRadius: 0,
    },
    '> div:first-child': {
      borderRadius: `${theme.shape.radius.default} 0 0 ${theme.shape.radius.default}`,
    },
    '> button': {
      borderRadius: `0 ${theme.shape.radius.default} ${theme.shape.radius.default} 0`,
    },
  }),
  control: css({
    padding: 0,
    border: `1px solid ${theme.colors.border.weak}`,
    background: '#CCCCDC0D',
    fontSize: 12,
    minHeight: 'auto',
    height: '22px',
    lineHeight: '18px',
    boxSizing: 'border-box',
    boxShadow: 'none',

    '& > div': {
      paddingLeft: '8px',
      paddingRight: '8px',
    },
  }),
  key: css({
    fontWeight: 500,
    background: theme.colors.border.weak,
    color: '#ffffff',
  }),
});
