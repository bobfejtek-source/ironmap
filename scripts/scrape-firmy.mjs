/**
 * Scraper: firmy.cz + zivefirmy.cz → gyms_new.json
 *
 * Usage:
 *   node scrape-firmy.mjs          → full run (all cities)
 *   node scrape-firmy.mjs --preview → first 20 results only, then exit
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';

puppeteer.use(StealthPlugin());

const PREVIEW_MODE = process.argv.includes('--preview');
const PREVIEW_LIMIT = 20;
const PROGRESS_FILE = 'data/scrape-progress.json';
const OUTPUT_FILE = 'data/gyms_new.json';

const CITIES = [
  'Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc',
  'Hradec Králové', 'České Budějovice', 'Ústí nad Labem', 'Pardubice',
  'Zlín', 'Kladno', 'Mladá Boleslav', 'Opava', 'Frýdek-Místek',
  'Karviná', 'Jihlava', 'Teplice', 'Děčín', 'Chomutov',
  'Jablonec nad Nisou', 'Prostějov', 'Přerov', 'Havířov', 'Třebíč',
  'Znojmo', 'Příbram', 'Kolín', 'Šumperk', 'Trutnov', 'Cheb',
  'Nový Jičín', 'Hodonín', 'Klatovy', 'Uherské Hradiště', 'Písek',
  'Vsetín', 'Kroměříž', 'Blansko', 'Strakonice', 'Litoměřice',
  'Náchod', 'Bruntál', 'Beroun', 'Žďár nad Sázavou', 'Sokolov',
  'Benešov', 'Rychnov nad Kněžnou', 'Rokycany', 'Český Krumlov',
  'Vyškov', 'Kopřivnice', 'Frýdlant nad Ostravicí', 'Valašské Meziříčí',
  'Rožnov pod Radhoštěm',
];

const EXCLUDE_KEYWORDS = [
  // outdoor / school
  'hřiště', 'sokolovna', 'tělocvična', 'školní', 'základní škola',
  // equipment shops
  'vybavení', 'e-shop', 'eshop', 'prodej', 'stroje', 'trenažér',
  // physiotherapy / health clinics
  'bolest', 'záda', 'rehabilit', 'fyzioterapi', 'fyzio', 'terapie', 'ordinace', 'léčeb',
  // spa / balneology
  'balneo', 'lázn', 'termální',
  // hotel fitness (hotel brands or generic)
  'hotel', 'hilton', 'fairmont', 'marriott', 'radisson', 'ibis', 'holiday inn',
  // tanning salons
  'solárn', 'solárium', 'tanning', 'opalovac',
  // pure yoga / pilates (name contains the keyword — combo places like SouLadronka won't match)
  'jóg', 'yoga', 'joga', 'pilates', 'meditac',
  // hotel fitness (additional patterns)
  'park holiday', 'resort', 'congress hotel', 'pension',
];

const ALLOWED_TAGS = [
  'fitness centra', 'posilovny', 'fitness', 'wellness',
  'squash', 'crossfit', 'pilates', 'jóga', 'yoga',
];

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay() {
  return delay(2000 + Math.random() * 2000);
}

function cleanWebsite(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Strip firmy.cz UTM params, get the real domain
    const base = `${u.protocol}//${u.hostname}`;
    return base.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  } catch {
    return null;
  }
}

function normalizeCity(address) {
  // Extract city from address like "Jabloňová 2136/11, Praha, Záběhlice"
  const parts = address.split(',').map(s => s.trim());
  // The city is usually the second-to-last or second part
  for (const city of CITIES) {
    if (address.includes(city)) return city;
  }
  return parts[1] || parts[0] || null;
}

function isExcluded(name, tags) {
  const nameLower = name.toLowerCase();
  if (EXCLUDE_KEYWORDS.some(kw => nameLower.includes(kw))) return true;
  const tagsLower = tags?.toLowerCase() || '';
  if (tagsLower.includes('prodej potřeb') || tagsLower.includes('velkoobchod')) return true;
  return false;
}

async function lookupAres(name, city) {
  // ARES public REST API v2 — POST with JSON body
  try {
    const res = await fetch(
      'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ obchodniJmeno: name, pocet: 5, start: 0 }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const items = data.ekonomickeSubjekty || [];
    // Prefer match in same city, fallback to first result
    const cityLower = city.toLowerCase();
    const match = items.find(s =>
      s.sidlo?.nazevObce?.toLowerCase().includes(cityLower) ||
      s.sidlo?.nazevObce?.toLowerCase() === cityLower
    ) || items[0];
    return match?.ico ? String(match.ico).padStart(8, '0') : null;
  } catch {
    return null;
  }
}

async function scrapeDetailPage(page, url) {
  const detailPage = await page.browser().newPage();
  try {
    await detailPage.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await detailPage.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    const data = await detailPage.evaluate(() => {
      // Phone: tel: link
      const phoneEl = document.querySelector('[href^="tel:"]');
      const phone = phoneEl ? phoneEl.getAttribute('href').replace('tel:', '').trim() : null;

      // Website: external link button (not firmy.cz itself)
      const webEl = Array.from(document.querySelectorAll('a[href]')).find(a => {
        const href = a.href || '';
        return href.startsWith('http') && !href.includes('firmy.cz') && !href.includes('mapy.cz') &&
          (a.innerText?.trim().toLowerCase() === 'web' || a.className?.includes('web') || a.getAttribute('data-dot')?.includes('web'));
      });
      const website = webEl?.href || null;

      return { phone, website };
    });
    return data;
  } catch {
    return { phone: null, website: null };
  } finally {
    await detailPage.close();
  }
}

async function scrapeListingPage(page, city, pageNum) {
  // Include city in query for city-specific results; omit page=1 (triggers bot detection)
  const q = encodeURIComponent(`fitness posilovna ${city}`);
  const url = pageNum === 1
    ? `https://www.firmy.cz/?q=${q}`
    : `https://www.firmy.cz/?q=${q}&page=${pageNum}`;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  const boxes = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('.premiseBox').forEach(box => {
      const name = box.querySelector('.title')?.innerText?.trim();
      const address = box.querySelector('.address')?.innerText?.trim();
      const tags = box.querySelector('.tags')?.innerText?.trim();
      const detailLink = box.querySelector('a.titleLinkOverlay')?.href;

      // Website from "Web" button
      const webBtn = Array.from(box.querySelectorAll('a.btn')).find(a =>
        a.innerText?.trim().toLowerCase() === 'web'
      );
      const website = webBtn?.href || null;

      // Phone (if shown, rare on listing)
      const phoneEl = box.querySelector('[href^="tel:"]');
      const phone = phoneEl ? phoneEl.getAttribute('href').replace('tel:', '').trim() : null;

      if (name) results.push({ name, address, tags, detailLink, website, phone });
    });
    return results;
  });

  // Check if there are more pages
  const hasNext = await page.evaluate(pageNum => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    return links.some(a => a.href?.includes(`page=${pageNum + 1}`));
  }, pageNum);

  return { boxes, hasNext };
}

async function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch {
    return { done: [], records: [] };
  }
}

function saveProgress(progress) {
  fs.mkdirSync(path.dirname(PROGRESS_FILE), { recursive: true });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ── Main ──────────────────────────────────────────────────────────────────────

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
});
const page = await browser.newPage();
await page.setUserAgent(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
);

// Use about:blank warmup — homepage corrupts results with personalized ads
await page.goto('about:blank');
await page.setExtraHTTPHeaders({
  'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-site': 'none',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-user': '?1',
  'sec-fetch-dest': 'document',
});
await delay(500);

const progress = await loadProgress();
const seen = new Set(
  progress.records.map(r => `${r.name.toLowerCase()}|${r.city.toLowerCase()}`)
);
const results = [...progress.records];

let totalScraped = 0;
const citiesToRun = PREVIEW_MODE ? ['Praha'] : CITIES;

outer:
for (const city of citiesToRun) {
  if (!PREVIEW_MODE && progress.done.includes(city)) {
    console.log(`[SKIP] ${city} (already done)`);
    continue;
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[CITY] ${city}`);

  let pageNum = 1;
  let cityCount = 0;
  let emptyPageStreak = 0;
  const MAX_EMPTY_PAGES = 5; // stop if 5 consecutive pages yield no city matches

  while (true) {
    console.log(`  [PAGE ${pageNum}] Fetching...`);
    let listing;
    try {
      listing = await scrapeListingPage(page, city, pageNum);
    } catch (err) {
      console.log(`  [ERROR] ${err.message}`);
      break;
    }

    let pageMatches = 0;
    for (const box of listing.boxes) {
      const { name, address, tags, website, phone, detailLink } = box;

      // City filter — must match target city in address
      const resolvedCity = normalizeCity(address || '');
      if (!resolvedCity || !resolvedCity.toLowerCase().includes(city.toLowerCase().split(' ')[0].toLowerCase())) {
        continue;
      }

      // Exclusion filter
      if (isExcluded(name, tags)) continue;

      const key = `${name.toLowerCase()}|${resolvedCity.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let cleanSite = cleanWebsite(website);
      let resolvedPhone = phone || null;

      // Enrich from detail page if phone/website missing from listing card
      if ((!cleanSite || !resolvedPhone) && detailLink) {
        try {
          const enriched = await scrapeDetailPage(page, detailLink);
          if (!cleanSite && enriched.website) cleanSite = cleanWebsite(enriched.website);
          if (!resolvedPhone && enriched.phone) resolvedPhone = enriched.phone;
          await delay(1000 + Math.random() * 1000);
        } catch {}
      }

      const record = {
        name,
        city: resolvedCity,
        address: address || null,
        phone: resolvedPhone,
        website: cleanSite,
        ico: null,
        tags: tags || null,
        source: 'firmy.cz',
        detail_url: detailLink || null,
      };

      // IČO lookup via ARES
      if (!PREVIEW_MODE || totalScraped < PREVIEW_LIMIT) {
        try {
          record.ico = await lookupAres(name, resolvedCity);
          await delay(400); // respect ARES rate limit
        } catch {}
      }

      results.push(record);
      totalScraped++;
      cityCount++;
      pageMatches++;
      console.log(`  [${totalScraped}] ${name} | ${resolvedCity} | ${cleanSite || phone || '—'} | IČO: ${record.ico || '?'}`);

      // Save progress every 50 records
      if (!PREVIEW_MODE && results.length % 50 === 0) {
        saveProgress({ done: progress.done, records: results });
        console.log(`  [SAVED] ${results.length} records`);
      }

      if (PREVIEW_MODE && totalScraped >= PREVIEW_LIMIT) break outer;
    }

    // Stop paginating if too many pages with no city matches
    if (pageMatches === 0) {
      emptyPageStreak++;
      if (emptyPageStreak >= MAX_EMPTY_PAGES) {
        console.log(`  [STOP] ${MAX_EMPTY_PAGES} consecutive pages with no ${city} results`);
        break;
      }
    } else {
      emptyPageStreak = 0;
    }

    if (!listing.hasNext) break;
    pageNum++;
    await randomDelay();
  }

  console.log(`  [DONE] ${city}: ${cityCount} gyms`);

  if (!PREVIEW_MODE) {
    progress.done.push(city);
    saveProgress({ done: progress.done, records: results });
    await randomDelay();
  }
}

await browser.close();

// Write output
fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

console.log(`\n${'═'.repeat(60)}`);
console.log(`TOTAL: ${results.length} gyms written to ${OUTPUT_FILE}`);
if (PREVIEW_MODE) {
  console.log('PREVIEW COMPLETE — awaiting approval before full run.');
}
