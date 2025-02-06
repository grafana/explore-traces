import { css } from '@emotion/css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Select, useStyles2 } from '@grafana/ui';
import { EVENT_ATTR, EVENT_INTRINSIC, ignoredAttributes, ignoredAttributesHomeFilter, RESOURCE_ATTR, SPAN_ATTR } from 'utils/shared';
import { HomeFilterVariable } from './HomeFilterVariable';
import { getDatasourceVariable } from 'utils/utils';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from 'utils/analytics';

type Props = {
  model: HomeFilterVariable;
};

export function HomeFilter(props: Props) {
  const { model } = props;
  const { filters } = model.useState();
  const dsVariable = getDatasourceVariable(model).useState();
  const styles = useStyles2(getStyles);

  const [state, setState] = useState<{
    keys?: SelectableValue[];
    values?: SelectableValue[];
    isKeysLoading?: boolean;
    isValuesLoading?: boolean;
  }>({});
  
  const updateKeys = useCallback(async () => {
    setState({ ...state, isKeysLoading: true });
    const keys = await model._getKeys(filters[0].key);
    setState({ ...state, isKeysLoading: false, keys });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateKeys();
  }, [dsVariable, updateKeys]);
  
  const keyOptions = useMemo(() => {
    if (!state.keys) {
      return [];
    }

    const resourceAttributes = state.keys.filter((k) => k.value?.includes(RESOURCE_ATTR));
    const spanAttributes = state.keys.filter((k) => k.value?.includes(SPAN_ATTR));
    const intrinsicAttributes = state.keys.filter((k) => {
      return !k.value?.includes(RESOURCE_ATTR) && !k.value?.includes(SPAN_ATTR)
        && !k.value?.includes(EVENT_ATTR) && !k.value?.includes(EVENT_INTRINSIC)
        && ignoredAttributes.concat(ignoredAttributesHomeFilter).indexOf(k.value!) === -1;
    })

    return [...resourceAttributes, ...spanAttributes, ...intrinsicAttributes];
  }, [state.keys]);

  const valueOptions = useMemo(() => {
    if (!state.values) {
      return [];
    }

    return state.values.sort((a, b) => (a.label ?? '').localeCompare((b.label ?? '')));
  }, [state.values]);

  return (
    <div className={styles.container}>
      <Select
        className={styles.select}
        value={(filters.length > 0 && filters?.[0].key) ?? ''}
        placeholder={'attribute'}
        options={keyOptions}
        onChange={(v) => { 
          reportAppInteraction(USER_EVENTS_PAGES.home, USER_EVENTS_ACTIONS.home.filter_changed, {
            type: 'key'
          });
          model._updateFilter(filters[0], { key: v?.value ?? '', value: '' })
        }}
        isLoading={state.isKeysLoading}
        virtualized
      />
      <Select        
        className={styles.select}
        key={`${(filters.length > 0 && filters?.[0].value) ?? ''}`}
        value={(filters.length > 0 && filters?.[0].value) ?? ''}
        placeholder={'value'}
        options={valueOptions}
        onChange={(v) => {
          reportAppInteraction(USER_EVENTS_PAGES.home, USER_EVENTS_ACTIONS.home.filter_changed, {
            type: 'value'
          });
          model._updateFilter(filters[0], { value: v?.value ?? '' })
        }}
        isLoading={state.isValuesLoading}
        onOpenMenu={async () => {
          setState({ ...state, isValuesLoading: true, values: [] });
          const values = await model._getValuesFor(filters[0]);
          setState({ ...state, isValuesLoading: false, values });
        }}
        virtualized
        isClearable
      />
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      gap: theme.spacing(1),
    }),
    select: css({
      width: `max-content !important`,
    }),
  };
}
