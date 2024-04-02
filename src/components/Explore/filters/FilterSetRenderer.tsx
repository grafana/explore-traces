import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps } from '@grafana/scenes';

import { FilterByVariable } from './FilterByVariable';

import { FilterRenderer } from './FilterRenderer';
import { AddFilter } from './AddFilter';
import { Icon, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';

export function FilterSetRenderer({ model }: SceneComponentProps<FilterByVariable>) {
  const { filters } = model.useState();
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <Icon name={'filter'} />
      {filters.map((filter, idx) => (
        <React.Fragment key={idx}>
          <FilterRenderer filter={filter} model={model} />
        </React.Fragment>
      ))}

      <span className={styles.addFilterContainer}>
        <AddFilter model={model} />
      </span>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    height: '30px',
    display: 'flex',
    border: `1px solid ${theme.colors.border.strong}`,
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
    flexGrow: 1,
  }),
  addFilterContainer: css({
    marginLeft: theme.spacing(1),
  }),
});
