import { PanelBuilders } from '@grafana/scenes';
import { locationService } from '@grafana/runtime';

export function getSpansListPanel() {
  return PanelBuilders.table() //
    .setTitle('Spans table')
    .setOverrides((builder) => {
      return builder
        .matchFieldsWithName('traceID')
        .overrideLinks([
          {
            title: 'Trace: ${__value.raw}',
            url: '',
            onClick: (data) => {
              const traceID: string | undefined = data.origin?.field?.values?.[data.origin?.rowIndex];
              traceID && locationService.partial({ traceId: traceID });
            },
          },
        ])
        .matchFieldsWithName('spanID')
        .overrideLinks([
          {
            title: 'Span: ${__value.raw}',
            url: '',
            onClick: (data) => {
              const traceID: string | undefined =
                data?.origin?.field?.state?.scopedVars?.__dataContext?.value?.frame?.first?.[data.origin?.rowIndex];
              traceID && locationService.partial({ traceId: traceID });
            },
          },
        ]);
    })
    .build();
}
