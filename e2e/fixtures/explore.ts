import { Locator, Page } from '@playwright/test';
import pluginJson from '../../src/plugin.json';
import { expect } from '@grafana/plugin-e2e';
import { testIds } from '../../src/utils/testIds';

export class ExplorePage {
  constructor(public readonly page: Page) {}

  async gotoExplorePage() {
    await this.page.goto(`/a/${pluginJson.id}/explore`);
  }

  async unroute() {
    await this.page.unrouteAll({ behavior: 'ignoreErrors' });
  }

  async assertNotLoading() {
    const loading = this.page.getByText('Loading');
    await expect(loading).toHaveCount(0);
  }

  async assertMissingData() {
    await expect(this.page.getByTestId(testIds.emptyState)).not.toBeVisible();
    await expect(this.page.getByTestId(testIds.errorState)).not.toBeVisible();
    await expect(this.page.getByTestId(testIds.loadingState)).not.toBeVisible();
  }

  async click(locator: Locator) {
    await expect(locator).toBeVisible();
    await locator.scrollIntoViewIfNeeded();
    await locator.click({ force: true });
  }
}
