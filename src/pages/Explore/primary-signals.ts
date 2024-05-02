import { SelectableValue } from '@grafana/data';

export const primarySignalOptions: Array<SelectableValue<string>> = [
  { label: 'Server spans', value: 'server_spans', filter: { key: 'kind', operator: '=', value: 'server' }, text: 'Explore server-specific segments of traces'  },
  { label: 'Consumer spans', value: 'consumer_spans', filter: { key: 'kind', operator: '=', value: 'consumer' }, text: 'Analyze interactions initiated by consumer services'  },
  { label: 'HTTP endpoints', value: 'http_endpoints', filter: { key: 'span.http.path', operator: '!=', value: '""' }, text: 'Analyze activities at specific HTTP service points'  },
  { label: 'Database calls', value: 'database_calls', filter: { key: 'span.db.name', operator: '!=', value: '""' }, text: 'Evaluate the performance issues in database interactions'  },
  { label: 'Full traces', value: 'full_traces', filter: { key: 'nestedSetParent', operator: '<', value: '0' }, text: 'Inspect full journeys of requests across services' },
  { label: 'All spans', value: 'all_spans', filter: { key: '', operator: '', value: true }, text: 'View and analyze raw span data'  },
];

export const getSignalForKey = (key?: string) => {
  return primarySignalOptions.find((option) => option.value === key);
};
