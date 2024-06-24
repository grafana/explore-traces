import { ComparisonSelection } from '../../../utils/shared';

export function comparisonQuery(selection?: ComparisonSelection) {
  let selector = '';

  if (!selection) {
    return '{}';
  }

  if (selection.query) {
    selector += selection.query;
  }

  const duration = [];
  if (selection.duration?.from.length) {
    duration.push(`duration >= ${selection.duration.from}`);
  }
  if (selection.duration?.to.length) {
    duration.push(`duration <= ${selection.duration.to}`);
  }
  if (duration.length) {
    if (selector.length) {
      selector += ' && ';
    }
    selector += duration.join(' && ');
  }

  const fromTimerange = selection.timeRange?.from;
  const toTimerange = selection.timeRange?.to;
  return `{${selector}}, 10${
    fromTimerange && toTimerange ? `, ${fromTimerange * 1000000000}, ${toTimerange * 1000000000}` : ``
  }`;
}
