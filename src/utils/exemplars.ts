import { map, Observable } from 'rxjs';
import { DataFrame, DataTopic, Field } from '@grafana/data';
import { CustomTransformerDefinition, SceneObject } from '@grafana/scenes';
import { getTraceExplorationScene } from './utils';

export const exemplarsTransformations = (scene: SceneObject): CustomTransformerDefinition[] => [
  {
    topic: DataTopic.Annotations,
    operator: () => (source: Observable<DataFrame[]>) => {
      const traceExplorationScene = getTraceExplorationScene(scene);
      return source.pipe(
        map((data: DataFrame[]) => {
          return data.map((frame) => {
            if (frame.name === 'exemplar') {
              const traceIDField = frame.fields.find((field: Field) => field.name === 'traceId');
              if (traceIDField) {
                // The traceID will be interpolated in the url
                // Then, onClick we retrieve the traceId from the url and navigate to the trace exploration scene by setting the state
                traceIDField.config.links = [
                  {
                    title: 'View trace',
                    url: '#${__value.raw}',
                    onClick: (event) => {
                      event.e.stopPropagation(); // Prevent the click event from propagating to the parent anchor
                      const parentAnchorHref = event.e.target.parentElement.parentElement.href;
                      const traceId = parentAnchorHref.split('#')[1];
                      traceExplorationScene.state.locationService.partial({
                        traceId,
                      });
                    },
                  },
                ];
              }
            }

            return frame;
          });
        })
      );
    },
  },
];
