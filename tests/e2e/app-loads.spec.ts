import { test, expect } from '@playwright/test';

test.describe('App loads correctly', () => {
  test('renders sidebar and canvas without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Sidebar should be visible
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Canvas should be visible
    const canvas = page.locator('.flow-wrapper');
    await expect(canvas).toBeVisible();

    // React Flow viewport should have rendered
    const reactFlowViewport = page.locator('.react-flow__viewport');
    await expect(reactFlowViewport).toBeVisible();

    // No console errors (filter out benign ones)
    const realErrors = consoleErrors.filter(
      (e) => !e.includes('DevTools') && !e.includes('favicon')
    );
    expect(realErrors).toHaveLength(0);
  });

  test('sidebar has all equipment categories', async ({ page }) => {
    await page.goto('/');
    await page.locator('.sidebar').waitFor({ state: 'visible' });

    const categoryHeaders = page.locator('.category-header');
    const headerTexts = await categoryHeaders.allTextContents();
    const joined = headerTexts.join(' ');

    expect(joined).toContain('Sources');
    expect(joined).toContain('Processors');
    expect(joined).toContain('Switchers');
    expect(joined).toContain('Destinations');
    expect(joined).toContain('Utilities');
  });
});
