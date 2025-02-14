import { LinkButton } from '@grafana/ui';
import { OpenInExploreTracesButtonProps } from 'components/OpenInExploreTracesButton/types';
import React, { lazy, Suspense } from 'react';
const OpenInExploreTracesButton = lazy(() => import('components/OpenInExploreTracesButton/OpenInExploreTracesButton'));

function SuspendedOpenInExploreTracesButton(props: OpenInExploreTracesButtonProps) {
  return (
    <Suspense
      fallback={
        <LinkButton variant="secondary" disabled>
          Open in Explore Traces
        </LinkButton>
      }
    >
      <OpenInExploreTracesButton {...props} />
    </Suspense>
  );
}

export const exposedComponents = [
  {
    id: 'grafana-exploretraces-app/open-in-explore-traces-button/v1',
    title: 'Open in Explore Traces button',
    description: 'A button that opens a traces view in the Explore Traces app.',
    component: SuspendedOpenInExploreTracesButton,
  },
];
