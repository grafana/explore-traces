import { comparisonQuery } from './comparisonQuery';
import { buildHistogramQuery } from './histogram';
import { metricByWithStatus } from './generateMetricsQuery';

describe('comparisonQuery', () => {
  it('should return correct query for no selection', () => {
    const query = comparisonQuery();
    expect(query).toBe('{}');
  });
  it('should return correct query for a selection', () => {
    const query = comparisonQuery({
      type: 'manual',
      raw: {
        x: {
          from: 1728987790508.9485,
          to: 1728988005770.9075,
        },
        y: {
          from: 8.29360465116279,
          to: 21.85174418604651,
        },
      },
      timeRange: {
        from: 1728987791,
        to: 1728988006,
      },
      duration: {
        from: '0ms',
        to: '2s',
      },
    });
    expect(query).toBe('{duration >= 0ms && duration <= 2s}, 10, 1728987791000000000, 1728988006000000000');
  });
});

describe('buildHistogramQuery', () => {
  it('should return correct query', () => {
    const query = buildHistogramQuery();
    expect(query).toEqual({
      filters: [],
      limit: 1000,
      query: '{${filters}} | histogram_over_time(duration)',
      queryType: 'traceql',
      refId: 'A',
      spss: 10,
      tableType: 'spans',
    });
  });
});

describe('metricByWithStatus', () => {
  it('should return correct query for no tag', () => {
    const query = metricByWithStatus('errors');
    expect(query).toEqual({
      filters: [],
      limit: 100,
      query: '{${filters} && status=error} | rate() by(status)',
      queryType: 'traceql',
      refId: 'A',
      spss: 10,
      tableType: 'spans',
    });
  });

  it('should return correct query for errors', () => {
    const query = metricByWithStatus('errors', 'service');
    expect(query).toEqual({
      filters: [],
      limit: 100,
      query: '{${filters} && status=error && service != nil} | rate() by(service, status)',
      queryType: 'traceql',
      refId: 'A',
      spss: 10,
      tableType: 'spans',
    });
  });

  it('should return correct query for duration', () => {
    const query = metricByWithStatus('duration', 'service');
    expect(query).toEqual({
      filters: [],
      limit: 100,
      query: '{${filters} && service != nil} | quantile_over_time(duration, 0.9) by(service)',
      queryType: 'traceql',
      refId: 'A',
      spss: 10,
      tableType: 'spans',
    });
  });
});
