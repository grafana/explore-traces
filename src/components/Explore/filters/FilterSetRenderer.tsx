import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps } from '@grafana/scenes';

import { FilterByVariable } from './FilterByVariable';

import { FilterRenderer } from './FilterRenderer';
import { AddFilter } from './AddFilter';
import { Button, Icon, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { getTraceExplorationScene, getFilterSignature } from '../../../utils/utils';
import { PrimarySignalRenderer } from './PrimarySignalRenderer';
import { getSignalForKey, primarySignalOptions } from '../../../pages/Explore/primary-signals';
import { MetricSelect } from './MetricSelect';

export function FilterSetRenderer({ model }: SceneComponentProps<FilterByVariable>) {
  const exploration = getTraceExplorationScene(model);
  const { primarySignal } = exploration.useState();
  const { filters } = model.useState();
  const styles = useStyles2(getStyles);

  const primarySignalOption = getSignalForKey(primarySignal);
  const primarySignalFilter = filters.find(
    (f) => getFilterSignature(f) === getFilterSignature(primarySignalOption?.filter)
  );
  const otherFilters = filters.filter((f) => getFilterSignature(f) !== getFilterSignature(primarySignalOption?.filter));

  const clearFilters = () => {
    if (model.state._wip) {
      model.setState({ _wip: undefined });
      return;
    }
    for (const filter of filters) {
      // Don't remove the primary signal filter
      if (
        !primarySignalOptions.find(
          (option) =>
            option.filter.key === filter.key &&
            option.filter.value === filter.value &&
            option.filter.operator === filter.operator
        )
      ) {
        model._removeFilter(filter);
      }
    }
  };

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

      <AddFilter model={model} otherFiltersLength={otherFilters.length} />

      {filters.length > 0 && (
        <Button
          variant="secondary"
          aria-label="Clear filters"
          size="sm"
          className={styles.clearFilters}
          icon="times"
          onClick={() => clearFilters()}
          tooltip="Clear filters"
          tooltipPlacement="left"
        />
      )}
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    height: '32px',
    display: 'flex',
    border: `1px solid ${theme.colors.border.weak}`,
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: `${theme.spacing(0.5)} 0 ${theme.spacing(0.5)} ${theme.spacing(1)}`,
    flexGrow: 1,
  }),
  text: css({
    fontSize: 12,
  }),
  clearFilters: css({
    fontSize: 12,
    marginRight: '2px',
  }),
});
