import { DataFrame } from '@grafana/data';

export const computeHighestDifference = (frame: DataFrame) => {
  const baselineField = frame.fields.find((f) => f.name === 'Baseline');
  const selectionField = frame.fields.find((f) => f.name === 'Selection');

  let maxDifference = 0;
  let maxDifferenceIndex = 0;

  for (let i = 0; i < (baselineField?.values?.length || 0); i++) {
    const diff = (selectionField?.values[i] || 0) - (baselineField?.values[i] || 0);
    if (Math.abs(diff) > Math.abs(maxDifference || 0)) {
      maxDifference = diff;
      maxDifferenceIndex = i;
    }
  }

  return { maxDifference, maxDifferenceIndex };
};
