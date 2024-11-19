import { expect, test } from '@grafana/plugin-e2e';
import { ExplorePage } from './fixtures/explore';

test.describe('navigating app', () => {
  let explorePage: ExplorePage;
  
  test.beforeEach(async ({ page }) => {
    explorePage = new ExplorePage(page);
    await explorePage.gotoExplorePage();
    await explorePage.assertNotLoading();
  });

  test.afterEach(async () => {
    await explorePage.unroute();
  });

  test('explore page should render successfully', async ({ page }) => {
    await expect(page.getByText('Data source')).toBeVisible();
    await explorePage.assertMissingData();
  });
});
