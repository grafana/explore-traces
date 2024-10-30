import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterRenderer, formatKeys, sortValues } from './FilterRenderer';
import { AdHocVariableFilter, toOption } from '@grafana/data';
import { FilterByVariable } from './FilterByVariable';

jest.mock('utils/utils', () => ({
  getTraceExplorationScene: () => ({
    useState: jest.fn().mockReturnValue({ primarySignal: 'full_traces' }),
    getMetricVariable: () => ({
      useState: jest.fn().mockReturnValue('rate'),
    }),
  }),
}));

const mockFilter: AdHocVariableFilter = { key: 'testKey', operator: '=', value: 'testValue' };
const mockKeys = [{ value: 'resource.tag1' }, { value: 'span.tag1' }, { value: 'kind' }, { value: 'resource.tag2' }];
const mockValues = [toOption('value1'), toOption('zValue'), toOption('aValue')];

const mockModel = {
  _getKeys: jest.fn().mockReturnValue(mockKeys),
  _getOperators: jest.fn(() => [{ label: '=', value: '=' }, { label: '!=', value: '!=' }]),
  _getValuesFor: jest.fn().mockReturnValue(mockValues),
  _updateFilter: jest.fn(),
  _removeFilter: jest.fn(),
  state: { filters: [], readOnly: false },
};

describe('FilterRenderer Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    // Need to use delay: null here to work with fakeTimers
    // see https://github.com/testing-library/user-event/issues/833
    user = userEvent.setup({ delay: null });
    
    jest.clearAllMocks();
  });

  it('renders keys correctly', async () => {
    await act(async () => {
      render(<FilterRenderer filter={mockFilter} model={mockModel as unknown as FilterByVariable} />);
    });
    
    await user.click(screen.getByText('testKey'));
    expect(screen.getByText('kind')).toBeInTheDocument();
    expect(screen.getByText('resource.tag1')).toBeInTheDocument();
    expect(screen.getByText('resource.tag2')).toBeInTheDocument();
    expect(screen.getByText('span.tag1')).toBeInTheDocument();
  });

  it('orders keys correctly', async () => {
    const keys = formatKeys(mockKeys, [mockFilter], 'rate');
    expect(keys).toEqual([
      { label: 'kind', value: 'kind' },
      { label: 'resource.tag1', value: 'resource.tag1' },
      { label: 'resource.tag2', value: 'resource.tag2' },
      { label: 'span.tag1', value: 'span.tag1' }
    ]);
  });

  it('updates filter key on selection change', async () => {
    await act(async () => {
      render(<FilterRenderer filter={mockFilter} model={mockModel as unknown as FilterByVariable} />);
    });
    
    await user.click(screen.getByText('testKey'));
    expect(screen.getByText('kind')).toBeInTheDocument();
    expect(screen.getByText('resource.tag1')).toBeInTheDocument();
    await user.click(screen.getByText('kind'));
    
    expect(mockModel._updateFilter).toHaveBeenCalledWith(mockFilter, { key: 'kind' });
    expect(screen.queryByText('resource.tag1')).not.toBeInTheDocument(); // closes dropdown on above selection
  });

  it('renders operators correctly', async () => {
    await act(async () => {
      render(<FilterRenderer filter={mockFilter} model={mockModel as unknown as FilterByVariable} />);
    });
    await user.click(screen.getByText('='));
    expect(screen.getByText('!=')).toBeInTheDocument();
  });

  it('renders values correctly', async () => {
    await act(async () => {
      render(<FilterRenderer filter={mockFilter} model={mockModel as unknown as FilterByVariable} />);
    });
    
    await user.click(screen.getByText('testValue'));
    expect(screen.getByText('aValue')).toBeInTheDocument();
    expect(screen.getByText('value1')).toBeInTheDocument();
    expect(screen.getByText('zValue')).toBeInTheDocument();
  });

  it('orders values correctly', async () => {
    const values = sortValues(mockValues);
    expect(values).toEqual([
      { label: 'aValue', value: 'aValue' },
      { label: 'value1', value: 'value1' },
      { label: 'zValue', value: 'zValue' },
    ]);
  });

  it('updates filter value on selection change', async () => {
    await act(async () => {
      render(<FilterRenderer filter={mockFilter} model={mockModel as unknown as FilterByVariable} />);
    });
    
    await user.click(screen.getByText('testValue'));
    expect(screen.getByText('aValue')).toBeInTheDocument();
    expect(screen.getByText('value1')).toBeInTheDocument();
    await user.click(screen.getByText('aValue'));
    
    expect(mockModel._updateFilter).toHaveBeenCalledWith(mockFilter, { value: 'aValue' });
    expect(screen.queryByText('value1')).not.toBeInTheDocument(); // closes dropdown on above selection
  });

  it('removes filter on remove button click', async () => {
    await act(async () => {
      render(<FilterRenderer filter={mockFilter} model={mockModel as unknown as FilterByVariable} />);
    });

    await user.click(screen.getByRole('button', { name: /Remove filter/i }));
    expect(mockModel._removeFilter).toHaveBeenCalledWith(mockFilter);
  });
});
