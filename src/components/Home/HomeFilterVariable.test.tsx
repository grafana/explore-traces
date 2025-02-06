import { renderFilter } from "./HomeFilterVariable";

describe('renderFilter', () => {
  it('returns an empty string when value is empty', () => {
    expect(renderFilter({ key: 'testKey', operator: '=', value: '' })).toBe('');
  });

  it('wraps value in quotes when key matches RESOURCE_ATTR or SPAN_ATTR and value is not a number', () => {
    expect(renderFilter({ key: 'resource.attr', operator: '=', value: 'testValue' })).toBe('&& resource.attr="testValue"');
    expect(renderFilter({ key: 'span.attr', operator: '=', value: 'testValue' })).toBe('&& span.attr="testValue"');
  });

  it('does not wrap value in quotes when it is already quoted', () => {
    expect(renderFilter({ key: 'resource.attr', operator: '=', value: '"testValue"' })).toBe('&& resource.attr="testValue"');
  });

  it('does not wrap number in quotes', () => {
    expect(renderFilter({ key: 'custom.attr', operator: '=', value: '123' })).toBe('&& custom.attr=123');
  });
});
