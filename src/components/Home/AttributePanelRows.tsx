import { css } from "@emotion/css";
import { DataFrame, dateTimeFormat, Field, GrafanaTheme2, urlUtil } from "@grafana/data";
import { locationService } from "@grafana/runtime";
import { Icon, useStyles2 } from "@grafana/ui";
import React from "react";
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from "utils/analytics";
import { formatDuration } from "utils/dates";
import { EXPLORATIONS_ROUTE, MetricFunction, ROUTES } from "utils/shared";

type Props = {
  series?: DataFrame[];
  type: MetricFunction;
  message?: string;
}

export const AttributePanelRows = (props: Props) => {
  const { series, type, message } = props;
  const styles = useStyles2(getStyles);

  const getLabel = (traceServiceField: Field | undefined, traceNameField: Field | undefined, index: number) => {
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
      return `${diff}s`;
    } else if (diff < 3600) {
      return `${Math.floor(diff / 60)}m`;
    } else if (diff < 86400) {
      return `${Math.floor(diff / 3600)}h`;
    } else {
      return `${Math.floor(diff / 86400)}d`;
    }
  }

  const getDuration = (durationField: Field | undefined, index: number) => {
    if (!durationField || !durationField.values) {
      return 'Durations not found';
    }

    return formatDuration(durationField.values[index] / 1000);
  }

  const getUrl = (traceId: string, spanIdField: Field | undefined, traceServiceField: Field | undefined, index: number) => {
    if (!spanIdField || !spanIdField.values[index] || !traceServiceField || !traceServiceField.values[index]) {
      console.error('SpanId or traceService not found');
      return ROUTES.Explore;
    }

    const params = {
      traceId,
      spanId: spanIdField.values[index],
      'var-filters': `resource.service.name|=|${traceServiceField.values[index]}`,
      'var-metric': type,
    }
    const url = urlUtil.renderUrl(EXPLORATIONS_ROUTE, params);

    return `${url}&var-filters=nestedSetParent|<|0`;
  }

  if (message) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          <Icon 
            className={styles.actionIcon}
            name='exclamation-circle'
            size='xl'
          />
          {message}
        </div>
      </div>
    );
  }

  if (series && series.length > 0) {
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

      return (
        <div className={styles.container}>
          {traceIdField?.values?.map((traceId, index) => (
            <div key={index}>
              {index === 0 && (
                <div className={styles.rowHeader}>
                  <span>Trace Name</span>
                  <span className={styles.rowHeaderText}>{type === 'duration' ? 'Duration' : 'Since'}</span>
                </div>
              )}

              <div 
                className={styles.row} 
                key={index} 
                onClick={() => {
                  reportAppInteraction(USER_EVENTS_PAGES.home, USER_EVENTS_ACTIONS.home.attribute_panel_item_clicked, {
                    type,
                    index,
                    value: type === 'duration' ? getDuration(durationField, index) : getErrorTimeAgo(timeField, index)
                  });
                  const url = getUrl(traceId, spanIdField, traceServiceField, index);
                  locationService.push(url);
                }}
              >
                <div className={'rowLabel'}>{getLabel(traceServiceField, traceNameField, index)}</div>
                
                <div className={styles.action}>
                  <span className={styles.actionText}>
                    {type === 'duration' ? getDuration(durationField, index) : getErrorTimeAgo(timeField, index)} 
                  </span>
                  <Icon 
                    className={styles.actionIcon}
                    name='arrow-right'
                    title='View spans for this request'
                    size='xl'
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
  }
  return <></>;
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      padding: `${theme.spacing(2)} 0`,
    }),
    rowHeader: css({
      color: theme.colors.text.secondary,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `0 ${theme.spacing(2)} ${theme.spacing(1)} ${theme.spacing(2)}`,
    }),
    rowHeaderText: css({
      margin: '0 45px 0 0',
    }),
    row: css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing(2),
      padding: `${theme.spacing(0.75)} ${theme.spacing(2)}`,

      '&:hover': {
        backgroundColor: theme.isDark ? theme.colors.background.secondary : theme.colors.background.primary,
        cursor: 'pointer',
        '.rowLabel': {
          textDecoration: 'underline',
        }
      },
    }),
    action: css({
      display: 'flex',
      alignItems: 'center',
    }),
    actionText: css({
      color: '#d5983c',
      padding: `0 ${theme.spacing(1)}`,
      width: 'max-content',
    }),
    actionIcon: css({
      cursor: 'pointer',
      margin: `0 ${theme.spacing(0.5)} 0 ${theme.spacing(1)}`,
    }),

    message: css({
      display: 'flex',
      gap: theme.spacing(1.5),
      margin: `${theme.spacing(2)} auto`,
      width: '60%',
    }),
  };
}
