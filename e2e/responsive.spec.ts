import { expect, test, type Page } from '@playwright/test';
import type { PublicContentSnapshot } from '../src/content';
import { getMapLandmarkScenes } from '../src/tour-data';
import type { TourStructureSnapshot } from '../src/tour-structure';

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

async function openHeaderAction(page: Page, name: RegExp): Promise<void> {
  const action = page.locator('.header-nav').getByRole('button', { name });
  if (!await action.isVisible()) {
    await page.getByRole('button', { name: /เปิดเมนูหลัก|Open main menu/ }).click();
    await expect(action).toBeVisible();
  }
  await action.click();
}

test('Admin Login tolerates password-manager attributes added before hydration', async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('hydrated')) {
      hydrationErrors.push(message.text());
    }
  });
  await page.addInitScript(() => {
    const markLoginControls = (): void => {
      document.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
        '#admin-email, #admin-password, .admin-login__form button'
      ).forEach((control, index) => control.setAttribute('fdprocessedid', `test-${index}`));
    };
    new MutationObserver(markLoginControls).observe(document, { childList: true, subtree: true });
    markLoginControls();
  });
  await page.goto('/admin/login', { waitUntil: 'networkidle' });
  await expect(page.locator('#admin-email')).toHaveAttribute('fdprocessedid');
  expect(hydrationErrors).toEqual([]);
});

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

test('same-version structure signature refreshes arrows without losing the current scene', async ({ page }) => {
  const structureResponse = await page.request.get('/api/tour-structure');
  expect(structureResponse.ok()).toBe(true);
  const changed = structuredClone(await structureResponse.json() as TourStructureSnapshot);
  const startScene = changed.data.scenes.find((scene) => scene.id === changed.data.startSceneId)!;
  const arrow = startScene.hotspots.find((hotspot) => hotspot.type === 'scene');
  expect(arrow?.type).toBe('scene');
  if (!arrow || arrow.type !== 'scene') return;
  const replacementTarget = changed.data.scenes.find((scene) => (
    !scene.archived && scene.id !== startScene.id && scene.id !== arrow.target
  ))!.id;

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const startButton = page.locator('.intro .primary-button');
  await expect(startButton).toBeEnabled({ timeout: 60_000 });
  await startButton.click();
  await expect(page.locator(`.tour-arrow[data-target="${arrow.target}"]`).first()).toBeVisible({ timeout: 15_000 });
  const sceneTitle = await page.locator('#scene-title').textContent();
  const viewerContainer = page.locator('#tour-viewer .psv-container');
  await expect(viewerContainer).toBeVisible();
  await viewerContainer.evaluate((element) => element.setAttribute('data-playwright-viewer-instance', 'preserve-me'));

  arrow.target = replacementTarget;
  await page.route('**/api/tour-structure', async (route) => {
    if (route.request().method() === 'HEAD') {
      await route.fulfill({
        status: 200,
        headers: {
          'X-Tour-Structure-Version': String(changed.version),
          'X-Tour-Structure-Source': changed.source,
          'X-Tour-Structure-Signature': 'playwright-same-version-change'
        }
      });
      return;
    }
    await route.fulfill({ status: 200, json: changed });
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));

  await expect(page.locator(`.tour-arrow[data-target="${replacementTarget}"]`).first())
    .toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#scene-title')).toHaveText(sceneTitle ?? '');
  await expect(page.locator('#tour-viewer .psv-container[data-playwright-viewer-instance="preserve-me"]')).toBeVisible();
});

test('compact tour UI keeps the panorama clear and opens one panel at a time', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const startButton = page.locator('.intro .primary-button');
  await expect(startButton).toBeEnabled({ timeout: 60_000 });
  await startButton.click();
  const viewport = page.viewportSize();
  const compactUi = (viewport?.width ?? 0) <= 1024;

  if (!compactUi) {
    await expect(page.locator('.compact-tour-dock')).toBeHidden();
    await expect(page.locator('.control-rail')).toBeVisible();
    return;
  }

  const headerBox = await page.locator('.app-header').boundingBox();
  const summaryBox = await page.locator('.compact-scene-summary').boundingBox();
  const dockBox = await page.locator('.compact-tour-dock').boundingBox();
  const previewBox = await page.locator('.persistent-tour-map').boundingBox();
  expect(headerBox?.height ?? 0).toBeLessThanOrEqual(56);
  expect(summaryBox?.height ?? 0).toBeLessThanOrEqual(42);
  expect(dockBox?.height ?? 0).toBeLessThanOrEqual(60);
  expect(previewBox?.width ?? 0).toBeLessThanOrEqual((viewport?.width ?? 0) <= 600 ? 160 : 200);
  await expect(page.locator('.scene-panel')).toBeHidden();
  await expect(page.locator('.control-rail')).toBeHidden();

  const dockButtons = page.locator('.compact-tour-dock button');
  await dockButtons.nth(0).click();
  await expect(page.locator('.scene-panel')).toBeVisible();
  await expect(page.locator('.persistent-tour-map')).toBeHidden();

  await dockButtons.nth(2).click();
  await expect(page.locator('.scene-panel')).toBeHidden();
  await expect(page.locator('.compact-tool-popover')).toBeVisible();

  await dockButtons.nth(3).click();
  await expect(page.locator('.compact-tool-popover')).toBeHidden();
  const chatPanel = page.locator('#tour-chat-panel');
  await expect(chatPanel).toBeVisible();
  const chatBox = await chatPanel.boundingBox();
  expect(chatBox?.height ?? 0).toBeLessThanOrEqual((viewport?.height ?? 0) * 0.4 + 2);

  await dockButtons.nth(3).click();
  await expect(chatPanel).toBeHidden();
  await expect(page.locator('.persistent-tour-map')).toBeVisible();
  await expect(page.locator('.persistent-tour-map')).toHaveClass(/is-preview/);

  const menuToggle = page.locator('.header-menu-toggle');
  await menuToggle.click();
  await expect(page.locator('.header-nav')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.header-nav')).toBeHidden();
  await expect(menuToggle).toBeFocused();
});

test('Info hotspots open from a real mobile tap without opening after a drag', async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip((viewport?.width ?? 0) > 1024, 'Touch hotspot behavior is covered by compact touch viewports.');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const startButton = page.locator('.intro .primary-button');
  await expect(startButton).toBeEnabled({ timeout: 60_000 });
  await startButton.click();

  const marker = page.locator('.info-hotspot').first();
  await expect(marker).toBeVisible({ timeout: 15_000 });
  const markerBox = await marker.boundingBox();
  expect(markerBox).not.toBeNull();
  await page.touchscreen.tap(
    (markerBox?.x ?? 0) + (markerBox?.width ?? 0) / 2,
    (markerBox?.y ?? 0) + (markerBox?.height ?? 0) / 2
  );
  await expect(page.locator('dialog.app-dialog[open]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.app-dialog[open]')).toHaveCount(0);

  await marker.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const common = {
      bubbles: true,
      pointerId: 73,
      pointerType: 'touch',
      isPrimary: true
    };
    element.dispatchEvent(new PointerEvent('pointerdown', {
      ...common,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    }));
    element.dispatchEvent(new PointerEvent('pointermove', {
      ...common,
      clientX: rect.left + rect.width / 2 + 28,
      clientY: rect.top + rect.height / 2 + 18
    }));
    element.dispatchEvent(new PointerEvent('pointerup', {
      ...common,
      clientX: rect.left + rect.width / 2 + 28,
      clientY: rect.top + rect.height / 2 + 18
    }));
  });
  await expect(page.locator('dialog.app-dialog[open]')).toHaveCount(0);
});

test('executive office Info and downstairs arrow work from their exact FITM scene', async ({ page }) => {
  await page.goto('/?scene=fitmFloor3Point2', { waitUntil: 'domcontentloaded' });
  const startButton = page.locator('.intro .primary-button');
  await expect(startButton).toBeEnabled({ timeout: 60_000 });
  await startButton.click();
  await expect(page.locator('#scene-title')).toContainText(/ภายในอาคาร FITM ชั้น 3 จุดที่ 2|Inside FITM, Floor 3, Point 2/);
  await expect(page.locator('#scene-title')).not.toContainText(/ห้องผู้บริหาร|Executive Office/);

  const marker = page.locator('.info-hotspot[aria-label*="ห้องผู้บริหาร"], .info-hotspot[aria-label*="Executive Office"]').first();
  await expect(marker).toBeVisible({ timeout: 15_000 });
  const viewport = page.viewportSize();
  if ((viewport?.width ?? 0) <= 1024) {
    const box = await marker.boundingBox();
    expect(box).not.toBeNull();
    await page.touchscreen.tap((box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + (box?.height ?? 0) / 2);
  } else {
    await marker.click();
  }
  await expect(page.locator('dialog.app-dialog[open]')).toContainText(/ห้องผู้บริหาร|Executive Office/);
  await page.keyboard.press('Escape');

  await page.goto('/?scene=fitmFloor3Point5', { waitUntil: 'domcontentloaded' });
  const nextStartButton = page.locator('.intro .primary-button');
  await expect(nextStartButton).toBeEnabled({ timeout: 60_000 });
  await nextStartButton.click();
  const downstairs = page.locator('.tour-arrow.is-stairs-down[data-target="fitmFloor2Point4"]').first();
  await expect(downstairs).toHaveCount(1, { timeout: 15_000 });
  await expect(downstairs).toHaveAttribute('aria-label', /ลงไปยัง|Go down to/);
});

test('contextual building media opens sample panoramas and dormitory floor plans', async ({ page }) => {
  const startAndOpenSceneInfo = async (sceneId: string): Promise<void> => {
    await page.goto(`/?scene=${sceneId}`, { waitUntil: 'domcontentloaded' });
    const startButton = page.locator('.intro .primary-button');
    await expect(startButton).toBeEnabled({ timeout: 60_000 });
    await startButton.click();
    if ((page.viewportSize()?.width ?? 0) <= 1024) {
      await page.locator('.compact-tour-dock button').first().click();
    }
    await expect(page.locator('.scene-panel')).toBeVisible();
  };

  await startAndOpenSceneInfo('fitmFloor3Point2');
  const classroomButton = page.getByRole('button', { name: /ห้องเรียนตัวอย่าง|Sample classrooms/ });
  await expect(classroomButton).toBeVisible();
  await classroomButton.click();
  const classroomDialog = page.locator('dialog.app-dialog[open]');
  await expect(classroomDialog).toContainText(/ห้องเรียนตัวอย่าง|Sample classrooms/);
  await expect(classroomDialog.locator('.supplemental-media__items button')).toHaveCount(4);
  await expect(classroomDialog.locator('.supplemental-panorama__viewer')).toBeVisible();
  await page.keyboard.press('Escape');

  await startAndOpenSceneInfo('femaleDormitory2');
  await expect(page.getByRole('button', { name: /ห้องพักตัวอย่าง|Sample dormitory rooms/ })).toBeVisible();
  const floorPlanButton = page.getByRole('button', { name: /ผังอาคารหอพักหญิงหลังที่ 2|Female Dormitory 2 floor plans/ });
  await floorPlanButton.click();
  const floorPlanDialog = page.locator('dialog.app-dialog[open]');
  await expect(floorPlanDialog.locator('.supplemental-media__items button')).toHaveCount(5);
  await expect(floorPlanDialog.locator('.supplemental-floor-plan__viewport img')).toBeVisible();
  await floorPlanDialog.getByRole('button', { name: /ซูมเข้า|Zoom in/ }).click();
  await expect(floorPlanDialog.locator('output')).toHaveText('125%');
});

test('AI route card starts a guided tour and highlights the real scene path', async ({ page }) => {
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      json: {
        intent: 'tour',
        answered: true,
        answer: 'A verified route to the University Cafeteria is ready.',
        relatedSceneIds: [],
        relatedProgramIds: [],
        comparisonProgramIds: [],
        tourPlan: { destinationSceneId: 'universityCafeteria', stopSceneIds: ['universityCafeteria'], sceneIds: ['entrance', 'universityCafeteria'] },
        programRecommendations: [],
        needsRecommendationProfile: false,
        fallback: false
      }
    });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'En' }).click();
  const startButton = page.getByRole('button', { name: 'Start the tour' });
  await expect(startButton).toBeEnabled({ timeout: 60_000 });
  await startButton.click();

  await page.getByRole('button', { name: 'Open AI assistant' }).click();
  await page.locator('#tour-chat-input').fill('Take me to the University Cafeteria');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: 'Start guided tour' }).click();

  const guide = page.locator('.guided-tour');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('University Cafeteria');
  await expect(page.locator('.leaflet-overlay-pane path[stroke="#f97316"]')).toBeVisible({ timeout: 15_000 });
  await guide.getByRole('button', { name: 'Next scene' }).click();
  await expect(guide.locator('small')).toContainText(/^2 \/ /, { timeout: 60_000 });
  await guide.getByRole('button', { name: 'Cancel guided tour' }).click();
  await expect(guide).toHaveCount(0);
});

test('AI recommendation form uses the visitor profile and opens verified program data', async ({ page }) => {
  await page.route('**/api/content', async (route) => {
    await route.fulfill({ json: academicsSnapshot });
  });
  await page.route('**/api/chat', async (route) => {
    const request = route.request().postDataJSON() as { recommendationProfile?: unknown };
    await route.fulfill({
      json: request.recommendationProfile ? {
        intent: 'program-recommendation',
        answered: true,
        answer: 'This recommendation uses published Admin content.',
        relatedSceneIds: [],
        relatedProgramIds: ['program-with-scene'],
        comparisonProgramIds: [],
        programRecommendations: [{ programId: 'program-with-scene', facultyId: 'faculty-with-scene', reason: 'Matches your interest in software.' }],
        needsRecommendationProfile: false,
        fallback: false
      } : {
        intent: 'program-recommendation',
        answered: false,
        answer: 'Tell us about your interests first.',
        relatedSceneIds: [],
        relatedProgramIds: [],
        comparisonProgramIds: [],
        programRecommendations: [],
        needsRecommendationProfile: true,
        fallback: false
      }
    });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'En' }).click();
  const startButton = page.getByRole('button', { name: 'Start the tour' });
  await expect(startButton).toBeEnabled({ timeout: 60_000 });
  await startButton.click();
  await page.getByRole('button', { name: 'Open AI assistant' }).click();
  await page.getByRole('button', { name: 'Recommend programs based on my interests' }).click();

  const recommendationForm = page.locator('.tour-chat__recommendation-form');
  await recommendationForm.getByLabel('Interests').fill('software development');
  await recommendationForm.getByLabel('Current qualification').selectOption('m6-pvoc');
  await recommendationForm.getByLabel('Desired study level').selectOption('bachelor');
  await recommendationForm.getByRole('button', { name: 'Find programs' }).click();

  const recommendation = page.locator('.tour-chat__recommendations');
  await expect(recommendation).toContainText('Program with tour scene');
  await expect(recommendation).toContainText('Faculty with tour scene');
  await expect(recommendation).toContainText('Matches your interest in software.');
  await recommendation.getByRole('button', { name: 'View program details' }).click();
  await expect(page.locator('dialog[open]')).toContainText('Program with tour scene');
});

test('program details link back to the faculty and navigate only when the faculty has a tour scene', async ({ page }) => {
  await page.route('**/api/content', async (route) => {
    await route.fulfill({ json: academicsSnapshot });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'En' }).click();
  await expect(page.getByRole('button', { name: 'Start the tour' })).toBeEnabled({ timeout: 60_000 });

  await openHeaderAction(page, /^Faculties and programs$/);
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

  await openHeaderAction(page, /^Faculties and programs$/);
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
  const compactUi = (viewport?.width ?? 0) <= 1024;
  if (compactUi) {
    await expect(mapPanel).toHaveClass(/is-preview/);
    expect(mapBox?.width ?? 0).toBeLessThanOrEqual((viewport?.width ?? 0) <= 600 ? 160 : 200);
    await page.locator('.map-preview-trigger').click();
    await expect(mapPanel).toHaveClass(/is-panel/);
    const panelBox = await mapPanel.boundingBox();
    expect(panelBox?.width ?? 0).toBeGreaterThan((viewport?.width ?? 0) * 0.9);
  } else {
    expect(mapBox?.width ?? 0).toBeGreaterThanOrEqual(360);
  }

  await page.getByRole('button', { name: /ตัวเลือกแผนที่เพิ่มเติม|More map options/ }).click();
  await page.getByRole('button', { name: /ขยายแผนที่|Expand map/ }).click();
  await expect(mapPanel).toHaveClass(/is-expanded/);
  const expandedBox = await mapPanel.boundingBox();
  expect(expandedBox?.width ?? 0).toBeGreaterThan((viewport?.width ?? 0) * 0.9);
  expect(expandedBox?.height ?? 0).toBeGreaterThan((viewport?.height ?? 0) * 0.7);
  await page.keyboard.press('Escape');
  await expect(mapPanel).not.toHaveClass(/is-expanded/);

  await openHeaderAction(page, /กิจกรรม|Activities/);
  await expect(page.getByRole('heading', { name: /กิจกรรมภายในมหาวิทยาลัย|University activities/ })).toBeVisible();
});
