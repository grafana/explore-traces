import { render, screen } from '@testing-library/react';
import { MetricSelect } from "./MetricSelect";
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FilterByVariable } from './FilterByVariable';

const onChangeMetricFunctionMock = jest.fn();
jest.mock('../../../utils/utils', () => ({
  getMetricValue: () => 'rate',
  getTraceExplorationScene: () => ({
    onChangeMetricFunction: onChangeMetricFunctionMock,
  }),
}));

describe('MetricSelect', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    // Need to use delay: null here to work with fakeTimers
    // see https://github.com/testing-library/user-event/issues/833
    user = userEvent.setup({ delay: null });

    render(<MetricSelect model={{} as FilterByVariable} />);
  });
  
  it('should render correctly', async () => {
    const dropdown = screen.getByText('Rate');
    expect(dropdown).toBeInTheDocument();
  });

  it('should update correctly', async () => {
    const dropdown = screen.getByText('Rate');
    await user.click(dropdown);
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    await user.click(screen.getByText('Duration'));
    expect(onChangeMetricFunctionMock).toHaveBeenCalledTimes(1);
    expect(onChangeMetricFunctionMock).toHaveBeenCalledWith('duration');
  });
});
