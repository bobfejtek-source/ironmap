/**
 * Google Places API (New) — Detail enrichment for existing gyms.
 *
 * Fills: description, photos, phone, website, opening_hours, rating,
 *        rating_count, place_id (from Text Search), enriched_at, amenity hints.
 *
 * Usage:
 *   node --env-file=.env.local scripts/enrich-google-places.mjs --dry-run
 *   node --env-file=.env.local scripts/enrich-google-places.mjs --dry-run --limit 10
 *   node --env-file=.env.local scripts/enrich-google-places.mjs              # full run
 *   node --env-file=.env.local scripts/enrich-google-places.mjs --limit 200  # partial
 *
 * Budget model (Places API New):
 *   Place Details Advanced (with editorialSummary/reviews): $0.040/req
 *   Text Search Basic (to find place_id):                   $0.032/req
 *   Estimated for 841 gyms (description IS NULL):           ~$37
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.local') });

// ── CLI args ──────────────────────────────────────────────────────────────────

const DRY_RUN   = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.indexOf('--limit');
const LIMIT     = LIMIT_ARG !== -1
  ? parseInt(process.argv[LIMIT_ARG + 1], 10)
  : (DRY_RUN ? 5 : Infinity);

const PROGRESS_PATH = path.join(__dirname, 'enrich-google-places-progress.json');

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY          = process.env.GOOGLE_PLACES_API_KEY;
const MIN_GAP_MS       = 110;   // ~9 req/s, safely under 10/s limit
const BATCH_SIZE       = 50;
const BUDGET_USD       = 50.00;
const COST_DETAILS     = 0.040; // Advanced tier (includes editorialSummary, reviews)
const COST_TEXT_SEARCH = 0.032; // Basic tier

if (!API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY in .env.local');
  process.exit(1);
}

// ── DB ────────────────────────────────────────────────────────────────────────

// Always use non-pooling for DDL; also fine for sequential enrichment reads/writes
const db = new pg.Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

async function ensureColumns() {
  await db.query(`
    ALTER TABLE gyms
      ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS photos      TEXT
  `);
}

async function getGymsToEnrich(limit) {
  const limitClause = isFinite(limit) ? `LIMIT ${limit}` : '';
  // Priority: place_id first (cheaper), then no place_id
  const { rows } = await db.query(`
    SELECT id, name, city, address, phone, website, opening_hours,
           description, rating, rating_count, place_id
    FROM gyms
    WHERE staging = false
      AND name != 'Unnamed Gym'
      AND (description IS NULL OR enriched_at IS NULL)
    ORDER BY
      CASE WHEN place_id IS NOT NULL THEN 0 ELSE 1 END,
      id
    ${limitClause}
  `);
  return rows;
}

// Only-null-fills update — never overwrites existing data
async function updateGym(id, fields) {
  const entries = Object.entries(fields).filter(([, v]) => v != null);
  if (entries.length === 0) return;
  const setClauses = entries.map(([k], i) => `${k} = COALESCE(${k}, $${i + 2})`).join(', ');
  const values = [id, ...entries.map(([, v]) => v)];
  await db.query(`UPDATE gyms SET ${setClauses} WHERE id = $1`, values);
}

async function setEnrichedAt(id) {
  await db.query(`UPDATE gyms SET enriched_at = NOW() WHERE id = $1`, [id]);
}

// ── Progress ──────────────────────────────────────────────────────────────────

function loadDone() {
  try {
    const data = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    return new Set(data.done ?? []);
  } catch { return new Set(); }
}

function saveProgress(done, stats) {
  if (!DRY_RUN) {
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify({ done: [...done], stats, updatedAt: new Date().toISOString() }, null, 2));
  }
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

let lastRequest = 0;

async function throttle() {
  const now = Date.now();
  const wait = MIN_GAP_MS - (now - lastRequest);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();
}

// ── Places API helpers ────────────────────────────────────────────────────────

// Advanced fields — costs $0.040/request
const DETAIL_FIELDS = [
  'editorialSummary',
  'nationalPhoneNumber',
  'websiteUri',
  'regularOpeningHours',
  'rating',
  'userRatingCount',
  'photos',
  'reviews',
  'types',
].join(',');

async function placeDetails(placeId) {
  await throttle();
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': DETAIL_FIELDS,
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Place Details HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

// Text Search — costs $0.032/request (Basic fields only to find place_id)
const SEARCH_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
].join(',');

async function textSearch(name, city) {
  await throttle();
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': SEARCH_FIELDS,
    },
    body: JSON.stringify({
      textQuery: `${name} ${city} Česká republika`,
      languageCode: 'cs',
      regionCode: 'CZ',
      maxResultCount: 3,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Text Search HTTP ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.places ?? [];
}

// ── Data extraction ───────────────────────────────────────────────────────────

function extractDescription(detail) {
  // 1. Editorial summary (best — curated by Google)
  if (detail.editorialSummary?.text) return detail.editorialSummary.text;

  // 2. Best Czech review (fallback)
  const reviews = detail.reviews ?? [];
  const czReview = reviews.find(r =>
    r.text?.languageCode === 'cs' && (r.text.text?.length ?? 0) > 60
  );
  if (czReview) return czReview.text.text.slice(0, 500);

  // 3. Any review (last resort)
  const anyReview = reviews.find(r => (r.text?.text?.length ?? 0) > 60);
  if (anyReview) return anyReview.text.text.slice(0, 500);

  return null;
}

function extractPhotos(detail) {
  // Store the first 5 photo resource names as a JSON array
  // Photo URLs: https://places.googleapis.com/v1/{name}/media?maxWidthPx=800&key={KEY}
  const photos = (detail.photos ?? []).slice(0, 5).map(p => p.name);
  return photos.length ? JSON.stringify(photos) : null;
}

function extractOpeningHours(detail) {
  const descriptions = detail.regularOpeningHours?.weekdayDescriptions;
  if (!descriptions?.length) return null;
  return descriptions.join('\n');
}

function extractAmenityHints(detail, gym) {
  const hints = {};
  const types = detail.types ?? [];

  // Type-based: gym/health/fitness
  if (types.some(t => ['gym', 'fitness_center', 'health'].includes(t))) {
    hints.has_weights = gym.has_weights ?? true; // only set if currently null
  }

  // Review-based keyword scanning
  const allReviewText = (detail.reviews ?? [])
    .map(r => (r.text?.text ?? '').toLowerCase())
    .join(' ');
  const reviewWords = allReviewText + ' ' + (detail.editorialSummary?.text ?? '').toLowerCase();

  if (/\bsauna\b/.test(reviewWords))                             hints.has_sauna   = true;
  if (/parking|parkovani|parkoviště/.test(reviewWords))          hints.has_parking = true;
  if (/baz[eé]n|pool|plavecký/.test(reviewWords))               hints.has_pool    = true;
  if (/sprch|shower/.test(reviewWords))                          hints.has_showers = true;
  if (/\bšatna|locker/.test(reviewWords))                       hints.has_lockers = true;
  if (/skupinov|lekce|class|group\s+fitness/.test(reviewWords)) hints.has_classes = true;
  if (/24\s*(hodin|hours?|hod)|nonstop|non-stop/.test(reviewWords)) hints.is_24_7 = true;

  return hints;
}

// ── Core processing ───────────────────────────────────────────────────────────

async function processGym(gym, stats, done, dryRunResults) {
  if (done.has(gym.id)) {
    stats.skipped++;
    return;
  }

  let placeId  = gym.place_id;
  let detail   = null;

  try {
    // ── Step 1: Find place_id if missing ──────────────────────────────────────
    if (!placeId) {
      stats.textSearches++;
      stats.estimatedCost += COST_TEXT_SEARCH;

      const results = await textSearch(gym.name, gym.city);
      if (results.length === 0) {
        stats.notFound++;
        if (!DRY_RUN) { done.add(gym.id); await setEnrichedAt(gym.id); }
        return;
      }

      // Accept first result (name + city in query is usually precise enough)
      placeId = results[0].id;
      stats.placeIdFound++;
    }

    // ── Step 2: Fetch Place Details ───────────────────────────────────────────
    stats.detailCalls++;
    stats.estimatedCost += COST_DETAILS;

    if (stats.estimatedCost > BUDGET_USD) {
      console.warn(`\n  ⚠  Budget limit $${BUDGET_USD} reached — stopping.`);
      process.exit(0);
    }

    detail = await placeDetails(placeId);

    // ── Step 3: Extract fields ────────────────────────────────────────────────
    const description  = extractDescription(detail);
    const photos       = extractPhotos(detail);
    const openingHours = extractOpeningHours(detail);
    const amenities    = extractAmenityHints(detail, gym);

    const updates = {
      place_id:      placeId                    || null,
      description:   gym.description ? null : description,  // don't overwrite
      photos:        photos,
      phone:         gym.phone        ? null : (detail.nationalPhoneNumber ?? null),
      website:       gym.website      ? null : (detail.websiteUri          ?? null),
      opening_hours: gym.opening_hours? null : openingHours,
      ...amenities,
    };

    // Rating: always update if Google's count is higher
    if (detail.rating && detail.userRatingCount) {
      if (!gym.rating_count || detail.userRatingCount > gym.rating_count) {
        updates.rating       = detail.rating;
        updates.rating_count = detail.userRatingCount;
      }
    }

    // Remove null-valued keys (COALESCE handles it, but keeps logs clean)
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v != null)
    );

    if (DRY_RUN) {
      dryRunResults.push({ gym, placeId, description, photos, openingHours, cleanUpdates, amenities });
    } else {
      if (Object.keys(cleanUpdates).length > 0) await updateGym(gym.id, cleanUpdates);
      await setEnrichedAt(gym.id);
      done.add(gym.id);
    }

    stats.enriched++;

  } catch (err) {
    console.error(`  ✗  #${gym.id} ${gym.name}: ${err.message}`);
    stats.errors++;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await db.connect();

  if (!DRY_RUN) {
    await ensureColumns();
    console.log('Columns ensured (enriched_at, photos)');
  } else {
    // In dry run, try to add columns anyway so the script can run against real schema;
    // if they already exist, ADD COLUMN IF NOT EXISTS is a no-op
    try { await ensureColumns(); } catch { /* ignore in dry run */ }
  }

  const gyms = await getGymsToEnrich(LIMIT);
  console.log(`\nGyms to process: ${gyms.length}${DRY_RUN ? ' [DRY RUN]' : ''}`);

  if (gyms.length === 0) {
    console.log('Nothing to do — all gyms already enriched.');
    await db.end();
    return;
  }

  const done    = DRY_RUN ? new Set() : loadDone();
  const stats   = {
    enriched: 0, skipped: 0, notFound: 0, errors: 0,
    textSearches: 0, detailCalls: 0, placeIdFound: 0,
    estimatedCost: 0,
  };
  const dryRunResults = [];

  for (let i = 0; i < gyms.length; i++) {
    const gym = gyms[i];
    process.stdout.write(`\r  [${i + 1}/${gyms.length}] ${gym.name.slice(0, 40).padEnd(40)} `);
    await processGym(gym, stats, done, dryRunResults);

    // Save progress every batch
    if (!DRY_RUN && (i + 1) % BATCH_SIZE === 0) {
      saveProgress(done, stats);
      console.log(`\n  [batch] saved progress at gym ${i + 1}`);
    }
  }

  if (!DRY_RUN) saveProgress(done, stats);
  console.log('\n');

  // ── DRY RUN OUTPUT ─────────────────────────────────────────────────────────
  if (DRY_RUN) {
    console.log('══════════════════════════════════════════════════════════════');
    console.log('DRY RUN RESULTS');
    console.log('══════════════════════════════════════════════════════════════\n');

    for (const r of dryRunResults) {
      console.log(`─── #${r.gym.id} ${r.gym.name} (${r.gym.city}) ───`);
      console.log(`  place_id    : ${r.placeId}`);
      console.log(`  description : ${r.description ? `"${r.description.slice(0, 120)}..."` : '(none)'}`);
      console.log(`  photos      : ${r.photos ? `${JSON.parse(r.photos).length} photo(s)` : '(none)'}`);
      console.log(`  hours       : ${r.openingHours ? r.openingHours.split('\n')[0] + ' ...' : '(none)'}`);
      console.log(`  amenities   : ${JSON.stringify(r.amenities)}`);
      const fieldList = Object.keys(r.cleanUpdates).join(', ');
      console.log(`  would update: ${fieldList || '(nothing new)'}`);
      console.log();
    }
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Processed     : ${gyms.length}`);
  console.log(`  Enriched      : ${stats.enriched}`);
  console.log(`  Skipped       : ${stats.skipped}`);
  console.log(`  Not found     : ${stats.notFound}`);
  console.log(`  Errors        : ${stats.errors}`);
  console.log(`  Text searches : ${stats.textSearches} × $${COST_TEXT_SEARCH} = $${(stats.textSearches * COST_TEXT_SEARCH).toFixed(3)}`);
  console.log(`  Detail calls  : ${stats.detailCalls} × $${COST_DETAILS} = $${(stats.detailCalls * COST_DETAILS).toFixed(3)}`);
  console.log(`  Total cost    : $${stats.estimatedCost.toFixed(3)}`);
  console.log('══════════════════════════════════════════════════════════════');

  if (DRY_RUN) {
    const totalGyms = 841; // gyms with description IS NULL
    const estimatedWithPlaceId = 701;
    const estimatedNoPlaceId   = 140;
    const projectedCost =
      estimatedWithPlaceId * COST_DETAILS +
      estimatedNoPlaceId * (COST_TEXT_SEARCH + COST_DETAILS);
    console.log('\nFULL RUN PROJECTION (841 gyms with description IS NULL):');
    console.log(`  ${estimatedWithPlaceId} with place_id   → ${estimatedWithPlaceId} × $${COST_DETAILS} = $${(estimatedWithPlaceId * COST_DETAILS).toFixed(2)}`);
    console.log(`  ${estimatedNoPlaceId} without place_id → ${estimatedNoPlaceId} × ($${COST_TEXT_SEARCH} + $${COST_DETAILS}) = $${(estimatedNoPlaceId * (COST_TEXT_SEARCH + COST_DETAILS)).toFixed(2)}`);
    console.log(`  TOTAL PROJECTED COST: ~$${projectedCost.toFixed(2)} (budget: $${BUDGET_USD})`);
    console.log('\nTo run full enrichment:');
    console.log('  node --env-file=.env.local scripts/enrich-google-places.mjs');
  }

  await db.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
