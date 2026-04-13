/**
 * MultiSport partner matching + new gym import
 *
 * 1. Matches MultiSport facilities (GPS + name) against IRON DB gyms
 * 2. Sets multisport = true/false on matched/unmatched IRON gyms
 * 3. Fetches detail for unmatched gym-type MS partners → inserts as new gyms
 *
 * Usage:
 *   node --env-file=.env.local scripts/match-multisport.mjs
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.local') });

// ── Config ────────────────────────────────────────────────────────────────────

const FACILITIES_FILE   = path.join(__dirname, 'multisport_facilities.json');
const GPS_THRESHOLD_M   = 200;
const NAME_THRESHOLD    = 0.52;
const DETAIL_GAP_MS     = 120;  // ~8 req/s
const TOKEN_TTL_MS      = 170 * 1000; // refresh after 170s (access token lasts ~200s)

// icon_name → DB category
const CATEGORY_MAP = {
  posilovny_a_silove_treninky: 'Posilovna',
  mix_aktivit:                 'Posilovna',
  joga_a_zdravotni_cviceni:    'Jóga',
  skupinove_a_tanecni_lekce:   'Pilates',
};
const INSERT_ICONS = new Set(Object.keys(CATEGORY_MAP));

const BASE_URL = 'https://mapa.multisport.cz';

// ── DB ────────────────────────────────────────────────────────────────────────

const db = new pg.Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Geo ───────────────────────────────────────────────────────────────────────

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCoords(raw) {
  if (!raw) return null;
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const lat = parseFloat(p.lat ?? p.latitude);
    const lng = parseFloat(p.lng ?? p.lon ?? p.longitude);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  } catch {}
  if (typeof raw === 'string') {
    const parts = raw.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]), lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  }
  return null;
}

// ── Name matching ─────────────────────────────────────────────────────────────

const LEGAL = /\b(s\.?\s*r\.?\s*o\.?|a\.?\s*s\.?|z\.?\s*s\.?|spol|ltd|fitness\s+club)\b/gi;

function norm(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(LEGAL, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function lev(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function nameSim(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  return 1 - lev(na, nb) / Math.max(na.length, nb.length);
}

// ── Slug generator ────────────────────────────────────────────────────────────

function toSlug(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function uniqueSlug(base) {
  let slug = base, n = 1;
  for (;;) {
    const { rows } = await db.query('SELECT 1 FROM gyms WHERE slug = $1', [slug]);
    if (rows.length === 0) return slug;
    slug = `${base}-${++n}`;
  }
}

// ── Puppeteer token management ────────────────────────────────────────────────

let browser, page, tokenData, tokenFetchedAt = 0;

async function launchBrowser() {
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  page = await browser.newPage();
}

async function getToken() {
  // Get fresh token via browser (handles obfuscated auth.js automatically)
  return new Promise(async (resolve, reject) => {
    let resolved = false;
    const handler = async res => {
      if (resolved) return;
      if (res.url().includes('/api/v1/token')) {
        try {
          const body = await res.json();
          if (body.access) {
            resolved = true;
            page.off('response', handler);
            tokenData = body;
            tokenFetchedAt = Date.now();
            resolve(body.access);
          }
        } catch {}
      }
    };
    page.on('response', handler);
    await page.goto(`${BASE_URL}/cs/`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    if (!resolved) reject(new Error('Token not captured'));
  });
}

async function freshToken() {
  if (!tokenData || Date.now() - tokenFetchedAt > TOKEN_TTL_MS) {
    console.error('  [auth] refreshing token...');
    await getToken();
  }
  return tokenData.access;
}

// ── MultiSport API ────────────────────────────────────────────────────────────

let lastReq = 0;

async function throttle() {
  const wait = DETAIL_GAP_MS - (Date.now() - lastReq);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastReq = Date.now();
}

async function fetchDetail(msId) {
  await throttle();
  const token = await freshToken();
  const res = await fetch(`${BASE_URL}/api/v1/facility/${msId}/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept-Language': 'cs',
      'User-Agent': 'Mozilla/5.0',
      'Referer': `${BASE_URL}/cs/`,
    },
    signal: AbortSignal.timeout(12000),
  });
  if (res.status === 401) {
    // Force token refresh
    tokenFetchedAt = 0;
    return fetchDetail(msId);
  }
  if (!res.ok) throw new Error(`Detail HTTP ${res.status} for ${msId}`);
  return res.json();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await db.connect();
  console.log('Connected to DB');

  // ── Load MultiSport facilities ──────────────────────────────────────────────
  const msRaw = JSON.parse(fs.readFileSync(FACILITIES_FILE, 'utf8'));
  const msFacilities = msRaw.features ?? [];
  console.log(`MultiSport facilities loaded: ${msFacilities.length}`);

  // ── Load IRON gyms with coordinates ────────────────────────────────────────
  const { rows: ironGyms } = await db.query(`
    SELECT id, name, city, address, coordinates, multisport
    FROM gyms
    WHERE staging = false AND name != 'Unnamed Gym' AND coordinates IS NOT NULL
  `);
  console.log(`IRON gyms with coords: ${ironGyms.length}`);

  // Pre-parse coords
  const ironParsed = ironGyms.map(g => ({
    ...g,
    coords: parseCoords(g.coordinates),
  })).filter(g => g.coords);
  console.log(`  parseable coords: ${ironParsed.length}`);

  // ── GPS + name matching ─────────────────────────────────────────────────────
  console.log('\nMatching...');

  const matched       = new Map(); // iron_id → { msId, method, sim, dist }
  const unmatchedMs   = [];        // MS facilities not matched to any IRON gym
  const matchedMsIds  = new Set();

  let gpsMatches = 0, nameMatches = 0;

  for (const ms of msFacilities) {
    const [msLng, msLat] = ms.geometry.coordinates;
    const msName = ms.properties.name;

    // Find candidates within GPS threshold
    const candidates = ironParsed
      .map(g => ({
        g,
        dist: haversineM(msLat, msLng, g.coords.lat, g.coords.lng),
      }))
      .filter(c => c.dist <= GPS_THRESHOLD_M)
      .map(c => ({ ...c, sim: nameSim(msName, c.g.name) }))
      .sort((a, b) => a.dist - b.dist || b.sim - a.sim);

    if (candidates.length > 0) {
      // Best candidate: closest within GPS threshold, sim ≥ 0 (any name ok if within 100m)
      // For 100-200m: require minimum name sim
      const best = candidates.find(c =>
        c.dist <= 100 || c.sim >= NAME_THRESHOLD
      );

      if (best) {
        const prevMatch = matched.get(best.g.id);
        if (!prevMatch || best.dist < prevMatch.dist) {
          matched.set(best.g.id, {
            msId: ms.id,
            msName,
            method: best.dist <= 100 ? 'gps' : 'gps+name',
            sim: best.sim,
            dist: Math.round(best.dist),
          });
          matchedMsIds.add(ms.id);
          if (best.dist <= 100) gpsMatches++;
          else nameMatches++;
        }
        continue;
      }
    }

    // No GPS match — try pure name match across all IRON gyms (expensive fallback)
    // Only for gym-type facilities to keep it fast
    if (INSERT_ICONS.has(ms.properties.icon_name)) {
      const nameBest = ironParsed
        .map(g => ({ g, sim: nameSim(msName, g.name) }))
        .filter(c => c.sim >= 0.82)   // strict threshold for name-only match
        .sort((a, b) => b.sim - a.sim)[0];
      if (nameBest) {
        const prevMatch = matched.get(nameBest.g.id);
        if (!prevMatch || nameBest.sim > prevMatch.sim) {
          matched.set(nameBest.g.id, {
            msId: ms.id,
            msName,
            method: 'name_only',
            sim: nameBest.sim,
            dist: null,
          });
          matchedMsIds.add(ms.id);
          nameMatches++;
          continue;
        }
      }
    }

    unmatchedMs.push(ms);
  }

  console.log(`Matched: ${matched.size} IRON gyms`);
  console.log(`Unmatched MS facilities: ${unmatchedMs.length}`);

  // ── DB updates: matched gyms → multisport = true ──────────────────────────
  console.log('\nUpdating matched gyms (multisport = true)...');
  const matchedIds = [...matched.keys()];
  if (matchedIds.length > 0) {
    await db.query(
      `UPDATE gyms SET multisport = true WHERE id = ANY($1::int[])`,
      [matchedIds]
    );
  }

  // ── DB updates: all other IRON gyms → multisport = false ─────────────────
  console.log('Setting multisport = false for remaining IRON gyms...');
  const { rowCount: falseCount } = await db.query(`
    UPDATE gyms SET multisport = false
    WHERE staging = false AND name != 'Unnamed Gym' AND multisport IS NULL
  `);
  console.log(`  → ${falseCount} gyms set to false`);

  // ── Fetch details + insert unmatched gym-type MS partners ─────────────────
  const toInsert = unmatchedMs.filter(ms => INSERT_ICONS.has(ms.properties.icon_name));
  console.log(`\nUnmatched gym-type MS partners to insert: ${toInsert.length}`);

  await launchBrowser();
  console.log('Fetching initial token...');
  await getToken();
  console.log('Token acquired');

  let inserted = 0, detailErrors = 0;
  const insertedNames = [];

  for (let i = 0; i < toInsert.length; i++) {
    const ms = toInsert[i];
    process.stdout.write(`\r  [${i + 1}/${toInsert.length}] ${ms.properties.name.slice(0, 50).padEnd(50)} `);

    try {
      const detail = await fetchDetail(ms.id);
      const p = detail.properties;

      if (!p.city) { detailErrors++; continue; }

      const category = CATEGORY_MAP[ms.properties.icon_name];
      const name  = p.name ?? ms.properties.name;
      const city  = p.city;
      const street = [p.street, p.number].filter(Boolean).join(' ');
      const [lng, lat] = ms.geometry.coordinates;
      const coords = JSON.stringify({ lat, lng });
      const slugBase = toSlug(`${name}-${city}`);
      const slug = await uniqueSlug(slugBase);

      await db.query(`
        INSERT INTO gyms
          (name, slug, city, address, coordinates, phone, website, category,
           multisport, staging, discovery_source, source)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,true,false,'multisport','multisport')
        ON CONFLICT (slug) DO NOTHING
      `, [
        name, slug, city,
        street || null,
        coords,
        p.phone || null,
        p.website_url || null,
        category,
      ]);

      inserted++;
      insertedNames.push({ name, city });
    } catch (err) {
      detailErrors++;
      process.stderr.write(`\n  ✗ ${ms.properties.name}: ${err.message}\n`);
    }
  }

  await browser.close();
  console.log('\n');

  // ── Final DB counts ───────────────────────────────────────────────────────
  const { rows: [counts] } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE multisport = true  AND staging = false) AS ms_true,
      COUNT(*) FILTER (WHERE multisport = false AND staging = false) AS ms_false,
      COUNT(*) FILTER (WHERE multisport IS NULL AND staging = false) AS ms_null
    FROM gyms WHERE name != 'Unnamed Gym'
  `);

  // Unmatched gym-type MS: get city for those (we have coords, reverse-geocode not needed — use MS id)
  const unmatchedGymType = unmatchedMs.filter(ms => INSERT_ICONS.has(ms.properties.icon_name));
  const unmatchedOther   = unmatchedMs.filter(ms => !INSERT_ICONS.has(ms.properties.icon_name));

  // ── Report ────────────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════');
  console.log('MULTISPORT MATCHING REPORT');
  console.log('══════════════════════════════════════════════════════');
  console.log(`1. IRON gyms matched → multisport = true  : ${matchedIds.length}`);
  console.log(`2. IRON gyms         → multisport = false : ${counts.ms_false}`);
  console.log(`3. Unmatched MS facilities total           : ${unmatchedMs.length}`);
  console.log(`   ↳ gym-type (insert candidates)          : ${unmatchedGymType.length}`);
  console.log(`   ↳ other types (pool, tennis, etc.)      : ${unmatchedOther.length}`);
  console.log(`4. Match method breakdown:`);
  console.log(`   ↳ GPS ≤ 100m                            : ${gpsMatches}`);
  console.log(`   ↳ GPS 100-200m + name ≥ ${NAME_THRESHOLD}          : ${nameMatches}`);
  console.log(`5. Total IRON gyms with multisport != NULL : ${parseInt(counts.ms_true) + parseInt(counts.ms_false)}`);
  console.log(`   ↳ multisport = true                     : ${counts.ms_true}`);
  console.log(`   ↳ multisport = false                    : ${counts.ms_false}`);
  console.log(`   ↳ multisport = NULL (staging/no coords) : ${counts.ms_null}`);
  console.log(`6. New gyms inserted from MS               : ${inserted}`);
  console.log(`   ↳ Detail fetch errors                   : ${detailErrors}`);
  console.log('══════════════════════════════════════════════════════');

  console.log('\nTop 20 unmatched MS gym-type partners:');
  console.log('(showing MS id, name, icon_name, lat, lng)');
  unmatchedGymType.slice(0, 20).forEach(ms => {
    const [lng, lat] = ms.geometry.coordinates;
    console.log(`  #${ms.id}  ${ms.properties.name.padEnd(40)} ${ms.properties.icon_name.slice(0,30).padEnd(32)} ${lat.toFixed(4)},${lng.toFixed(4)}`);
  });

  if (inserted > 0) {
    console.log('\nFirst 10 newly inserted gyms:');
    insertedNames.slice(0, 10).forEach(g => console.log(`  ${g.name} — ${g.city}`));
  }

  await db.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
