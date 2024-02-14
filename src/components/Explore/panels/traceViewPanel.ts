import { PanelBuilders, SceneQueryRunner } from '@grafana/scenes';
import { explorationDS } from '../../../utils/shared';

export function getTraceViewPanel(traceId: string) {
  return PanelBuilders.traces()
    .setTitle('Trace')
    .setData(
      new SceneQueryRunner({
        datasource: explorationDS,
        queries: [{ refId: 'A', query: traceId, queryType: 'traceql' }],
      })
    )
    .build();
}
