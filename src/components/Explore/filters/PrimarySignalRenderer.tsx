import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { Select, SelectBaseProps, Text, useStyles2 } from '@grafana/ui';

import { FilterByVariable } from './FilterByVariable';
import { getTraceExplorationScene } from '../../../utils/utils';
import { primarySignalOptions } from '../../../pages/Explore/primary-signals';

interface Props {
  model: FilterByVariable;
}

export function PrimarySignalRenderer({ model }: Props) {
  const exploration = getTraceExplorationScene(model);
  const { primarySignal } = exploration.useState();
  const styles = useStyles2(getStyles);

  return (
    <BaseSelect
      value={primarySignal}
      // Allows us to add a custom border to the bottom of the group heading
      options={[{
        options: primarySignalOptions,
      }]}
      components={{
        GroupHeading: () => <div className={styles.heading}><Text weight="bold" variant="bodySmall" color="secondary">Primary signal</Text></div>,
      }}
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
  heading: css({
    padding: theme.spacing(1, 1, 1, 0.75),
    borderLeft: '2px solid transparent',
    borderBottom: `1px solid ${theme.colors.border.weak}`,
  }),
});
