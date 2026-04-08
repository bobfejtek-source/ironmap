/**
 * Detail page enrichment — firmy.cz
 * Bypasses the CMP consent wall by intercepting attachShadow and clicking "Souhlasím".
 * Extracts: phone, website, opening_hours, description, ico, rating, price_level, email
 *
 * Usage:
 *   node scripts/enrich-details.mjs           → all records with detail_url
 *   node scripts/enrich-details.mjs --limit 20 → first N (for testing)
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

puppeteer.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const GYMS_PATH = path.join(ROOT, 'gyms.json');
const PROGRESS_PATH = path.join(ROOT, 'data', 'enrich-progress.json');

const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  return i !== -1 ? parseInt(process.argv[i + 1], 10) : Infinity;
})();

// ── helpers ──────────────────────────────────────────────────────────────────

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function randomDelay() { return delay(1500 + Math.random() * 2000); }

function loadProgress() {
  try { return new Set(JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'))); }
  catch { return new Set(); }
}
function saveProgress(done) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify([...done], null, 2));
}

// ── CMP consent bypass ───────────────────────────────────────────────────────

async function handleCmpConsent(page) {
  // Wait for shadow DOM to fully render
  await delay(7000);
  const clicked = await page.evaluate(() => {
    function findAndClickAgree(root) {
      for (const el of root.querySelectorAll('*')) {
        if (el.shadowRoot) {
          const r = findAndClickAgree(el.shadowRoot);
          if (r) return r;
        }
      }
      const agree = Array.from(root.querySelectorAll('button'))
        .find(b => b.textContent?.trim() === 'Souhlasím');
      if (agree) { agree.click(); return true; }
      return false;
    }
    return findAndClickAgree(document);
  });
  if (clicked) {
    await delay(4000); // wait for redirect back to firmy.cz
  }
  return clicked;
}

// ── session setup ────────────────────────────────────────────────────────────

async function setupSession(page) {
  // Force all shadow roots to open mode so we can interact with CMP
  await page.evaluateOnNewDocument(() => {
    const orig = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(init) {
      return orig.call(this, { ...init, mode: 'open' });
    };
  });

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-platform': '"Windows"',
  });

  console.log('Warming up session...');
  await page.goto('about:blank');
  await delay(500);
  await page.goto('https://www.firmy.cz/?q=fitness+posilovna+Praha', {
    waitUntil: 'networkidle2', timeout: 30000,
  });
  await delay(1000);

  if (page.url().includes('cmp.seznam.cz')) {
    console.log('CMP on warmup — handling consent...');
    await handleCmpConsent(page);
  }

  // Check if we need to get consent cookies via a detail page trigger
  const hasCmpCookie = (await page.cookies()).some(c => c.name === 'szncmpone');
  if (!hasCmpCookie) {
    console.log('No consent cookie — triggering via detail page...');
    await page.goto('https://www.firmy.cz/detail/13334380-one-gym-praha-nusle.html', {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    if (page.url().includes('cmp.seznam.cz')) {
      const clicked = await handleCmpConsent(page);
      if (!clicked) throw new Error('Could not click Souhlasím');
    }
    await delay(1000);
  }

  const cookies = (await page.cookies()).map(c => c.name).join(', ');
  console.log(`Session ready. Cookies: ${cookies}\n`);
}

// ── extract from detail page ─────────────────────────────────────────────────

const DAY_MAP = {
  'pondělí': 'monday', 'úterý': 'tuesday', 'středa': 'wednesday',
  'čtvrtek': 'thursday', 'pátek': 'friday', 'sobota': 'saturday', 'neděle': 'sunday',
};

function parseOpeningHoursFromText(text) {
  // The page renders: "Pondělí\nDnes\n6:00–22:00\nÚterý\n7. 4.\n6:00–22:00\n..."
  // OR nonstop versions: "Pondělí\nDnes\nNonstop\n..."
  const hours = {};
  const days = Object.keys(DAY_MAP);

  for (const day of days) {
    const dayCapital = day.charAt(0).toUpperCase() + day.slice(1);
    // Match: DayName\n(Dnes|date)\n(hours|Nonstop|Zavřeno)
    const re = new RegExp(
      dayCapital + '\\s*\\n[^\\n]*\\n([^\\n]+)',
      'i'
    );
    const m = text.match(re);
    if (m) {
      const val = m[1].trim();
      if (val && val !== 'Dnes' && !val.match(/^\d{1,2}\. \d{1,2}\.$/)) {
        hours[DAY_MAP[day]] = val;
      }
    }
  }
  return Object.keys(hours).length >= 3 ? hours : null;
}

async function extractDetailData(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

  if (page.url().includes('cmp.seznam.cz')) {
    return null; // session expired
  }

  await delay(1200);

  return await page.evaluate((dayMap) => {
    const text = document.body.innerText;

    // ── phone — extract from text (firmy.cz renders as text, not tel: links after consent)
    const phoneMatches = text.match(/(?:Telefon|Mobil|Tel\.?|Phone)\s*\n?\s*(\+420\s?[\d\s]{9,}|\d{3}[\s-]?\d{3}[\s-]?\d{3})/gi);
    let phone = null;
    if (phoneMatches) {
      const raw = phoneMatches[0].replace(/(?:Telefon|Mobil|Tel\.?|Phone)/i, '').trim();
      phone = raw.replace(/\s+/g, ' ').trim() || null;
    }
    // Fallback: find any Czech phone number pattern in text
    if (!phone) {
      const m = text.match(/\+420\s?\d{3}\s?\d{3}\s?\d{3}/);
      if (m) phone = m[0].replace(/\s+/g, ' ').trim();
    }

    // ── website — from "Web\nexample.cz" text pattern OR external links
    const webTextMatch = text.match(/(?:^|\n)Web\s*\n\s*([^\n]{4,80})/m);
    let website = webTextMatch ? webTextMatch[1].trim() : null;
    if (!website) {
      const webLinks = Array.from(document.querySelectorAll('a[href]')).filter(a => {
        const href = a.href || '';
        return href.startsWith('http') && !href.includes('firmy.cz') &&
          !href.includes('mapy.cz') && !href.includes('mapy.com') &&
          !href.includes('seznam.cz') && !href.includes('instagram.com') &&
          !href.includes('facebook.com') && !href.includes('google.com');
      });
      if (webLinks.length) website = webLinks[0].href;
    }
    if (website) website = website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

    // ── email
    const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : null;

    // ── rating
    const ratingMatch = text.match(/(?:Hodnocení|Rating)[^\d]*(\d[.,]\d)/i);
    const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : null;

    // ── price level
    const priceMatch = text.match(/Cenová úroveň\s*\n?\s*([^\n]{1,50})/i);
    const price_level = priceMatch ? priceMatch[1].trim() : null;

    // ── description
    const descEl = document.querySelector('[class*="description"] p, [itemprop="description"], [class*="perex"]');
    let description = descEl?.innerText?.trim() || null;
    if (!description) {
      // Try from text: first substantial paragraph after "web" or "hodnocení" section
      const descMatch = text.match(/(?:Popis\s*\n|O firmě\s*\n)([^\n].{20,})/i);
      if (descMatch) description = descMatch[1].trim().substring(0, 500);
    }

    // ── ICO
    const icoMatch = text.match(/IČ[O:]?\s*:?\s*(\d{6,8})/i);
    const ico = icoMatch ? icoMatch[1].padStart(8, '0') : null;

    // ── opening hours — parse from structured text
    const hoursObj = {};
    const days = ['pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota', 'neděle'];
    for (const day of days) {
      const dayCapital = day.charAt(0).toUpperCase() + day.slice(1);
      const re = new RegExp(dayCapital + '\\s*\\n[^\\n]*\\n([^\\n]+)', 'i');
      const m = text.match(re);
      if (m) {
        const val = m[1].trim();
        if (val && !val.match(/^\d{1,2}\. \d{1,2}\.$/)) {
          hoursObj[dayMap[day] || day] = val;
        }
      }
    }
    const opening_hours = Object.keys(hoursObj).length >= 3 ? hoursObj : null;

    return { phone, website, email, rating, price_level, description, ico, opening_hours };
  }, DAY_MAP);
}

// ── main ─────────────────────────────────────────────────────────────────────

const gyms = JSON.parse(fs.readFileSync(GYMS_PATH, 'utf8'));
const done = loadProgress();

const toEnrich = gyms.filter(g => g.detail_url && !done.has(g.detail_url));
const total = Math.min(toEnrich.length, LIMIT);

console.log(`To enrich: ${toEnrich.length} gyms with detail_url`);
console.log(`Already done: ${done.size}`);
console.log(`This run: ${total}\n`);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
});
const page = await browser.newPage();
await setupSession(page);

let updated = 0;
let noNewData = 0;
let cmpBlocked = 0;
let failed = 0;

for (let i = 0; i < total; i++) {
  const gym = toEnrich[i];
  process.stdout.write(`[${i + 1}/${total}] ${gym.name} (${gym.city})... `);

  let data = null;
  try {
    data = await extractDetailData(page, gym.detail_url);
  } catch (err) {
    process.stdout.write(`ERROR: ${err.message}\n`);
    failed++;
    done.add(gym.detail_url);
    if ((i + 1) % 25 === 0) saveProgress(done);
    await randomDelay();
    continue;
  }

  if (!data) {
    process.stdout.write('CMP blocked — re-establishing consent...\n');
    cmpBlocked++;
    try {
      await handleCmpConsent(page);
      // Retry once
      data = await extractDetailData(page, gym.detail_url);
    } catch {}
    if (!data) {
      if (cmpBlocked > 5) {
        console.log('\nToo many CMP blocks. Stopping.');
        break;
      }
      await delay(5000);
      continue;
    }
  }

  // Apply enrichment (don't overwrite existing good data)
  const changes = [];
  if (!gym.phone && data.phone) { gym.phone = data.phone; changes.push('phone'); }
  if (!gym.website && data.website) { gym.website = data.website; changes.push('web'); }
  if (!gym.email && data.email) { gym.email = data.email; changes.push('email'); }
  if (!gym.ico && data.ico) { gym.ico = data.ico; changes.push('ico'); }
  if (!gym.rating && data.rating) { gym.rating = data.rating; changes.push('rating'); }
  if (!gym.price_level && data.price_level) { gym.price_level = data.price_level; changes.push('price'); }
  if (!gym.description && data.description) { gym.description = data.description; changes.push('desc'); }
  if (!gym.opening_hours && data.opening_hours) { gym.opening_hours = data.opening_hours; changes.push('hours'); }

  if (changes.length) updated++; else noNewData++;
  process.stdout.write(`${changes.length ? '+[' + changes.join(',') + ']' : 'no new data'}\n`);

  done.add(gym.detail_url);

  if ((i + 1) % 25 === 0 || i === total - 1) {
    fs.writeFileSync(GYMS_PATH, JSON.stringify(gyms, null, 2), 'utf8');
    saveProgress(done);
    console.log(`  [SAVED] ${i + 1} processed`);
  }

  await randomDelay();
}

fs.writeFileSync(GYMS_PATH, JSON.stringify(gyms, null, 2), 'utf8');
saveProgress(done);
await browser.close();

console.log(`\n${'═'.repeat(60)}`);
console.log(`Done. Updated: ${updated} | No new data: ${noNewData} | CMP: ${cmpBlocked} | Failed: ${failed}`);

const stats = {
  phone: gyms.filter(g => g.phone && g.phone !== 'N/A').length,
  website: gyms.filter(g => g.website && g.website !== 'N/A').length,
  hours: gyms.filter(g => g.opening_hours).length,
  ico: gyms.filter(g => g.ico).length,
  email: gyms.filter(g => g.email).length,
  rating: gyms.filter(g => g.rating).length,
};
console.log('\ngyms.json coverage:');
Object.entries(stats).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
