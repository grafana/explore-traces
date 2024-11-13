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

  test('menu click should visit default explore traces url', async ({ page }) => {
    await explorePage.click(page.getByTestId('data-testid Toggle menu'));
    await explorePage.click(page.getByTestId('data-testid navigation mega-menu').getByRole('link', { name: 'Traces' }));
    await expect(page).toHaveURL("http://localhost:3001/a/grafana-exploretraces-app/explore?primarySignal=full_traces&from=now-15m&to=now&var-ds=tempo&var-filters=nestedSetParent%7C%3C%7C0&var-metric=rate&var-groupBy=resource.service.name&var-latencyThreshold=&var-partialLatencyThreshold=&refresh=&actionView=breakdown");
  });
});
