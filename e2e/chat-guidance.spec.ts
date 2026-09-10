import { expect, test, type Page } from '@playwright/test';
import { chatFixture } from '../test-support/chat-fixture';
import { chatRequestSchema, type ChatRequest } from '../src/chat';
import { createFallbackContentSnapshot } from '../src/content';
import { answerGroundedQuestion } from '../src/server/chat-service';

// Exercise the real deterministic service using controlled published data. Do not
// depend on Supabase availability or generate Gemini requests from UI regression tests.
async function openChat(page: Page, options: { failProfileOnce?: boolean; english?: boolean } = {}) {
  const requests: ChatRequest[] = [];
  let profileFailed = false;
  await page.route('**/api/content', async (route) => {
    if (route.request().method() === 'HEAD') await route.fulfill({ status: 200, headers: { 'X-Content-Version': String(chatFixture.version) } });
    else await route.fulfill({ json: chatFixture });
  });
  await page.route('**/api/chat', async (route) => {
    const request = chatRequestSchema.parse(route.request().postDataJSON());
    requests.push(request);
    const fail = options.failProfileOnce && request.recommendationProfile && !profileFailed;
    if (fail) profileFailed = true;
    await route.fulfill({ json: await answerGroundedQuestion(request, fail ? createFallbackContentSnapshot() : chatFixture) });
  });
  const contentLoaded = page.waitForResponse((response) => response.url().endsWith('/api/content') && response.request().method() === 'GET');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await contentLoaded;
  if (options.english) await page.getByRole('button', { name: 'En', exact: true }).click();
  const start = page.locator('.intro .primary-button');
  await expect(start).toBeEnabled({ timeout: 60_000 });
  await start.click();
  await page.getByRole('button', { name: /AI|ผู้ช่วย/ }).last().click();
  await expect(page.locator('#tour-chat-panel')).toBeVisible();
  return requests;
}

async function ask(page: Page, text: string) {
  await page.locator('#tour-chat-input').fill(text);
  const answered = page.waitForResponse((response) => response.url().endsWith('/api/chat'));
  await page.locator('#tour-chat-panel .tour-chat__form button').click();
  await answered;
  await expect(page.locator('.tour-chat__thinking')).toHaveCount(0, { timeout: 30_000 });
}

test('tour choices ask first, distinguish dormitories and prepare only the selected route', async ({ page }) => {
  await openChat(page);
  await ask(page, 'พาทัวหน่อย');
  await expect(page.locator('.tour-chat__route-card')).toHaveCount(0);
  const choices = page.getByRole('group', { name: 'ตัวเลือกตอบกลับ' });
  await expect(choices.getByRole('button', { name: 'หอพัก', exact: true })).toBeVisible();
  await choices.getByRole('button', { name: 'หอพัก', exact: true }).click();
  const female2 = choices.getByRole('button', { name: /หญิง.*2/ });
  await expect(female2).toBeVisible();
  await expect(page.locator('.tour-chat__route-card')).toHaveCount(0);
  await female2.click();
  await expect(page.locator('.tour-chat__route-card')).toContainText(/หญิง.*2/);
  await expect(page.locator('.guided-tour')).toHaveCount(0);
  await page.locator('.tour-chat__route-card button').click();
  await expect(page.locator('.guided-tour')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('career guidance links a qualification-matched program to its faculty and keeps chat history', async ({ page }) => {
  await openChat(page);
  await ask(page, 'อยากเป็นโปรแกรมเมอร์');
  const form = page.locator('.tour-chat__recommendation-form');
  await expect(form).toBeVisible();
  await form.locator('textarea').fill('เขียนโปรแกรม ซอฟต์แวร์');
  await form.locator('select').nth(0).selectOption('m6-pvoc');
  await form.locator('select').nth(1).selectOption('bachelor');
  await form.getByRole('button').click();
  const careers = page.locator('.tour-chat__careers');
  await expect(careers).toBeVisible({ timeout: 30_000 });
  await expect(careers).toContainText('คณะเทคโนโลยีและการจัดการอุตสาหกรรม');
  const recommendationCount = await page.locator('.tour-chat__recommendations > article').count();
  expect(recommendationCount).toBeGreaterThanOrEqual(1);
  expect(recommendationCount).toBeLessThanOrEqual(3);
  await expect(form).toHaveCount(0);
  const answerText = await careers.innerText();
  expect(answerText).not.toMatch(/https?:\/\/|อ้างอิง:/);
  await page.locator('.tour-chat__header button').click();
  await page.getByRole('button', { name: /AI|ผู้ช่วย/ }).last().click();
  await expect(careers).toBeVisible();
  expect(await careers.innerText()).toBe(answerText);
  await page.screenshot({ path: test.info().outputPath('career-guidance.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('lists all faculties before the profile and compares grounded recommendations in English', async ({ page }) => {
  await openChat(page, { english: true });
  await ask(page, 'What faculties are available?');
  await expect(page.locator('.tour-chat__faculties button')).toHaveCount(4);
  const form = page.locator('.tour-chat__recommendation-form');
  await expect(form).toBeVisible();
  await form.getByLabel('Interests').fill('software');
  await form.getByLabel('Current qualification').selectOption('m6-pvoc');
  await form.getByLabel('Desired study level').selectOption('bachelor');
  await form.getByRole('button', { name: 'Find programs' }).click();
  const recommendations = page.locator('.tour-chat__recommendations > article');
  await expect(recommendations).toHaveCount(2);
  await expect(recommendations.nth(1)).toContainText('eligibility is not confirmed');
  await page.getByRole('group', { name: 'Suggested replies' }).getByRole('button', { name: 'Compare these programs' }).click();
  await expect(page.locator('.tour-chat__comparison-grid > article')).toHaveCount(2);
  await expect(page.locator('.tour-chat__comparison')).toContainText('Faculty of Industrial Technology and Management');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('retry after unavailable data preserves the profile and original conversation', async ({ page }) => {
  const requests = await openChat(page, { failProfileOnce: true });
  await ask(page, 'อยากเป็นโปรแกรมเมอร์');
  const form = page.locator('.tour-chat__recommendation-form');
  await form.locator('textarea').fill('software');
  await form.locator('select').nth(0).selectOption('m6-pvoc');
  await form.locator('select').nth(1).selectOption('bachelor');
  await form.getByRole('button').click();
  await expect(page.locator('.tour-chat__message').last()).toContainText('โหลดข้อมูลหลักสูตรไม่ได้');
  await expect(form).toHaveCount(0);
  const failedRequest = requests.at(-1);
  await page.locator('.tour-chat__retry').click();
  await expect(page.locator('.tour-chat__careers')).toBeVisible();
  expect(requests.at(-1)).toEqual(failedRequest);
  await expect(page.locator('.tour-chat__message.is-user')).toHaveCount(2);
  await expect(page.locator('.tour-chat__retry')).toHaveCount(0);
});

test('blocks personal data and retains a usable conversation after cancelling a request', async ({ page }) => {
  const requests = await openChat(page);
  await page.locator('#tour-chat-input').fill('visitor@example.com');
  await page.locator('.tour-chat__form button').click();
  await expect(page.locator('.tour-chat__message').last()).toContainText('กรุณาอย่าส่งอีเมล');
  expect(requests).toHaveLength(0);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  const holdRequest = async (route: import('@playwright/test').Route) => {
    await held;
    await route.abort().catch(() => {});
  };
  await page.route('**/api/chat', holdRequest);
  await page.locator('#tour-chat-input').fill('พาทัวหน่อย');
  await page.locator('.tour-chat__form button').click();
  await page.locator('.tour-chat__thinking button').click();
  await expect(page.locator('.tour-chat__message').last()).toContainText('ยกเลิกคำขอแล้ว');
  release();
  await page.unroute('**/api/chat', holdRequest);
  await page.locator('.tour-chat__retry').click();
  await expect(page.getByRole('group', { name: 'ตัวเลือกตอบกลับ' })).toBeVisible();
});
