import React from 'react';

import { Box, Stack, Text, useStyles2 } from '@grafana/ui';

import { GrotNotFound } from './GrotNotFound';
import { css } from '@emotion/css';

export interface Props {
  message: string;
}

export const EmptyState = ({ message }: Props) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <Box paddingY={8}>
        <Stack direction="column" alignItems="center" gap={3}>
          <GrotNotFound width={300} />
          <Text variant="h5">{message}</Text>
        </Stack>
      </Box>
    </div>
  );
};

EmptyState.displayName = 'EmptyState';

function getStyles() {
  return {
    container: css({
      width: '100%',
      display: 'flex',
      justifyContent: 'space-evenly',
      flexDirection: 'column',
    }),
  };
}
