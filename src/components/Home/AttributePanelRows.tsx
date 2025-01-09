import { css } from "@emotion/css";
import { DataFrame, Field, GrafanaTheme2, urlUtil } from "@grafana/data";
import { Icon, useStyles2 } from "@grafana/ui";
import React from "react";
import { formatDuration } from "utils/dates";
import { EXPLORATIONS_ROUTE, MetricFunction, ROUTES } from "utils/shared";
import { AttributePanelRow } from "./AttributePanelRow";

type Props = {
  series?: DataFrame[];
  type: MetricFunction;
  message?: string;
}

export const AttributePanelRows = (props: Props) => {
  const { series, type, message } = props;
  const styles = useStyles2(getStyles);

  if (message) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          <Icon 
            className={styles.icon}
            name='exclamation-circle'
            size='xl'
          />
          {message}
        </div>
      </div>
    );
  }

  if (series && series.length > 0) {
    if (type === 'errors') {
      const getLabel = (df: DataFrame) => {
        const valuesField = df.fields.find((f) => f.name !== 'time');
        return valuesField?.labels?.['resource.service.name'].replace(/"/g, '') ??  'Service name not found';
      }

      const getUrl = (df: DataFrame) => {
        const serviceName = getLabel(df);
        const params = {
          'var-filters': `resource.service.name|=|${serviceName}`,
          'var-metric': type,
        }
        const url = urlUtil.renderUrl(EXPLORATIONS_ROUTE, params);
        return `${url}&var-filters=nestedSetParent|<|0`;
      }

      const getTotalErrs = (df: DataFrame) => {
        const valuesField = df.fields.find((f) => f.name !== 'time');
        return valuesField?.values?.reduce((x, acc) => x + acc) ?? 1;
      }

      return (
        <div className={styles.container}>
          {series
          .sort((a, b) => getTotalErrs(b) - getTotalErrs(a))
          .slice(0, 10)?.map((df, index) => (
            <span key={index}>
              <AttributePanelRow 
                type={type} 
                index={index}
                label={getLabel(df)}
                labelTitle='Service'
                value={getTotalErrs(df)}
                valueTitle='Total errors'
                url={getUrl(df)}
              />
            </span>
          ))}
        </div>
      );
    }

    const durField = series[0].fields.find((f) => f.name === 'duration');
    if (durField && durField.values) {
      const sortedByDuration = durField?.values.map((_, i) => i)?.sort((a, b) => durField?.values[b] - durField?.values[a]);
      const sortedFields = series[0].fields.map((f) => {
        return {
          ...f,
          values: sortedByDuration?.map((i) => f.values[i]),
        };
      });

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

      const getDuration = (durationField: Field | undefined, index: number) => {
        if (!durationField || !durationField.values) {
          return 'Duration not found';
        }

        return formatDuration(durationField.values[index] / 1000);
      }

      const traceIdField = sortedFields.find((f) => f.name === 'traceIdHidden');
      const spanIdField = sortedFields.find((f) => f.name === 'spanID');
      const traceNameField = sortedFields.find((f) => f.name === 'traceName');
      const traceServiceField = sortedFields.find((f) => f.name === 'traceService');
      const durationField = sortedFields.find((f) => f.name === 'duration');

      return (
        <div className={styles.container}>
          {traceIdField?.values?.map((traceId, index) => (
            <span key={index}>
              <AttributePanelRow 
                type={type} 
                index={index}
                label={getLabel(traceServiceField, traceNameField, index)}
                labelTitle='Trace'
                value={getDuration(durationField, index)}
                valueTitle='Duration'
                url={getUrl(traceId, spanIdField, traceServiceField, index)}
              />
            </span>
          ))}
        </div>
      );
    }
  }
  return <div className={styles.container}>No series data</div>;
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      padding: `${theme.spacing(2)} 0`,
    }),
    icon: css({
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
