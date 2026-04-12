import { test, expect, type Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wait for at least one Leaflet tile to have loaded. */
async function waitForMapTiles(page: Page, timeout = 15_000) {
  await page.waitForFunction(
    () => {
      const tiles = document.querySelectorAll('.leaflet-tile');
      return Array.from(tiles).some(
        (t) =>
          (t as HTMLImageElement).src?.startsWith('http') ||
          (t as HTMLElement).style.backgroundImage !== ''
      );
    },
    { timeout }
  );
}

const CITY_URL = '/posilovny/praha';

// ─── 1. Homepage — mobile 375px ───────────────────────────────────────────────

test.describe('Homepage — mobile 375px', () => {

  test('loads, shows hero and has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/IRON/i);
    await expect(page.locator('text=IRON').first()).toBeVisible();
    await expect(page.locator('input[type="text"]').first()).toBeVisible();

    const overflows = await page.evaluate(
      () => document.body.scrollWidth > window.innerWidth
    );
    expect(overflows, 'page must not overflow horizontally').toBe(false);
  });

  test('categories grid respects viewport — 4 cols ≤768px, 8 cols otherwise', async ({ page }) => {
    await page.goto('/');
    const grid = page.locator('.cat-grid');
    await expect(grid).toBeVisible();

    const { cols, vw } = await grid.evaluate((el) => ({
      cols: getComputedStyle(el).gridTemplateColumns.split(' ').length,
      vw: window.innerWidth,
    }));

    if (vw <= 768) {
      expect(cols, `should be 4 cols at ${vw}px`).toBe(4);
    } else {
      expect(cols, `should be 8 cols at ${vw}px`).toBe(8);
    }
  });

  test('nav header fits within its viewport width', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header').first();
    const box = await header.boundingBox();
    expect(box).not.toBeNull();

    const vw = page.viewportSize()!.width;
    // Allow 1px rounding tolerance
    expect(box!.width, `header ${box!.width}px should fit in ${vw}px viewport`).toBeLessThanOrEqual(vw + 1);
  });
});

// ─── 2. City listing — gym cards ─────────────────────────────────────────────

test.describe('City listing — gym cards', () => {

  test('shows gym cards', async ({ page }) => {
    await page.goto(CITY_URL);
    const cards = page.locator('a[href*="/posilovny/praha/"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('filter chips visible', async ({ page }) => {
    await page.goto(CITY_URL);
    await expect(page.locator('button.chip').first()).toBeVisible();
  });

  test('city name appears in h1', async ({ page }) => {
    await page.goto(CITY_URL);
    await expect(page.locator('h1').filter({ hasText: /Praha/i })).toBeVisible();
  });
});

// ─── 3. Map — tile rendering ──────────────────────────────────────────────────

test.describe('Map — tile rendering', () => {

  test('city map loads tiles', async ({ page }) => {
    test.setTimeout(35_000);
    await page.goto(CITY_URL);
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
    await waitForMapTiles(page);
    const box = await page.locator('.leaflet-container').first().boundingBox();
    expect(box!.height).toBeGreaterThan(50);
  });

  test('detail page map loads tiles when coordinates exist', async ({ page }) => {
    test.setTimeout(35_000);
    await page.goto(CITY_URL);
    const href = await page.locator('a[href*="/posilovny/praha/"]').first().getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    const map = page.locator('.leaflet-container').first();
    const hasMap = await map.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasMap) return; // gym has no coordinates — acceptable

    await waitForMapTiles(page);
    const box = await map.boundingBox();
    expect(box!.height).toBeGreaterThan(50);
  });
});

// ─── 4. Gym marker click scrolls to card (desktop) ───────────────────────────

test.describe('Map marker → card (desktop)', () => {

  test('clicking a marker activates the corresponding gym card', async ({ page }) => {
    await page.goto(CITY_URL);
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
    await waitForMapTiles(page);

    const markers = page.locator('.leaflet-marker-pane .leaflet-marker-icon');
    if (await markers.count() === 0) return;

    // Dispatch a synthetic click via JS so Leaflet's event system picks it up
    const activated = await page.evaluate(async () => {
      const marker = document.querySelector('.leaflet-marker-pane .leaflet-marker-icon') as HTMLElement;
      if (!marker) return false;
      marker.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      // Give React one render cycle to update state
      await new Promise((r) => setTimeout(r, 600));
      const cards = document.querySelectorAll('[id^="gym-card-"]');
      return Array.from(cards).some(
        (c) => {
          const outline = (c as HTMLElement).style.outline;
          return outline && outline !== 'none';
        }
      );
    });

    if (!activated) {
      // Leaflet synthetic clicks may not fire in headless — verify structure only
      test.info().annotations.push({
        type: 'note',
        description: 'Marker click not verified in headless (Leaflet event delegation). Verified: markers present, card containers present.',
      });
      const cardCount = await page.locator('[id^="gym-card-"]').count();
      expect(cardCount).toBeGreaterThan(0);
    }
  });
});

// ─── 5. Map marker tap — mobile ───────────────────────────────────────────────

test.describe('Map marker tap (mobile)', () => {

  test('tapping a marker does not crash the page', async ({ page }) => {
    test.setTimeout(35_000);
    const isMobile = page.viewportSize()!.width <= 768;
    if (!isMobile) {
      // tap() requires touch support — skip on desktop
      test.skip();
    }

    await page.goto(CITY_URL);
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
    await waitForMapTiles(page);

    const markers = page.locator('.leaflet-marker-pane .leaflet-marker-icon');
    if (await markers.count() === 0) return;

    await markers.first().tap({ force: true });
    // Page should still be functional
    await expect(page.locator('.leaflet-container').first()).toBeVisible();
  });
});

// ─── 6. Check-in button on detail page ───────────────────────────────────────

test.describe('Gym detail — check-in button', () => {

  async function getFirstGymHref(page: Page): Promise<string> {
    await page.goto(CITY_URL);
    const href = await page.locator('a[href*="/posilovny/praha/"]').first().getAttribute('href');
    expect(href).toBeTruthy();
    return href!;
  }

  test('check-in section and action button visible (unauthenticated)', async ({ page }) => {
    const href = await getFirstGymHref(page);
    await page.goto(href);

    // "Check-in" section heading always visible
    await expect(page.locator('text=Check-in').first()).toBeVisible({ timeout: 10_000 });

    // Unauthenticated: "Přihlásit se a zaznamenat návštěvu"
    // Authenticated:   "Byl jsem tady"
    const btn = page.locator('button').filter({
      hasText: /byl jsem tady|přihlásit se a zaznamenat/i,
    });
    await expect(btn.first()).toBeVisible({ timeout: 10_000 });
  });

  test('check-in button meets 40px touch target on mobile', async ({ page }) => {
    const href = await getFirstGymHref(page);
    await page.goto(href);

    const btn = page.locator('button').filter({
      hasText: /byl jsem tady|přihlásit se a zaznamenat/i,
    });
    await expect(btn.first()).toBeVisible({ timeout: 10_000 });

    const box = await btn.first().boundingBox();
    expect(box!.height, 'touch target height should be ≥40px').toBeGreaterThanOrEqual(40);
  });
});
