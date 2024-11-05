import React from 'react';

import { Stack, Text, useStyles2 } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';

import { GrotNotFound } from './GrotNotFound';
import { css } from '@emotion/css';
import { testIds } from 'utils/testIds';

export interface Props {
  message?: string | React.ReactNode;
  imgWidth?: number;
  padding?: string;
}

export const EmptyState = ({ message, imgWidth, padding }: Props) => {
  const styles = useStyles2(getStyles, padding);

  return (
    <div className={styles.container} data-testid={testIds.emptyState}>
      <Stack direction="column" alignItems="center" gap={3}>
        <GrotNotFound width={imgWidth ?? 300} />
        {typeof message === 'string' &&  <Text textAlignment={'center'} variant="h5">{message}</Text>}
        {typeof message !== 'string' &&  message}
      </Stack>
    </div>
  );
};

EmptyState.displayName = 'EmptyState';

function getStyles(theme: GrafanaTheme2, padding?: string) {
  return {
    container: css({
      width: '100%',
      display: 'flex',
      justifyContent: 'space-evenly',
      flexDirection: 'column',
      padding: padding ? padding : 0,
    }),
  };
}
