import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddFilter } from './AddFilter';
import { FilterByVariable } from './FilterByVariable';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getTemplateSrv: () => ({
    getAdhocFilters: jest.fn(),
  }),
}));

jest.mock('../../../utils/analytics', () => ({
  reportAppInteraction: jest.fn(),
  USER_EVENTS_ACTIONS: { common: { new_filter_added_manually: 'new_filter_added_manually' } },
  USER_EVENTS_PAGES: { common: 'common' },
}));

jest.mock('./FilterRenderer', () => ({
  FilterRenderer: jest.fn(() => <div>FilterRenderer Component</div>),
}));

describe('AddFilter Component', () => {
  let model: FilterByVariable;

  beforeEach(() => {
    model = new FilterByVariable({});
    jest.spyOn(model, '_addWip').mockImplementation(jest.fn());
  });

  it('renders add filter bar with text when no filters are present', () => {
    render(<AddFilter model={model} otherFiltersLength={0} />);
    expect(screen.getByText('Filter by attribute...')).toBeInTheDocument();
  });

  it('renders add filter bar without text when filters are present', () => {
    render(<AddFilter model={model} otherFiltersLength={1} />);
    expect(screen.queryByText('Filter by attribute...')).not.toBeInTheDocument();
  });

  it('renders FilterRenderer when _wip is defined', () => {
    jest.spyOn(model, 'useState').mockReturnValue({ _wip: { key: 'testKey', operator: '', value: '' } } as any); // should be AdHocFiltersVariableState but this type is not exported
    render(<AddFilter model={model} otherFiltersLength={0} />);
    expect(screen.getByText('FilterRenderer Component')).toBeInTheDocument();
  });

  it('calls _addWip and reportAppInteraction on add filter bar click', () => {
    render(<AddFilter model={model} otherFiltersLength={0} />);
    
    fireEvent.click(screen.getByText('Filter by attribute...'));
    expect(model._addWip).toHaveBeenCalled();
    expect(reportAppInteraction).toHaveBeenCalledWith(
      USER_EVENTS_PAGES.common,
      USER_EVENTS_ACTIONS.common.new_filter_added_manually
    );
  });
});
