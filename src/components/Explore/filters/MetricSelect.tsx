import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { Select, SelectBaseProps, useStyles2 } from '@grafana/ui';

import { FilterByVariable } from './FilterByVariable';
import { getMetricValue, getTraceExplorationScene } from '../../../utils/utils';
import { MetricFunction } from '../../../utils/shared';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from 'utils/analytics';

interface Props {
  model: FilterByVariable;
}

export function MetricSelect({ model }: Props) {
  const metric = getMetricValue(model);

  return (
    <BaseSelect
      value={metric as MetricFunction}
      options={[
        { label: 'Rate', value: 'rate' },
        { label: 'Errors', value: 'errors' },
        { label: 'Duration', value: 'duration' },
      ]}
      onChange={(v) => {
        v.value && getTraceExplorationScene(model).onChangeMetricFunction(v.value);
      
        reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.metric_changed, {
          metric: v.value,
          location: 'filter',
        });
      }}
    />
  );
}

export const BaseSelect = (props: SelectBaseProps<string>) => {
  const styles = useStyles2(getStyles);
  return (
    <Select
      width="auto"
      {...props}
      className={css(styles.control, props.className)}
    />
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  control: css({
    padding: 0,
    border: `1px solid ${theme.colors.border.weak}`,
    background: '#CCCCDC0D',
    fontSize: 12,
    minHeight: 'auto',
    height: '22px',
    lineHeight: '18px',
    boxSizing: 'border-box',
    boxShadow: 'none',

    'svg': {
      marginRight: '-4px',
    },
  }),
});
