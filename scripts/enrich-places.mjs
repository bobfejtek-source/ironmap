/**
 * Google Places API gym enrichment
 *
 * For each gym with coordinates: Nearby Search → Text Search fallback.
 * Accepts match if name similarity > 0.6 AND distance < 500m.
 * Only fills NULL fields — never overwrites existing data.
 * Saves progress to scripts/enrich-progress.json every 50 gyms.
 *
 * Usage:
 *   node scripts/enrich-places.mjs --dry-run           # test on 20 gyms, no DB writes
 *   node scripts/enrich-places.mjs --dry-run --limit 5 # test on N gyms
 *   node scripts/enrich-places.mjs                     # full run
 *   node scripts/enrich-places.mjs --limit 100         # partial run
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.local') });
const PROGRESS_PATH = path.join(__dirname, 'enrich-progress.json');

// ── CLI args ──────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const FIX_RATING_COUNT = process.argv.includes('--fix-rating-count');
const UNMATCHED_ONLY = process.argv.includes('--unmatched-only');
const LIMIT_ARG = process.argv.indexOf('--limit');
const LIMIT = LIMIT_ARG !== -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) : (DRY_RUN ? 20 : Infinity);

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!PLACES_API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY in .env.local');
  process.exit(1);
}

// ── Config ────────────────────────────────────────────────────────────────────

const NEARBY_RADIUS_M    = 500;
const MIN_NAME_SIMILARITY = 0.6;
const MAX_DISTANCE_M      = 500;
const SAVE_EVERY          = 50;
const MIN_REQUEST_GAP_MS  = 100; // 10 req/sec max

// ── DB ────────────────────────────────────────────────────────────────────────

const db = new pg.Pool({ connectionString: process.env.POSTGRES_URL });

async function ensureColumns() {
  await db.query(`
    ALTER TABLE gyms
      ADD COLUMN IF NOT EXISTS place_id      TEXT,
      ADD COLUMN IF NOT EXISTS rating_count  INTEGER
  `);
}

async function getGymsToEnrich() {
  const { rows } = await db.query(`
    SELECT id, name, city, address, coordinates, phone, website, opening_hours,
           price_level, rating, rating_count, place_id
    FROM gyms
    WHERE coordinates IS NOT NULL
      AND name != 'Unnamed Gym'
      ${FIX_RATING_COUNT ? 'AND rating IS NOT NULL AND rating_count IS NULL' : ''}
      ${UNMATCHED_ONLY ? 'AND rating IS NULL' : ''}
    ORDER BY id
  `);
  return rows;
}

async function updateGym(id, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = [id, ...keys.map(k => fields[k])];
  await db.query(`UPDATE gyms SET ${setClauses} WHERE id = $1`, values);
}

// ── Progress ──────────────────────────────────────────────────────────────────

function loadProgress() {
  try {
    const data = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    return new Set(data.done ?? []);
  } catch {
    return new Set();
  }
}

function saveProgress(done, stats) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify({ done: [...done], stats }, null, 2));
}

// ── Geo helpers ───────────────────────────────────────────────────────────────

function parseCoords(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed.lat !== undefined && parsed.lng !== undefined) {
      return { lat: parseFloat(parsed.lat), lng: parseFloat(parsed.lng) };
    }
    if (parsed.lat !== undefined && parsed.lon !== undefined) {
      return { lat: parseFloat(parsed.lat), lng: parseFloat(parsed.lon) };
    }
  } catch {}
  // Try "lat,lng" string format
  const parts = String(raw).split(',');
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  return null;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Fuzzy name matching ───────────────────────────────────────────────────────

const LEGAL_SUFFIXES = /\b(s\.?\s*r\.?\s*o\.?|a\.?\s*s\.?|z\.?\s*s\.?|spol|ltd|gmbh|inc|fitness\s+club|sporty\s+education\s+center)\b/gi;

function normalize(s) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(LEGAL_SUFFIXES, '')                       // strip legal suffixes
    .replace(/[^a-z0-9\s]/g, '')                       // strip punctuation (dots, dashes, etc.)
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function nameSimilarity(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  // Also check if one contains the other (handles "Gym XYZ" vs "Fitness Gym XYZ s.r.o.")
  if (na.includes(nb) || nb.includes(na)) {
    return 0.85;
  }
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length);
}

// ── Google Places API ─────────────────────────────────────────────────────────

const FIELDS = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.formattedAddress',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.regularOpeningHours',
  'places.priceLevel',
  'places.rating',
  'places.userRatingCount',
].join(',');

async function nearbySearch(lat, lng, gymName) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify({
      includedTypes: ['gym', 'fitness_center', 'sports_complex', 'yoga_studio'],
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: NEARBY_RADIUS_M },
      },
      maxResultCount: 10,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Nearby Search HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.places ?? [];
}

async function textSearch(gymName, city) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify({
      textQuery: `${gymName} ${city} Czech Republic`,
      languageCode: 'cs',
      maxResultCount: 5,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Text Search HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.places ?? [];
}

// ── Match scoring ─────────────────────────────────────────────────────────────

// Returns true if two addresses share enough street-level tokens to be the
// same location — handles diacritics, postal codes, country suffix differences.
function addressesMatch(ourAddress, placeAddress) {
  if (!ourAddress || !placeAddress) return false;
  const norm = s => s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .replace(/\b(czech republic|czechia|cr|cz)\b/g, '') // strip country
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const a = norm(ourAddress);
  const b = norm(placeAddress);
  // Tokens longer than 3 chars carry real signal (skip short words, numbers alone)
  const tokens = a.split(' ').filter(t => t.length > 3 && !/^\d+$/.test(t));
  if (tokens.length === 0) return false;
  const hits = tokens.filter(t => b.includes(t));
  // Require at least 2 matching tokens, or 100% if there's only 1 significant token
  return tokens.length === 1 ? hits.length === 1 : hits.length >= 2;
}

function scoreCandidates(candidates, gymName, ourLat, ourLng) {
  const scored = candidates.map(place => {
    const placeName = place.displayName?.text ?? '';
    const sim = nameSimilarity(gymName, placeName);
    const placeLat = place.location?.latitude;
    const placeLng = place.location?.longitude;
    const dist = (placeLat != null && placeLng != null)
      ? haversineMeters(ourLat, ourLng, placeLat, placeLng)
      : Infinity;
    return { place, placeName, sim, dist };
  });
  return scored.sort((a, b) => b.sim - a.sim || a.dist - b.dist);
}

// ── Field extraction ──────────────────────────────────────────────────────────

const PRICE_LEVEL_MAP = {
  PRICE_LEVEL_FREE: 'Zdarma',
  PRICE_LEVEL_INEXPENSIVE: 'Levné',
  PRICE_LEVEL_MODERATE: 'Střední',
  PRICE_LEVEL_EXPENSIVE: 'Drahé',
  PRICE_LEVEL_VERY_EXPENSIVE: 'Velmi drahé',
};

function extractFields(place) {
  const phone   = place.internationalPhoneNumber ?? null;
  const website = place.websiteUri
    ? place.websiteUri.replace(/\/$/, '')
    : null;
  const opening_hours = place.regularOpeningHours?.weekdayDescriptions
    ? JSON.stringify(place.regularOpeningHours.weekdayDescriptions)
    : null;
  const price_level = place.priceLevel
    ? (PRICE_LEVEL_MAP[place.priceLevel] ?? place.priceLevel)
    : null;
  const rating       = place.rating ?? null;
  const rating_count = place.userRatingCount ?? null;
  const place_id     = place.id ?? null;

  return { phone, website, opening_hours, price_level, rating, rating_count, place_id };
}

function isEmpty(v) {
  return v === null || v === undefined || v === 'N/A' || v === '';
}

function pickNullFields(gym, extracted) {
  const updates = {};
  for (const [k, v] of Object.entries(extracted)) {
    if (v !== null && isEmpty(gym[k])) {
      updates[k] = v;
    }
  }
  return updates;
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

let lastRequestAt = 0;
async function rateLimitedFetch(fn) {
  const now = Date.now();
  const wait = MIN_REQUEST_GAP_MS - (now - lastRequestAt);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestAt = Date.now();
  return fn();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  IRONMAP — Google Places Enrichment`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'LIVE'}${FIX_RATING_COUNT ? ' — fix rating_count only' : ''}${UNMATCHED_ONLY ? ' — unmatched gyms only' : ''}`);
  console.log(`  Limit: ${isFinite(LIMIT) ? LIMIT : 'all'} gyms`);
  console.log(`${'═'.repeat(60)}\n`);

  await ensureColumns();
  console.log('DB columns verified.\n');

  const allGyms = await getGymsToEnrich();
  // --fix-rating-count / --unmatched-only ignore progress: re-process all matching gyms fresh
  const done    = (DRY_RUN || FIX_RATING_COUNT || UNMATCHED_ONLY) ? new Set() : loadProgress();

  const toProcess = allGyms
    .filter(g => !done.has(g.id))
    .slice(0, isFinite(LIMIT) ? LIMIT : undefined);

  console.log(`Total gyms with coords: ${allGyms.length}`);
  console.log(`Already processed:      ${done.size}`);
  console.log(`This run:               ${toProcess.length}\n`);

  const stats = { matched: 0, lowConfidence: 0, noResult: 0, failed: 0, fieldsAdded: 0 };
  const log = [];

  for (let i = 0; i < toProcess.length; i++) {
    const gym = toProcess[i];
    const coords = parseCoords(gym.coordinates);
    const prefix = `[${i + 1}/${toProcess.length}] ${gym.name} (${gym.city})`;

    if (!coords) {
      process.stdout.write(`${prefix} — SKIP (no parseable coords)\n`);
      stats.noResult++;
      done.add(gym.id);
      continue;
    }

    let candidates = [];
    let searchType = 'nearby';

    try {
      candidates = await rateLimitedFetch(() => nearbySearch(coords.lat, coords.lng, gym.name));

      if (candidates.length === 0) {
        // Nearby found nothing — try text search
        searchType = 'text';
        candidates = await rateLimitedFetch(() => textSearch(gym.name, gym.city));
      } else {
        // Nearby found results but check if best name match is acceptable.
        // Many gyms are classified as 'spa'/'health' in Places and won't appear
        // in type-filtered nearby search — text search finds them by name directly.
        const bestSim = scoreCandidates(candidates, gym.name, coords.lat, coords.lng)[0].sim;
        if (bestSim < MIN_NAME_SIMILARITY) {
          searchType = 'nearby+text';
          const textCandidates = await rateLimitedFetch(() => textSearch(gym.name, gym.city));
          // Merge, deduplicate by place id
          const seen = new Set(candidates.map(p => p.id));
          for (const p of textCandidates) {
            if (!seen.has(p.id)) candidates.push(p);
          }
        }
      }
    } catch (err) {
      process.stdout.write(`${prefix} — FAILED: ${err.message}\n`);
      stats.failed++;
      log.push({ id: gym.id, name: gym.name, city: gym.city, status: 'failed', error: err.message });
      done.add(gym.id);
      if ((i + 1) % SAVE_EVERY === 0) saveProgress(done, stats);
      continue;
    }

    if (candidates.length === 0) {
      process.stdout.write(`${prefix} — no results\n`);
      stats.noResult++;
      log.push({ id: gym.id, name: gym.name, city: gym.city, status: 'no_result' });
      done.add(gym.id);
      if ((i + 1) % SAVE_EVERY === 0) saveProgress(done, stats);
      continue;
    }

    const scored = scoreCandidates(candidates, gym.name, coords.lat, coords.lng);
    const best = scored[0];

    const simThreshold = best.dist < 100 ? 0.45 : MIN_NAME_SIMILARITY;
    const simOk  = best.sim >= simThreshold;
    // Address match is a strong signal that overrides distance — our coordinates
    // can be wrong (off by km) but our address field is usually correct.
    const addrOk = addressesMatch(gym.address, best.place.formattedAddress);
    // Relax distance cap when name is near-identical OR address confirms location
    const maxDist = (best.sim >= 0.9 || addrOk) ? 10000 : MAX_DISTANCE_M;
    const distOk = best.dist <= maxDist;

    if (!simOk || !distOk) {
      const reason = !simOk && !distOk ? 'sim+dist'
        : !simOk ? `sim=${best.sim.toFixed(2)}<${simThreshold}`
        : `dist=${Math.round(best.dist)}m`;
      process.stdout.write(`${prefix} — LOW CONFIDENCE (${reason}) → best: "${best.placeName}"\n`);
      stats.lowConfidence++;
      log.push({
        id: gym.id, name: gym.name, city: gym.city,
        status: 'low_confidence', reason,
        bestMatch: best.placeName, sim: +best.sim.toFixed(3), dist: Math.round(best.dist),
        searchType,
      });
      done.add(gym.id);
      if ((i + 1) % SAVE_EVERY === 0) saveProgress(done, stats);
      continue;
    }

    // Matched
    const extracted = extractFields(best.place);
    const updates   = pickNullFields(gym, extracted);
    const fieldList = Object.keys(updates);

    process.stdout.write(
      `${prefix} — MATCH "${best.placeName}" ` +
      `(sim=${best.sim.toFixed(2)}, dist=${Math.round(best.dist)}m, via ${searchType}${addrOk ? ', addr✓' : ''})` +
      (fieldList.length ? ` +[${fieldList.join(',')}]` : ' no new fields') + '\n'
    );

    stats.matched++;
    stats.fieldsAdded += fieldList.length;
    log.push({
      id: gym.id, name: gym.name, city: gym.city,
      status: 'matched', matchedTo: best.placeName,
      sim: +best.sim.toFixed(3), dist: Math.round(best.dist),
      searchType, fieldsAdded: fieldList,
    });

    if (!DRY_RUN && fieldList.length > 0) {
      await updateGym(gym.id, updates);
    }

    done.add(gym.id);

    if ((i + 1) % SAVE_EVERY === 0) {
      saveProgress(done, stats);
      console.log(`  ── [SAVED] ${i + 1} processed ──`);
    }
  }

  // Final save
  saveProgress(done, stats);

  // Write full log
  const logPath = path.join(__dirname, 'enrich-places-log.json');
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Results (${DRY_RUN ? 'DRY RUN' : 'LIVE'})`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Matched:        ${stats.matched}`);
  console.log(`  Low confidence: ${stats.lowConfidence}`);
  console.log(`  No result:      ${stats.noResult}`);
  console.log(`  Failed:         ${stats.failed}`);
  console.log(`  Fields added:   ${stats.fieldsAdded}${DRY_RUN ? ' (not written)' : ''}`);
  console.log(`\n  Full log → scripts/enrich-places-log.json`);
  console.log(`${'═'.repeat(60)}\n`);

  await db.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
