import { DataFrame } from '@grafana/data';

export const doesQueryMatchDataFrameLabels = (searchQuery?: string) => (dataFrame: DataFrame) => {
  const pattern = searchQuery?.trim();
  if (!pattern) {
    return true;
  }

  const regex = new RegExp(pattern, 'i');

  return dataFrame.fields.some((f) => (!f.labels ? false : Object.values(f.labels).find((label) => regex.test(label))));
};
