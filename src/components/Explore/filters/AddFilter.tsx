import React from 'react';

import { FilterByVariable } from './FilterByVariable';

import { FilterRenderer } from './FilterRenderer';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';

interface Props {
  model: FilterByVariable;
}

export function AddFilter({ model }: Props) {
  const { _wip } = model.useState();
  const styles = useStyles2(getStyles);

  if (!_wip) {
    return <div className={styles.addFilterBar} onClick={() => model._addWip()} />;
  }

  return <FilterRenderer filter={_wip} model={model} isWip={true} />;
}

const getStyles = () => ({
  addFilterBar: css({
    height: '100%',
    display: 'flex',
    flex: 1,
    cursor: 'pointer',
  }),
});
