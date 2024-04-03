import React from 'react';

import { Box, Stack, Text } from '@grafana/ui';

import { GrotNotFound } from './GrotNotFound';

export interface Props {
  message: string;
}

export const EmptyState = ({ message }: Props) => {
  return (
    <Box paddingY={8}>
      <Stack direction="column" alignItems="center" gap={3}>
        <GrotNotFound width={300} />
        <Text variant="h5">{message}</Text>
      </Stack>
    </Box>
  );
};

EmptyState.displayName = 'EmptyState';
