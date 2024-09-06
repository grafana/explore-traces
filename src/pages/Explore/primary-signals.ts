import { SelectableValue } from '@grafana/data';

export const DATABASE_CALLS_KEY = 'span.db.name';

export const primarySignalOptions: Array<SelectableValue<string>> = [
  {
    label: 'Full traces',
    value: 'full_traces',
    filter: { key: 'nestedSetParent', operator: '<', value: '0' },
    description: 'Inspect full journeys of requests across services',
  },
  {
    label: 'Server spans',
    value: 'server_spans',
    filter: { key: 'kind', operator: '=', value: 'server' },
    description: 'Explore server-specific segments of traces',
  },
  {
    label: 'Consumer spans',
    value: 'consumer_spans',
    filter: { key: 'kind', operator: '=', value: 'consumer' },
    description: 'Analyze interactions initiated by consumer services',
  },
  {
    label: 'Database calls',
    value: 'database_calls',
    filter: { key: DATABASE_CALLS_KEY, operator: '!=', value: '""' },
    description: 'Evaluate the performance issues in database interactions',
  },
  {
    label: 'All spans',
    value: 'all_spans',
    filter: { key: '', operator: '', value: true },
    description: 'View and analyze raw span data',
  },
];

export const getSignalForKey = (key?: string) => {
  return primarySignalOptions.find((option) => option.value === key);
};
