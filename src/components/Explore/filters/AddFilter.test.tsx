import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddFilter } from './AddFilter';
import { FilterByVariable } from './FilterByVariable';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';

jest.mock('../../../utils/analytics', () => ({
  reportAppInteraction: jest.fn(),
  USER_EVENTS_ACTIONS: { common: { new_filter_added_manually: 'new_filter_added_manually' } },
  USER_EVENTS_PAGES: { common: 'common' },
}));

jest.mock('./FilterRenderer', () => ({
  FilterRenderer: jest.fn(() => <div>FilterRenderer Component</div>),
}));

const mockModel = {
  _addWip: jest.fn(),
  useState: jest.fn(() => ({ _wip: undefined })),
};

describe('AddFilter Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders add filter bar with text when no filters are present', () => {
    render(<AddFilter model={mockModel as unknown as FilterByVariable} otherFiltersLength={0} />);
    expect(screen.getByText('Filter by attribute...')).toBeInTheDocument();
  });

  it('renders add filter bar without text when filters are present', () => {
    render(<AddFilter model={mockModel as unknown as FilterByVariable} otherFiltersLength={1} />);
    expect(screen.queryByText('Filter by attribute...')).not.toBeInTheDocument();
  });

  it('renders FilterRenderer when _wip is defined', () => {
    const mockModel = {
      _addWip: jest.fn(),
      useState: jest.fn(() => ({ _wip: { key: 'testKey' } })),
    };
    render(<AddFilter model={mockModel as unknown as FilterByVariable} otherFiltersLength={0} />);
    
    expect(screen.getByText('FilterRenderer Component')).toBeInTheDocument();
  });

  it('calls _addWip and reportAppInteraction on add filter bar click', () => {
    render(<AddFilter model={mockModel as unknown as FilterByVariable} otherFiltersLength={0} />);
    
    fireEvent.click(screen.getByText('Filter by attribute...'));
    expect(mockModel._addWip).toHaveBeenCalled();
    expect(reportAppInteraction).toHaveBeenCalledWith(
      USER_EVENTS_PAGES.common,
      USER_EVENTS_ACTIONS.common.new_filter_added_manually
    );
  });
});
