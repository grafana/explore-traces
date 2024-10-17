import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { FilterSetRenderer } from './FilterSetRenderer';
import { FilterByVariable } from './FilterByVariable';
import { filters } from './FilterByVariable.test';
import { toOption } from '@grafana/data';

jest.mock('../../../utils/utils', () => ({
  getFilterSignature: (f: { key: string; }) => {
    return f.key === 'service' ? 'service' : 'nestedSetParent';
  },
  getMetricValue: () => 'rate',
  getTraceExplorationScene: () => ({
    useState: jest.fn().mockReturnValue({ primarySignal: 'full_traces' }),
    getMetricVariable: () => ({
      useState: jest.fn().mockReturnValue('rate'),
    }),
  }),
}));

describe('FilterSetRenderer', () => {
  beforeEach(async () => {
    const model = {
      useState: jest.fn().mockReturnValue({filters}),
      _getOperators: jest.fn().mockReturnValue([toOption('='), toOption('!=')]),
      _getKeys: jest.fn().mockReturnValue([]),
      state: {}
    };

    await act(async () => {
      render(<FilterSetRenderer model={model as unknown as FilterByVariable} />);
    });
  });

  it('should render correctly', () => {
    expect(screen.getByText('Rate')).toBeInTheDocument();
    expect(screen.getByText('of')).toBeInTheDocument();
    expect(screen.getByText('Full traces')).toBeInTheDocument();
    expect(screen.getByText('where')).toBeInTheDocument();
    expect(screen.getByText('service')).toBeInTheDocument();
    expect(screen.getByText('=')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
  });
});
