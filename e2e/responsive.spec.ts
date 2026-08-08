import { expect, test } from '@playwright/test';

test('public tour and AI chat remain available at the configured viewport', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('img[src="/mainimages/Logo_FitM/FITM_LOGO.png"]').first()).toBeVisible();
  const startButton = page.getByRole('button', { name: /เริ่มเยี่ยมชม|Start the tour/ });
  await expect(startButton).toBeEnabled({ timeout: 60_000 });
  await startButton.click();
  const chatToggle = page.getByRole('button', { name: /AI|ผู้ช่วย/ }).last();
  await chatToggle.click();
  await expect(page.locator('#tour-chat-panel')).toBeVisible();
  await expect(page.locator('#tour-chat-input')).toBeVisible();
  await expect(page.locator('.persistent-tour-map')).toBeHidden();
  await expect(page.locator('.control-rail')).toBeHidden();
});

test('admin login has a responsive setup state and no public registration form', async ({ page }) => {
  await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Admin|เข้าสู่ระบบ/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /สมัคร|register/i })).toHaveCount(0);
});

test('map follows the virtual visitor, fills its panel, and expands without a white border', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const startButton = page.getByRole('button', { name: /เริ่มเยี่ยมชม|Start the tour/ });
  await expect(startButton).toBeEnabled({ timeout: 60_000 });
  await startButton.click();

  const mapPanel = page.locator('.persistent-tour-map');
  await expect(mapPanel).toBeVisible();
  await expect(page.locator('.tour-map-user__dot')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.tour-map-user__direction')).toHaveCount(0);
  await expect(page.locator('.tour-map-landmark-marker')).toHaveCount(9);
  await expect(page.locator('.tour-map-marker')).toHaveCount(0);
  expect(await page.locator('.leaflet-overlay-pane path').count()).toBeGreaterThan(0);
  expect(await mapPanel.evaluate((element) => getComputedStyle(element).borderTopWidth)).toBe('0px');
  const mapBox = await mapPanel.boundingBox();
  const viewport = page.viewportSize();
  expect(mapBox?.width ?? 0).toBeGreaterThanOrEqual(Math.min(320, (viewport?.width ?? 20) - 20));

  await page.getByRole('button', { name: /ตัวเลือกแผนที่เพิ่มเติม|More map options/ }).click();
  await page.getByRole('button', { name: /ขยายแผนที่|Expand map/ }).click();
  await expect(mapPanel).toHaveClass(/is-expanded/);
  const expandedBox = await mapPanel.boundingBox();
  expect(expandedBox?.width ?? 0).toBeGreaterThan((viewport?.width ?? 0) * 0.9);
  expect(expandedBox?.height ?? 0).toBeGreaterThan((viewport?.height ?? 0) * 0.7);
  await page.keyboard.press('Escape');
  await expect(mapPanel).not.toHaveClass(/is-expanded/);

  await page.getByRole('button', { name: /กิจกรรม|Activities/ }).click();
  await expect(page.getByRole('heading', { name: /กิจกรรมภายในมหาวิทยาลัย|University activities/ })).toBeVisible();
});
