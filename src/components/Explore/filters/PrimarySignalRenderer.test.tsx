import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FilterByVariable } from './FilterByVariable';
import { PrimarySignalRenderer } from './PrimarySignalRenderer';

const onChangePrimarySignalMock = jest.fn();
jest.mock('../../../utils/utils', () => ({
  getTraceExplorationScene: () => ({
    useState: jest.fn().mockReturnValue({ primarySignal: 'full_traces' }),
    onChangePrimarySignal: onChangePrimarySignalMock,
  }),
}));

describe('PrimarySignalRenderer', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(async () => {
    // Need to use delay: null here to work with fakeTimers
    // see https://github.com/testing-library/user-event/issues/833
    user = userEvent.setup({ delay: null });

    await act(async () => {
      render(<PrimarySignalRenderer model={{} as FilterByVariable} />);
    });
  });

  it('should render correctly', () => {
    const dropdown = screen.getByText('Full traces');
    expect(dropdown).toBeInTheDocument();
  });

  it('should update correctly', async () => {
    const dropdown = screen.getByText('Full traces');
    await user.click(dropdown);
    expect(screen.getByText('Server spans')).toBeInTheDocument();
    expect(screen.getByText('Consumer spans')).toBeInTheDocument();
    expect(screen.getByText('Database calls')).toBeInTheDocument();
    expect(screen.getByText('All spans')).toBeInTheDocument();
    await user.click(screen.getByText('Consumer spans'));
    expect(onChangePrimarySignalMock).toHaveBeenCalledTimes(1);
    expect(onChangePrimarySignalMock).toHaveBeenCalledWith('consumer_spans');
  });
});
