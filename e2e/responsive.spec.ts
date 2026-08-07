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
