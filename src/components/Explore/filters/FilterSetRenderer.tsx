import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps } from '@grafana/scenes';

import { FilterByVariable } from './FilterByVariable';

import { FilterRenderer } from './FilterRenderer';
import { AddFilter } from './AddFilter';
import { Icon, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { getExplorationFor, getFilterSignature } from '../../../utils/utils';
import { PrimarySignalRenderer } from './PrimarySignalRenderer';
import { getSignalForKey } from '../../../pages/Explore/primary-signals';
import { MetricSelect } from './MetricSelect';

export function FilterSetRenderer({ model }: SceneComponentProps<FilterByVariable>) {
  const exploration = getExplorationFor(model);
  const { primarySignal } = exploration.useState();
  const { filters } = model.useState();
  const styles = useStyles2(getStyles);

  const primarySignalOption = getSignalForKey(primarySignal);
  const primarySignalFilter = filters.find(
    (f) => getFilterSignature(f) === getFilterSignature(primarySignalOption?.filter)
  );
  const otherFilters = filters.filter((f) => getFilterSignature(f) !== getFilterSignature(primarySignalOption?.filter));

  const clearFilters = () => {
    for (const filter of filters) {
      model._removeFilter(filter);
    }
  }

  return (
    <div className={styles.container}>
      <Icon name={'filter'} />
      <MetricSelect model={model} />
      {primarySignalFilter && (
        <>
          <div className={styles.text}>of</div>
          <PrimarySignalRenderer model={model} />
        </>
      )}
      {(otherFilters.length > 0 || model.state._wip) && <div className={styles.text}>where</div>}
      {otherFilters.map((filter, idx) => (
        <React.Fragment key={idx}>
          <FilterRenderer filter={filter} model={model} />
        </React.Fragment>
      ))}

      <AddFilter model={model} />

      {filters.length > 0 && (
        <Button
          variant="secondary"
          aria-label="Clear filters"
          size='sm'
          className={styles.clearFilters}
          icon="times"
          onClick={() => clearFilters()}
          tooltip="Clear filters"
          tooltipPlacement='left'
        />
      )}
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    height: '30px',
    display: 'flex',
    border: `1px solid ${theme.colors.border.weak}`,
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
    flexGrow: 1,
  }),
  text: css({
    fontSize: 12,
  }),
  clearFilters: css({
    fontSize: 12,
  }),
});
