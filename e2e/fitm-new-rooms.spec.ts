import { expect, test, type Page } from '@playwright/test';

async function startTour(page: Page, sceneId: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/?scene=${sceneId}`, { waitUntil: 'domcontentloaded' });
  const start = page.locator('.intro .primary-button');
  await expect(start).toBeEnabled({ timeout: 60_000 });
  await start.click();
  // The existing tour auto-rotates after two seconds. Stop it through the UI
  // so Playwright can target a stationary doorway just as a visitor would.
  const compact = (page.viewportSize()?.width ?? 0) <= 1024;
  if (compact) await page.locator('.compact-tour-dock button').nth(2).click();
  const rotate = page.getByRole('button', { name: /หมุนอัตโนมัติ|Automatic rotation/i });
  await expect(rotate).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });
  await rotate.click();
  await expect(rotate).toHaveAttribute('aria-pressed', 'false');
  if (compact) await page.locator('.compact-tour-dock button').nth(2).click();
}

test('Phuang Saed doorway enters and returns through the panorama arrows', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startTour(page, 'fitmInterior1');
  if ((page.viewportSize()?.width ?? 0) > 1024) {
    await page.locator('.scene-panel .close-icon').click();
  }
  const entry = page.locator('.tour-arrow[data-target="puangSaedRoom"]');
  await expect(entry).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: testInfo.outputPath('phuang-saed-doorway.png') });
  if (testInfo.project.use.hasTouch) await entry.tap();
  else await entry.click();
  await expect(page.locator('#scene-title')).toHaveText(/ห้องพวงแสด|Phuang Saed Room/);
  const back = page.locator('.tour-arrow[data-target="fitmInterior1"]');
  await expect(back).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: testInfo.outputPath('phuang-saed-room.png') });
  if (testInfo.project.use.hasTouch) await back.tap();
  else await back.click();
  await expect(entry).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
});

test('floor 4 samples load on demand and return to the unchanged main scene', async ({ page }, testInfo) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/mainimages/')) requests.push(new URL(request.url()).pathname);
  });
  await startTour(page, 'fitmFloor4Point4');
  if ((page.viewportSize()?.width ?? 0) <= 1024) {
    await page.locator('.compact-tour-dock button').first().click();
  }
  const titleBefore = await page.locator('#scene-title').textContent();
  const mainPanorama = '/mainimages/temp-faculty-floor4-4.jpg';
  const mainRequests = requests.filter((url) => url === mainPanorama).length;
  const classroomPath = '/mainimages/temp-faculty-floor4-4-20.jpg';
  const laboratoryPath = '/mainimages/temp-faculty-floor4-4-01A.jpg';
  expect(requests).not.toContain(classroomPath);
  expect(requests).not.toContain(laboratoryPath);
  const trigger = page.getByRole('button', { name: /ห้องเรียนตัวอย่าง|Sample classrooms/ });
  await trigger.click();
  const dialog = page.locator('dialog.app-dialog[open]');
  await expect(dialog.getByRole('tab', { selected: true })).toHaveText(/4-20.*120/);
  await expect.poll(() => requests.includes(classroomPath)).toBe(true);
  await expect(dialog.locator('.supplemental-panorama__viewer canvas')).toBeVisible({ timeout: 30_000 });
  await dialog.getByRole('tab', { name: /4-01A.*4-01B/ }).click();
  await expect(dialog.getByRole('tab', { selected: true })).toHaveText(/4-01A.*4-01B/);
  await expect.poll(() => requests.includes(laboratoryPath)).toBe(true);
  await expect(dialog.locator('.supplemental-panorama__viewer canvas')).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('floor-4-laboratory-sample.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator('#scene-title')).toHaveText(titleBefore!);
  expect(requests.filter((url) => url === mainPanorama)).toHaveLength(mainRequests);
});
