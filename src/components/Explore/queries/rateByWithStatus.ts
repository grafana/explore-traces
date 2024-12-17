import { ALL, MetricFunction, VAR_FILTERS_EXPR } from '../../../utils/shared';

export function rateByWithStatus(metric: MetricFunction, tagKey?: string) {
  const rateBy = tagKey && tagKey !== ALL ? tagKey + ',' : '';
  const rateExtraFilter = tagKey && tagKey !== ALL ? `&& ${tagKey} != nil` : '';
  let expr = `{${VAR_FILTERS_EXPR} ${rateExtraFilter}} | rate() by(${rateBy} status)`;
  switch (metric) {
    case 'errors':
      const errorsBy = tagKey && tagKey !== ALL ? `by(${tagKey}, status)` : '';
      expr = `{${VAR_FILTERS_EXPR} && status=error} | rate() ${errorsBy}`;
      break;
    case 'duration':
      const durationBy = tagKey && tagKey !== ALL ? `by(${tagKey})` : '';
      expr = `{${VAR_FILTERS_EXPR}} | quantile_over_time(duration, 0.9) ${durationBy}`;
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
