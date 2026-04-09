/**
 * Gym website price scraper
 *
 * For each gym with a website:
 *   1. Fetch homepage, then try /cenik, /ceny, /vstupne, /permanentky (max 3 pages)
 *   2. Extract daily_price and monthly_price (INTEGER CZK) near Czech price keywords
 *   3. Reject prices near parking/fine keywords
 *   4. Falls back to Puppeteer if page appears JS-rendered
 *   5. Saves raw_price_text for manual review
 *
 * Usage:
 *   node scripts/scrape-prices.mjs --dry-run            # test on 10 gyms, no DB writes
 *   node scripts/scrape-prices.mjs --dry-run --limit 20
 *   node scripts/scrape-prices.mjs                      # full run
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.local') });

// ── CLI args ──────────────────────────────────────────────────────────────────

const DRY_RUN  = process.argv.includes('--dry-run');
const LIMIT_I  = process.argv.indexOf('--limit');
const LIMIT    = LIMIT_I !== -1 ? parseInt(process.argv[LIMIT_I + 1], 10) : (DRY_RUN ? 10 : Infinity);

// ── Config ────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS   = 8000;
const PUPPETEER_TIMEOUT  = 15000;
const REQUEST_DELAY_MS   = 500;
const SAVE_EVERY         = 25;
const PROGRESS_PATH      = path.join(__dirname, 'scrape-prices-progress.json');

const PRICE_PAGES        = ['', '/cenik', '/ceny', '/vstupne', '/permanentky', '/clenství'];
const MAX_PAGES          = 3;

// Keywords that must appear within 200 chars of a price to accept it
const DAILY_KEYWORDS     = ['vstupné', 'vstup', 'jednorázov', 'denní', 'jednorázo', 'jednorázový', 'vstupne'];
const MONTHLY_KEYWORDS   = ['měsíční', 'měsíc', 'členství', 'permanentka', 'permanentku', 'členem', 'předplatné'];
const ALL_PRICE_KEYWORDS = [...DAILY_KEYWORDS, ...MONTHLY_KEYWORDS, 'ceník', 'cena', 'ceny', 'cenik'];

// Reject price if these words are within 150 chars
const REJECT_KEYWORDS    = ['parkování', 'parkoviště', 'pokuta', 'poplatek za', 'zprostředkování', 'pojištění', 'kauce'];

// CZK price patterns — matches: 150 Kč, 1 500 Kč, 150,- Kč, 150 CZK, 150,-
const PRICE_RE           = /(\d[\d\s]{0,4}\d|\d{1,4})(?:\s*,-)?\s*(?:Kč|kč|CZK|czk)/g;

// ── DB ────────────────────────────────────────────────────────────────────────

const db = new pg.Pool({ connectionString: process.env.POSTGRES_URL });

async function ensureColumns() {
  await db.query(`
    ALTER TABLE gyms
      ADD COLUMN IF NOT EXISTS daily_price    INTEGER,
      ADD COLUMN IF NOT EXISTS monthly_price  INTEGER,
      ADD COLUMN IF NOT EXISTS raw_price_text TEXT
  `);
}

async function getGymsToScrape() {
  const { rows } = await db.query(`
    SELECT id, name, city, website
    FROM gyms
    WHERE website IS NOT NULL
      AND name != 'Unnamed Gym'
      AND website NOT LIKE '%facebook%'
      AND website NOT LIKE '%instagram%'
      AND website NOT LIKE '%google%'
    ORDER BY id
  `);
  return rows;
}

async function updateGym(id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const set    = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = [id, ...keys.map(k => fields[k])];
  await db.query(`UPDATE gyms SET ${set} WHERE id = $1`, values);
}

// ── Progress ──────────────────────────────────────────────────────────────────

function loadProgress() {
  try { return new Set(JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8')).done ?? []); }
  catch { return new Set(); }
}

function saveProgress(done) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify({ done: [...done] }, null, 2));
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function normalizeUrl(raw) {
  let url = raw.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function buildPageUrls(websiteRaw) {
  const base = normalizeUrl(websiteRaw);
  if (!base) return [];
  const origin = base.origin; // e.g. https://mujgym.cz
  const urls = [];
  // Always try the exact URL they gave us first
  urls.push(base.href);
  // Then try known price pages from origin (skip if already same path)
  for (const suffix of PRICE_PAGES.slice(1)) {
    const candidate = origin + suffix;
    if (candidate !== base.href && candidate !== base.href.replace(/\/$/, '')) {
      urls.push(candidate);
    }
    if (urls.length >= MAX_PAGES + 1) break;
  }
  return urls.slice(0, MAX_PAGES);
}

// ── Text extraction ───────────────────────────────────────────────────────────

function htmlToText(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasKeyword(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

function isNearRejected(text, matchIndex, window = 150) {
  const excerpt = text.slice(Math.max(0, matchIndex - window), matchIndex + window).toLowerCase();
  return REJECT_KEYWORDS.some(kw => excerpt.includes(kw));
}

function extractPricesFromText(text) {
  const lower = text.toLowerCase();
  const found = { daily: [], monthly: [], rawSnippets: [] };

  let m;
  PRICE_RE.lastIndex = 0;

  while ((m = PRICE_RE.exec(text)) !== null) {
    const matchIdx = m.index;
    const rawNum   = m[1].replace(/\s/g, '');
    const amount   = parseInt(rawNum, 10);

    // Sanity bounds: gym prices are typically 50–5000 CZK
    if (amount < 50 || amount > 5000) continue;

    if (isNearRejected(text, matchIdx)) continue;

    // Get surrounding context (200 chars)
    const start   = Math.max(0, matchIdx - 200);
    const end     = Math.min(text.length, matchIdx + 200);
    const context = lower.slice(start, end);

    const isDaily   = DAILY_KEYWORDS.some(kw => context.includes(kw));
    const isMonthly = MONTHLY_KEYWORDS.some(kw => context.includes(kw));
    const nearPrice = ALL_PRICE_KEYWORDS.some(kw => context.includes(kw));

    if (!nearPrice) continue;

    const snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();

    if (isDaily)   { found.daily.push({ amount, snippet }); }
    if (isMonthly) { found.monthly.push({ amount, snippet }); }

    found.rawSnippets.push(`${amount} Kč — ${snippet.slice(0, 80)}`);
  }

  return found;
}

// ── Fetch strategies ──────────────────────────────────────────────────────────

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      'Accept-Language': 'cs-CZ,cs;q=0.9',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return { html, text: htmlToText(html) };
}

let browser = null;

async function getPuppeteer() {
  if (browser) return browser;
  const puppeteer = (await import('puppeteer-extra')).default;
  const Stealth   = (await import('puppeteer-extra-plugin-stealth')).default;
  puppeteer.use(Stealth());
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  return browser;
}

async function puppeteerText(url) {
  const b    = await getPuppeteer();
  const page = await b.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PUPPETEER_TIMEOUT });
    await new Promise(r => setTimeout(r, 1500)); // let JS settle
    const text = await page.evaluate(() => document.body?.innerText ?? '');
    return text.replace(/\s+/g, ' ').trim();
  } finally {
    await page.close();
  }
}

function looksJsRendered(text) {
  return text.length < 800;
}

async function getPageText(url) {
  try {
    const { text } = await fetchText(url);
    if (looksJsRendered(text) || (hasKeyword(text, ALL_PRICE_KEYWORDS) && !PRICE_RE.test(text))) {
      PRICE_RE.lastIndex = 0;
      const fallback = await puppeteerText(url);
      return { text: fallback, viaPuppeteer: true };
    }
    return { text, viaPuppeteer: false };
  } catch {
    // fetch failed — try puppeteer
    try {
      const fallback = await puppeteerText(url);
      return { text: fallback, viaPuppeteer: true };
    } catch (err2) {
      throw new Error(`Both fetch and puppeteer failed: ${err2.message}`);
    }
  }
}

// ── Price selection ───────────────────────────────────────────────────────────

function pickBest(priceList) {
  if (!priceList.length) return null;
  // Take the first (most prominent) one found
  return priceList[0].amount;
}

// ── Delay ─────────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  IRONMAP — Price Scraper`);
  console.log(`  Mode:  ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'LIVE'}`);
  console.log(`  Limit: ${isFinite(LIMIT) ? LIMIT : 'all'} gyms`);
  console.log(`${'═'.repeat(60)}\n`);

  await ensureColumns();

  const allGyms  = await getGymsToScrape();
  const done     = DRY_RUN ? new Set() : loadProgress();
  const toProcess = allGyms
    .filter(g => !done.has(g.id))
    .slice(0, isFinite(LIMIT) ? LIMIT : undefined);

  console.log(`Gyms with websites: ${allGyms.length}`);
  console.log(`Already done:       ${done.size}`);
  console.log(`This run:           ${toProcess.length}\n`);

  const stats = { found: 0, partial: 0, notFound: 0, failed: 0 };
  const log   = [];

  for (let i = 0; i < toProcess.length; i++) {
    const gym    = toProcess[i];
    const urls   = buildPageUrls(gym.website);
    const prefix = `[${i + 1}/${toProcess.length}] ${gym.name} (${gym.city})`;

    if (!urls.length) {
      process.stdout.write(`${prefix} — SKIP (bad URL: ${gym.website})\n`);
      stats.failed++;
      done.add(gym.id);
      continue;
    }

    let daily = null, monthly = null, rawText = null;
    const pagesChecked = [];
    let usedPuppeteer  = false;

    for (const url of urls) {
      pagesChecked.push(url);
      let text;
      try {
        const result = await getPageText(url);
        text = result.text;
        if (result.viaPuppeteer) usedPuppeteer = true;
      } catch (err) {
        process.stdout.write(`  ↳ ${url} — ERROR: ${err.message}\n`);
        continue;
      }

      if (!hasKeyword(text, ALL_PRICE_KEYWORDS)) continue;

      const found = extractPricesFromText(text);
      if (found.daily.length || found.monthly.length) {
        daily   = daily   ?? pickBest(found.daily);
        monthly = monthly ?? pickBest(found.monthly);
        if (found.rawSnippets.length) {
          rawText = found.rawSnippets.slice(0, 3).join(' | ');
        }
      }

      if (daily && monthly) break; // got both, stop
      await sleep(REQUEST_DELAY_MS);
    }

    // Summary line
    const puppeteerTag = usedPuppeteer ? ' [puppeteer]' : '';
    if (daily || monthly) {
      const parts = [];
      if (daily)   parts.push(`daily=${daily} Kč`);
      if (monthly) parts.push(`monthly=${monthly} Kč`);
      process.stdout.write(`${prefix}${puppeteerTag} — ✓ ${parts.join(', ')}\n`);
      if (DRY_RUN) {
        process.stdout.write(`  raw: ${rawText ?? '—'}\n`);
        process.stdout.write(`  pages: ${pagesChecked.join(' → ')}\n`);
      }
      stats[daily && monthly ? 'found' : 'partial']++;
    } else {
      process.stdout.write(`${prefix}${puppeteerTag} — no prices found\n`);
      if (DRY_RUN) process.stdout.write(`  pages: ${pagesChecked.join(' → ')}\n`);
      stats.notFound++;
    }

    log.push({
      id: gym.id, name: gym.name, city: gym.city,
      website: gym.website, pagesChecked, usedPuppeteer,
      daily, monthly, rawText,
      status: (daily || monthly) ? 'found' : 'not_found',
    });

    if (!DRY_RUN) {
      const updates = {};
      if (daily)   updates.daily_price   = daily;
      if (monthly) updates.monthly_price = monthly;
      if (rawText) updates.raw_price_text = rawText;
      if (Object.keys(updates).length) await updateGym(gym.id, updates);
    }

    done.add(gym.id);
    if (!DRY_RUN && (i + 1) % SAVE_EVERY === 0) {
      saveProgress(done);
      console.log(`  ── [SAVED] ${i + 1} processed ──`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  if (!DRY_RUN) saveProgress(done);
  fs.writeFileSync(
    path.join(__dirname, 'scrape-prices-log.json'),
    JSON.stringify(log, null, 2)
  );

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Results (${DRY_RUN ? 'DRY RUN' : 'LIVE'})`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Both prices:  ${stats.found}`);
  console.log(`  One price:    ${stats.partial}`);
  console.log(`  Not found:    ${stats.notFound}`);
  console.log(`  Failed/skip:  ${stats.failed}`);
  console.log(`  Log → scripts/scrape-prices-log.json`);
  console.log(`${'═'.repeat(60)}\n`);

  if (browser) await browser.close();
  await db.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
