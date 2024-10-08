import React from 'react';

import { FilterByVariable } from './FilterByVariable';

import { FilterRenderer } from './FilterRenderer';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';

interface Props {
  model: FilterByVariable;
  otherFiltersLength: number;
}

export function AddFilter({ model, otherFiltersLength }: Props) {
  const { _wip } = model.useState();
  const styles = useStyles2(getStyles);

  const onClick = () => {
    reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.new_filter_added_manually);
    model._addWip();
  };

  if (!_wip) {
    return (
      <div className={styles.addFilterBar} onClick={onClick}>
        {otherFiltersLength === 0 ? 'Filter by attribute...' : undefined}
      </div>
    );
  }

  return <FilterRenderer filter={_wip} model={model} isWip={true} />;
}

const getStyles = () => ({
  addFilterBar: css({
    height: '100%',
    display: 'flex',
    flex: 1,
    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: '12px',
    color: '#7B8087',
    alignItems: 'center',
    padding: '0 8px',
  }),
});
