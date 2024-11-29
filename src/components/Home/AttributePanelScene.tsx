import { css } from '@emotion/css';
import { DataFrame, dateTimeFormat, Field, GrafanaTheme2 } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { SceneObjectState, SceneObjectBase, SceneComponentProps } from '@grafana/scenes';
import { Badge, Button, useStyles2 } from '@grafana/ui';
import React from 'react';
import { formatDuration } from 'utils/dates';
import { EXPLORATIONS_ROUTE, MetricFunction } from 'utils/shared';

interface AttributePanelSceneState extends SceneObjectState {
  series?: DataFrame[];
  title: string;
  type: MetricFunction;
}

export class AttributePanelScene extends SceneObjectBase<AttributePanelSceneState> {
  public static Component = ({ model }: SceneComponentProps<AttributePanelScene>) => {
    const { series, title, type } = model.useState();
    const styles = useStyles2(getStyles);

    const Traces = () => {
      if (series && series.length > 0) {
        console.log(series);

        const sortByField = series[0].fields.find((f) => f.name === (type === 'duration' ? 'duration' : 'time'));
        if (sortByField && sortByField.values) {
          const sortedByDuration = sortByField?.values.map((_, i) => i)?.sort((a, b) => sortByField?.values[b] - sortByField?.values[a]);
          const sortedFields = series[0].fields.map((f) => {
            return {
              ...f,
              values: sortedByDuration?.map((i) => f.values[i]),
            };
          });

          const traceIdField = sortedFields.find((f) => f.name === 'traceIdHidden');
          const spanIdField = sortedFields.find((f) => f.name === 'spanID');
          const traceNameField = sortedFields.find((f) => f.name === 'traceName');
          const traceServiceField = sortedFields.find((f) => f.name === 'traceService');
          const durationField = sortedFields.find((f) => f.name === 'duration');
          const timeField = sortedFields.find((f) => f.name === 'time');

          const getLabel = (index: number) => {
            let label = '';
            if (traceServiceField?.values[index]) {
              label = traceServiceField.values[index];
            }
            if (traceNameField?.values[index]) {
              label = label.length === 0 ? traceNameField.values[index] : `${label}: ${traceNameField.values[index]}`;
            }
            return label.length === 0 ? 'Trace service & name not found' : label;
          }

          const getErrorTimeAgo = (timeField: Field | undefined, index: number) => {
            if (!timeField || !timeField.values) {
              return 'Times not found';
            }

            const dateString = dateTimeFormat(timeField?.values[index]);

            const now = new Date();
            const date = new Date(dateString);
            const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // Difference in seconds

            if (diff < 60) {
              return `${diff} second${diff === 1 ? '' : 's'} ago`;
            } else if (diff < 3600) {
              const minutes = Math.floor(diff / 60);
              return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
            } else if (diff < 86400) {
              const hours = Math.floor(diff / 3600);
              return `${hours} hour${hours === 1 ? '' : 's'} ago`;
            } else {
              const days = Math.floor(diff / 86400);
              return `${days} day${days === 1 ? '' : 's'} ago`;
            }
          }

          const getDuration = (durationField: Field | undefined, index: number) => {
            if (!durationField || !durationField.values) {
              return 'Durations not found';
            }

            return formatDuration(durationField.values[index] / 1000);
          }

          const getUrl = (traceId: string, spanIdField: Field | undefined, traceServiceField: Field | undefined, index: number) => {
            let url = EXPLORATIONS_ROUTE + '?primarySignal=full_traces';

            if (!spanIdField || !spanIdField.values || !traceServiceField || !traceServiceField.values) {
              console.error('SpanId or traceService not found');
              return url;
            }

            url = url + `&traceId=${traceId}&spanId=${spanIdField.values[index]}`;
            url = url + `&var-filters=resource.service.name|=|${traceServiceField.values[index]}`;
            url = type === 'duration' ? url + '&var-metric=duration' : url + '&var-metric=errors';

            return url;
          }

          // http://localhost:3000/a/grafana-exploretraces-app/explore?
          // primarySignal=full_traces&traceId=76712b89f2507a5
          // &spanId=4f3109e5b3e2c67c
          // &from=now-15m&to=now&timezone=UTC&var-ds=EbPO1fYnz
          // &var-filters=nestedSetParent%7C%3C%7C0
          // &var-filters=resource.service.name%7C%3D%7Cgrafana
          // &var-groupBy=resource.service.name
          // &var-metric=rate
          // &var-latencyThreshold=
          // &var-partialLatencyThreshold=
          // &actionView=breakdown

          // http://localhost:3000/a/grafana-exploretraces-app/explore?
          // primarySignal=full_traces
          // &traceId=f65180774b30270043537cb48a52e4d7
          // &spanId=1f98ea0121c168ba
          // &actionView=breakdown

          return (
            <>
              {traceIdField?.values?.map((traceId, index) => (
                <div className={styles.tracesRow} key={index}>
                  {getLabel(index)}
                  
                  <div className={styles.action}>
                    <span className={styles.actionText}>
                      <Badge 
                        text={type === 'duration' ? getDuration(durationField, index) : getErrorTimeAgo(timeField, index)} 
                        color={type === 'duration' ? 'orange' : 'red'}                       
                      />
                    </span>
                    <Button 
                      variant='secondary' 
                      icon='arrow-right'
                      title='View trace'
                      onClick={() => {
                        const url = getUrl(traceId, spanIdField, traceServiceField, index);
                        console.log(url)
                        locationService.push(url);
                      }}
                    />
                  </div>
                </div>
              ))}
            </>
          );
        }
      }
      return <></>;
    }
    
    return (
      <div className={styles.container}>
        <div className={styles.title}>
          {title}
        </div>
        <div className={styles.traces}>
          <Traces />
        </div>
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: '4px',
      width: '100%',
    }),
    title: css({
      backgroundColor: theme.colors.background.secondary,
      fontSize: '1.3rem',
      padding: `${theme.spacing(1.5)} ${theme.spacing(2)}`,
      textAlign: 'center',
    }),
    traces: css({
      padding: theme.spacing(2),
    }),
    tracesRow: css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${theme.spacing(0.5)} 0`,
    }),
    action: css({
      display: 'flex',
      alignItems: 'center',
    }),
    actionText: css({
      padding: `0 ${theme.spacing(1)}`,
    }),
  };
}
