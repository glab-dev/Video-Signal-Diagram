import { test, expect } from '@playwright/test';

test.describe('Adding nodes from sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.sidebar').waitFor({ state: 'visible' });
  });

  test('clicking a source button adds a node to the canvas', async ({ page }) => {
    const nodesBefore = await page.locator('.react-flow__node').count();
    expect(nodesBefore).toBe(0);

    const macButton = page.locator('.node-btn', { hasText: 'Mac' });
    await expect(macButton).toBeVisible();
    await macButton.click();

    const nodesAfter = page.locator('.react-flow__node');
    await expect(nodesAfter).toHaveCount(1, { timeout: 5000 });

    const genericNode = page.locator('.node-generic-io');
    await expect(genericNode).toBeVisible();
    await expect(genericNode).toContainText('Mac');
  });

  test('added node has reasonable rendered dimensions', async ({ page }) => {
    const macButton = page.locator('.node-btn', { hasText: 'Mac' });
    await macButton.click();

    const node = page.locator('.react-flow__node').first();
    await expect(node).toBeVisible({ timeout: 5000 });

    // Wait for React Flow to measure and lay out the node
    await page.waitForTimeout(500);

    const box = await node.boundingBox();
    expect(box).not.toBeNull();

    // Node should have positive, reasonable dimensions
    // Not collapsed (>50px) and not absurdly large (<2000px)
    expect(box!.width).toBeGreaterThan(50);
    expect(box!.width).toBeLessThan(2000);
    expect(box!.height).toBeGreaterThan(30);
    expect(box!.height).toBeLessThan(2000);
  });

  test('adding a processor node works', async ({ page }) => {
    const bromptonButton = page.locator('.node-btn', { hasText: 'Brompton SX40' });
    await expect(bromptonButton).toBeVisible();
    await bromptonButton.click();

    const processorNode = page.locator('.node-processor');
    await expect(processorNode).toBeVisible({ timeout: 5000 });
    await expect(processorNode).toContainText('Brompton SX40');
  });

  test('adding a switcher node works', async ({ page }) => {
    const atemButton = page.locator('.node-btn', { hasText: 'ATEM Mini Pro' });
    await expect(atemButton).toBeVisible();
    await atemButton.click();

    const switcherNode = page.locator('.node-switcher');
    await expect(switcherNode).toBeVisible({ timeout: 5000 });
    await expect(switcherNode).toContainText('ATEM Mini Pro');
  });

  test('multiple nodes can be added sequentially', async ({ page }) => {
    const macButton = page.locator('.node-btn', { hasText: 'Mac' });
    await macButton.click();
    await macButton.click();
    await macButton.click();

    const nodes = page.locator('.react-flow__node');
    await expect(nodes).toHaveCount(3, { timeout: 5000 });
  });
});
