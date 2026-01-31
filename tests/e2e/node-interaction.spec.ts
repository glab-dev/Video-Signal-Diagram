import { test, expect } from '@playwright/test';

test.describe('Node interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.sidebar').waitFor({ state: 'visible' });

    // Add a node to interact with
    const macButton = page.locator('.node-btn', { hasText: 'Mac' });
    await macButton.click();
    await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 5000 });
  });

  test('clicking a node selects it', async ({ page }) => {
    const node = page.locator('.react-flow__node').first();
    await node.click();

    // React Flow adds .selected class to selected nodes
    await expect(node).toHaveClass(/selected/, { timeout: 2000 });
  });

  test('pressing Delete removes a selected node', async ({ page }) => {
    const node = page.locator('.react-flow__node').first();
    await node.click();
    await expect(node).toHaveClass(/selected/, { timeout: 2000 });

    await page.keyboard.press('Delete');

    await expect(page.locator('.react-flow__node')).toHaveCount(0, { timeout: 3000 });
  });

  test('node displays correct port labels', async ({ page }) => {
    const node = page.locator('.node-generic-io').first();

    // Mac has outputs: HDMI, USB-C, Thunderbolt
    await expect(node).toContainText('HDMI');
    await expect(node).toContainText('USB-C');
    await expect(node).toContainText('Thunderbolt');
  });
});
