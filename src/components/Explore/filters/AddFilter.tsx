import React from 'react';

import { Button } from '@grafana/ui';

import { FilterByVariable } from './FilterByVariable';

import { FilterRenderer } from './FilterRenderer';

interface Props {
  model: FilterByVariable;
}

export function AddFilter({ model }: Props) {
  const { _wip } = model.useState();

  if (!_wip) {
    return (
      <Button
        variant="secondary"
        icon="plus"
        title={'Add filter'}
        aria-label="Add filter"
        onClick={() => model._addWip()}
        size={'sm'}
      >
        Filter
      </Button>
    );
  }

  return <FilterRenderer filter={_wip} model={model} />;
}
