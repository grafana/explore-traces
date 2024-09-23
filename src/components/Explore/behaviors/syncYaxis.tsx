import { sceneGraph, SceneObject, SceneObjectState, VizPanel } from '@grafana/scenes';
import { cloneDeep, merge } from 'lodash';
import { EventTimeseriesDataReceived } from '../../../utils/shared';

export function syncYAxis() {
  return (vizPanel: SceneObject<SceneObjectState>) => {
    const maxima = new Map<string, number>();

    const eventSub = vizPanel.subscribeToEvent(EventTimeseriesDataReceived, (event) => {
      const series = event.payload.series;

      series?.forEach((s) => {
        s.fields.slice(1).forEach((f) => {
          maxima.set(s.refId as string, Math.max(...f.values.filter((v) => v)));
        })
      });

      updateTimeseriesAxis(vizPanel, Math.max(...maxima.values()));
    });

    return () => {
      eventSub.unsubscribe();
    };
  };
}

function updateTimeseriesAxis(vizPanel: SceneObject, max: number) {
  // findAllObjects searches down the full scene graph
  const timeseries = sceneGraph.findAllObjects(vizPanel, (o) => o instanceof VizPanel) as VizPanel[];

  for (const t of timeseries) {
    t.clearFieldConfigCache(); // required

    t.setState({
      fieldConfig: merge(cloneDeep(t.state.fieldConfig), { defaults: { max } }),
    });
  }
}
