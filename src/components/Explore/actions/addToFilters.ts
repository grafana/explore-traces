import { AdHocFiltersVariable } from '@grafana/scenes';

export const addToFilters = (variable: AdHocFiltersVariable, label: string, value: string) => {
  // ensure we set the new filter with latest value
  // and remove any existing filter for the same key
  const filtersWithoutNew = variable.state.filters.filter((f) => f.key !== label);

  variable.setState({
    filters: [
      ...filtersWithoutNew,
      {
        key: label,
        operator: '=',
        value: value,
      },
    ],
  });
};
