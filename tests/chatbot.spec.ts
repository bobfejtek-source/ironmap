import { test, expect, type Page } from '@playwright/test';

/**
 * UAT testy pro ChatBot widget.
 *
 * Pozn.: Playwright config ukazuje na https://ironmap.cz, takze tyto testy se
 * spusti proti produkci po deploy. Pro lokalni overeni spust `npm run dev`
 * a pust: `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test chatbot`.
 */

const BUBBLE_SELECTOR = 'button[aria-label="Otevřít chat"]';
const CLOSE_SELECTOR = 'button[aria-label="Zavřít chat"]';
const PANEL_SELECTOR = '[role="dialog"][aria-label="IRON chatbot"]';
const SEND_SELECTOR = 'button[aria-label="Odeslat"]';
const TEXTAREA_SELECTOR = `${PANEL_SELECTOR} textarea`;

async function openChat(page: Page) {
  await page.goto('/');
  const bubble = page.locator(BUBBLE_SELECTOR);
  await expect(bubble).toBeVisible({ timeout: 10_000 });
  await bubble.click();
  await expect(page.locator(PANEL_SELECTOR)).toBeVisible();
}

test.describe('ChatBot — bubble visibility', () => {
  test('bubble se zobrazi na homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(BUBBLE_SELECTOR)).toBeVisible({ timeout: 10_000 });
  });

  test('bubble se zobrazi i na detailu mesta', async ({ page }) => {
    await page.goto('/posilovny/praha');
    await expect(page.locator(BUBBLE_SELECTOR)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('ChatBot — otevreni a zavreni', () => {
  test('klik otevre a zavre panel', async ({ page }) => {
    await openChat(page);
    // Welcome zprava
    await expect(page.getByText(/Ahoj! Jsem asistent IRON/i)).toBeVisible();
    // Zavreni
    await page.locator(CLOSE_SELECTOR).click();
    await expect(page.locator(PANEL_SELECTOR)).toBeHidden();
  });

  test('textarea dostane focus po otevreni', async ({ page }) => {
    await openChat(page);
    const ta = page.locator(TEXTAREA_SELECTOR);
    await expect(ta).toBeFocused();
  });
});

test.describe('ChatBot — odeslani zpravy', () => {
  test('uzivatelska zprava se zobrazi a prijde streamovana odpoved', async ({ page }) => {
    await openChat(page);

    const ta = page.locator(TEXTAREA_SELECTOR);
    const send = page.locator(SEND_SELECTOR);

    await ta.fill('Ahoj, hledam posilovnu v Praze');
    await send.click();

    // Uzivatelska zprava se objevi v panelu
    await expect(
      page.locator(PANEL_SELECTOR).getByText('Ahoj, hledam posilovnu v Praze', { exact: true })
    ).toBeVisible({ timeout: 5_000 });

    // Pocet zprav po odeslani: welcome + user + assistant placeholder = 3 bubliny
    // Pockame az assistant bublina bude mit nejaky text (streaming)
    const assistantBubble = page.locator(`${PANEL_SELECTOR} > div > div`).nth(2);
    await expect(assistantBubble).toBeVisible({ timeout: 10_000 });

    // Streamovana odpoved by mela nejakou dobu nabehnout.
    // Cekame az text bubliny neni prazdny a neni jen "..."
    await expect
      .poll(
        async () => {
          const txt = (await assistantBubble.textContent()) ?? '';
          return txt.trim().length;
        },
        { timeout: 20_000, message: 'Assistant response should stream in' }
      )
      .toBeGreaterThan(10);
  });

  test('Enter posle zpravu, Shift+Enter udela novy radek', async ({ page }) => {
    await openChat(page);
    const ta = page.locator(TEXTAREA_SELECTOR);

    await ta.fill('radek1');
    await ta.press('Shift+Enter');
    await ta.type('radek2');
    // Nesmi odeslat - zprava jeste neodesla
    const before = await page.locator(PANEL_SELECTOR).getByText('radek1', { exact: false }).count();
    expect(before).toBe(0);

    await ta.press('Enter');
    await expect(page.locator(PANEL_SELECTOR).getByText(/radek1/)).toBeVisible({ timeout: 5_000 });
  });

  test('tlacitko Nova resetuje historii', async ({ page }) => {
    await openChat(page);
    await page.locator(TEXTAREA_SELECTOR).fill('Test reset');
    await page.locator(SEND_SELECTOR).click();
    await expect(page.locator(PANEL_SELECTOR).getByText('Test reset')).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: 'Nová konverzace' }).click();
    // Welcome by se mel vratit jako jedina zprava
    await expect(page.locator(PANEL_SELECTOR).getByText('Test reset')).toBeHidden();
    await expect(page.getByText(/Ahoj! Jsem asistent IRON/i)).toBeVisible();
  });
});

test.describe('ChatBot — layout', () => {
  test('panel nepresahuje viewport', async ({ page }) => {
    await openChat(page);
    const panel = page.locator(PANEL_SELECTOR);
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    const vw = page.viewportSize()!.width;
    const vh = page.viewportSize()!.height;
    expect(box!.x + box!.width).toBeLessThanOrEqual(vw + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(vh + 1);
  });
});
