import { expect, test } from '@playwright/test';
import type { PublicContentSnapshot } from '../src/content';
import { getMapLandmarkScenes } from '../src/tour-data';

const academicsSnapshot = {
  version: 9_001,
  generatedAt: '2026-08-10T00:00:00.000Z',
  source: 'database',
  faculties: [
    {
      id: 'faculty-with-scene',
      slug: 'faculty-with-scene',
      sceneId: 'campusBuilding1',
      name: { th: 'คณะทดสอบที่มีฉาก', en: 'Faculty with tour scene' },
      summary: { th: 'ข้อมูลสรุปคณะทดสอบ', en: 'Test faculty summary' },
      description: { th: 'รายละเอียดคณะทดสอบ', en: 'Test faculty description' },
      images: [],
      source: { label: { th: 'แหล่งข้อมูลทดสอบ', en: 'Test source' } }
    },
    {
      id: 'faculty-without-scene',
      slug: 'faculty-without-scene',
      name: { th: 'คณะทดสอบที่ไม่มีฉาก', en: 'Faculty without tour scene' },
      summary: { th: 'ข้อมูลสรุปคณะที่ไม่มีฉาก', en: 'Faculty without scene summary' },
      description: { th: 'รายละเอียดคณะที่ไม่มีฉาก', en: 'Faculty without scene description' },
      images: [],
      source: { label: { th: 'แหล่งข้อมูลทดสอบ', en: 'Test source' } }
    }
  ],
  programs: [
    {
      id: 'program-with-scene',
      facultyId: 'faculty-with-scene',
      slug: 'program-with-scene',
      name: { th: 'หลักสูตรทดสอบที่มีฉาก', en: 'Program with tour scene' },
      level: { th: 'ปริญญาตรี', en: 'Bachelor degree' },
      summary: { th: 'สรุปหลักสูตรทดสอบ', en: 'Test program summary' },
      description: { th: 'รายละเอียดหลักสูตรทดสอบ', en: 'Test program description' },
      admission: { th: 'ตรวจสอบประกาศรับสมัคร', en: 'See the latest admission notice' },
      source: { label: { th: 'แหล่งข้อมูลทดสอบ', en: 'Test source' } }
    },
    {
      id: 'program-without-scene',
      facultyId: 'faculty-without-scene',
      slug: 'program-without-scene',
      name: { th: 'หลักสูตรทดสอบที่ไม่มีฉาก', en: 'Program without tour scene' },
      level: { th: 'ปริญญาตรี', en: 'Bachelor degree' },
      summary: { th: 'สรุปหลักสูตรทดสอบ', en: 'Test program summary' },
      description: { th: 'รายละเอียดหลักสูตรทดสอบ', en: 'Test program description' },
      admission: { th: 'ตรวจสอบประกาศรับสมัคร', en: 'See the latest admission notice' },
      source: { label: { th: 'แหล่งข้อมูลทดสอบ', en: 'Test source' } }
    }
  ],
  activities: [],
  hotspots: []
} satisfies PublicContentSnapshot;

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

test('program details link back to the faculty and navigate only when the faculty has a tour scene', async ({ page }) => {
  await page.route('**/api/content', async (route) => {
    await route.fulfill({ json: academicsSnapshot });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'En' }).click();
  await expect(page.getByRole('button', { name: 'Start the tour' })).toBeEnabled({ timeout: 60_000 });

  await page.locator('.app-header').getByRole('button', { name: 'Faculties and programs' }).click();
  const academicsDialog = page.locator('dialog[open]');
  await academicsDialog.locator('.academics-faculties').getByRole('button', { name: /Faculty with tour scene/ }).click();
  await academicsDialog.locator('.academics-program-list').getByRole('button', { name: /Program with tour scene/ }).click();

  const facultyCard = page.locator('.academics-program-faculty');
  await expect(facultyCard).toContainText('Faculty affiliation');
  await expect(facultyCard).toContainText('Faculty with tour scene');
  await expect(facultyCard.getByRole('button', { name: 'View faculty details' })).toBeVisible();
  await expect(facultyCard.getByRole('button', { name: 'Go to the faculty in the 360 tour' })).toBeVisible();

  await facultyCard.getByRole('button', { name: 'View faculty details' }).click();
  await expect(page.locator('.academics-layout')).not.toHaveClass(/has-program/);
  await expect(academicsDialog.getByRole('heading', { name: 'Faculty with tour scene' }).first()).toBeVisible();

  await academicsDialog.locator('.academics-program-list').getByRole('button', { name: /Program with tour scene/ }).click();
  await academicsDialog.getByRole('button', { name: 'Go to the faculty in the 360 tour' }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('#scene-title')).toHaveText('Faculty with tour scene', { timeout: 60_000 });

  await page.locator('.app-header').getByRole('button', { name: 'Faculties and programs' }).click();
  await academicsDialog.locator('.academics-faculties').getByRole('button', { name: /Faculty without tour scene/ }).click();
  await academicsDialog.locator('.academics-program-list').getByRole('button', { name: /Program without tour scene/ }).click();
  await expect(academicsDialog.locator('.academics-program-faculty')).toContainText('Faculty without tour scene');
  await expect(academicsDialog.getByRole('button', { name: 'Go to the faculty in the 360 tour' })).toHaveCount(0);
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
  await expect(page.locator('.tour-map-landmark-marker')).toHaveCount(getMapLandmarkScenes().length);
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
