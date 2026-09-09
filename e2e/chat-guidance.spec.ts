import { expect, test, type Page } from '@playwright/test';

async function openChat(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const start = page.locator('.intro .primary-button');
  await expect(start).toBeEnabled({ timeout: 60_000 });
  await start.click();
  await page.getByRole('button', { name: /AI|ผู้ช่วย/ }).last().click();
  await expect(page.locator('#tour-chat-panel')).toBeVisible();
}

async function ask(page: Page, text: string) {
  await page.locator('#tour-chat-input').fill(text);
  await page.locator('#tour-chat-panel .tour-chat__form button').click();
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
  await expect(careers).toHaveText(answerText);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
