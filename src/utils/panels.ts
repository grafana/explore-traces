import { DataFrame, FieldType, PanelData } from '@grafana/data';

export function groupSeriesBy(data: PanelData, groupBy: string) {
  const groupedData = data.series.reduce((acc, series) => {
    const key = series.fields.find((f) => f.type === FieldType.number)?.labels?.[groupBy];
    if (!key) {
      return acc;
    }
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(series);
    return acc;
  }, {} as Record<string, DataFrame[]>);

  const newSeries = [];
  for (const key in groupedData) {
    const frames = groupedData[key].sort((a, b) => a.name?.localeCompare(b.name!) || 0);
    const mainFrame = frames[0];
    frames.slice(1, frames.length).forEach((frame) => mainFrame.fields.push(frame.fields[1]));
    newSeries.push(mainFrame);
  }
  return newSeries;
}
