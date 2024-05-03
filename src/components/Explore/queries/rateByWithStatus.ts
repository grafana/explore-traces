import { MetricFunction, VAR_FILTERS_EXPR } from '../../../utils/shared';

export function rateByWithStatus(metric: MetricFunction, tagKey?: string) {
  let expr = `{${VAR_FILTERS_EXPR} ${tagKey ? `&& ${tagKey} != nil` : ''}} | rate() by(${
    tagKey ? tagKey + ',' : ''
  } status)`;
  switch (metric) {
    case 'errors':
      expr = `{${VAR_FILTERS_EXPR} && status=error} | rate() ${tagKey ? `by(${tagKey})` : ''}`;
      break;
    case 'latency':
      expr = `{${VAR_FILTERS_EXPR}} | quantile_over_time(duration, 0.9) ${tagKey ? `by(${tagKey})` : ''})`;
      break;
  }

  return {
    refId: 'A',
    query: expr,
    queryType: 'traceql',
    tableType: 'spans',
    limit: 100,
    spss: 10,
    filters: [],
  };
}
