import React from 'react';
import { render, screen } from '@testing-library/react';

import { PluginExtensionLink, PluginExtensionTypes } from '@grafana/data';
import { setPluginLinksHook } from '@grafana/runtime';

import { AddToInvestigationButton, addToInvestigationButtonLabel, investigationPluginId } from './AddToInvestigationButton';

describe('AddToInvestigationButton', () => {
  it("shouldn't render when a plugin extension link isn't provided by the Explorations app ", async () => {
    setPluginLinksHook(() => ({
      links: [],
      isLoading: false,
    }));
    const scene = new AddToInvestigationButton({});
    render(<scene.Component model={scene} />);
    expect(() => screen.getByLabelText(addToInvestigationButtonLabel)).toThrow();
  });

  it('should render when the Explorations app provides a plugin extension link', async () => {
    setPluginLinksHook(() => ({
      links: [
        mockPluginLinkExtension({
          description: addToInvestigationButtonLabel, // this overrides the aria-label
          onClick: () => {},
          path: '/a/grafana-explorations-app',
          pluginId: investigationPluginId,
          title: 'Explorations',
          type: PluginExtensionTypes.link,
        }),
      ],
      isLoading: false,
    }));
    const scene = new AddToInvestigationButton({});
    render(<scene.Component model={scene} />);
    const button = screen.getByLabelText(addToInvestigationButtonLabel);
    expect(button).toBeInTheDocument();
  });
});

function mockPluginLinkExtension(extension: Partial<PluginExtensionLink>): PluginExtensionLink {
  return {
    type: PluginExtensionTypes.link,
    id: 'plugin-id',
    pluginId: 'grafana-test-app',
    title: 'Test plugin link',
    description: 'Test plugin link',
    path: '/test',
    ...extension,
  };
}
