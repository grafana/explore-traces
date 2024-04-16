import { SelectableValue } from '@grafana/data';

export const primarySignalOptions: Array<SelectableValue<string>> = [
  { label: 'Trace roots', value: 'trace_roots', filter: { key: 'nestedSetParent', operator: '<', value: '0' } },
  { label: 'Server spans', value: 'server_spans', filter: { key: 'kind', operator: '=', value: 'server' } },
  { label: 'Consumer spans', value: 'consumer_spans', filter: { key: 'kind', operator: '=', value: 'consumer' } },
  { label: 'HTTP paths', value: 'http_paths', filter: { key: 'span.http.path', operator: '!=', value: '""' } },
  { label: 'Databases', value: 'databases', filter: { key: 'span.db.name', operator: '!=', value: '""' } },
];

export const getSignalForKey = (key?: string) => {
  return primarySignalOptions.find((option) => option.value === key);
};
