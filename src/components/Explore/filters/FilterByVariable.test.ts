import { renderTraceQLLabelFilters } from "./FilterByVariable";

describe('renderTraceQLLabelFilters', () => {
  it('should render empty expression from no filters', () => {
    const expression = renderTraceQLLabelFilters([]);
    expect(expression).toBe('true');
  });
  it('should render expression from filters', () => {
    const expression = renderTraceQLLabelFilters(filters);
    expect(expression).toBe('service=\"frontend\"&&status=error&&kind=service');
  });
});

export const filters = [
  { key: 'service', operator: '=', value: 'frontend' },
  { key: 'status', operator: '=', value: 'error' },
  { key: 'kind', operator: '=', value: 'service' },
];
