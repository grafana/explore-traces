import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { Select, SelectBaseProps, useStyles2 } from '@grafana/ui';

import { FilterByVariable } from './FilterByVariable';
import { getTraceExplorationScene } from '../../../utils/utils';
import { primarySignalOptions } from '../../../pages/Explore/primary-signals';

interface Props {
  model: FilterByVariable;
}

export function PrimarySignalRenderer({ model }: Props) {
  const exploration = getTraceExplorationScene(model);
  const { primarySignal } = exploration.useState();

  return (
    <BaseSelect
      value={primarySignal}
      options={primarySignalOptions}
      onChange={(v) => v.value && exploration.onChangePrimarySignal(v.value)}
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
      components={{
        IndicatorsContainer: () => null,
        IndicatorSeparator: () => null,
      }}
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

    '& > div': {
      paddingLeft: '8px',
      paddingRight: '8px',
    },
  }),
});
