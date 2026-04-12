/**
 * Google Places Discovery — find gyms not yet in the IRONmap DB
 *
 * Strategy:
 *   1. Grid-based Nearby Search over each city's bounding box (1km radius, ~1.5km step)
 *   2. Text Search sweeps for specific Czech gym terms per city
 *   3. Dedup: place_id first → fuzzy name+city → coordinate proximity (150m)
 *   4. Exclusion filters: name keywords, place types, quality floor
 *   5. Confidence scoring (0.0–1.0)
 *   6. Insert as staging=TRUE — hidden from site until promote-staged.mjs runs
 *   7. Write audit row to discovery_log
 *
 * Usage:
 *   node scripts/discover-places.mjs --dry-run              # no DB writes
 *   node scripts/discover-places.mjs --city Praha           # single city
 *   node scripts/discover-places.mjs --city Praha --dry-run
 *   node scripts/discover-places.mjs                        # all configured cities
 *
 * Rollback a batch:
 *   DELETE FROM gyms WHERE discovery_batch = '<batch_id>';
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.local') });

// ── CLI args ──────────────────────────────────────────────────────────────────

const DRY_RUN     = process.argv.includes('--dry-run');
const CITY_ARG    = process.argv.indexOf('--city');
const ONLY_CITY   = CITY_ARG !== -1 ? process.argv[CITY_ARG + 1] : null;
const PROGRESS_PATH = path.join(__dirname, 'discovery-progress.json');

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!PLACES_API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY in .env.local');
  process.exit(1);
}

// ── City configuration ────────────────────────────────────────────────────────
// Bounding boxes cover urban areas only (not full administrative boundaries).
// Grid step ~1.5km with 1km search radius → ~50% overlap, good coverage density.
// 1° lat ≈ 111km; 1° lng ≈ 71km at 50°N

const CITIES = [
  {
    name: 'Praha',
    latMin: 49.97, latMax: 50.18,
    lngMin: 14.24, lngMax: 14.67,
    // Praha districts all normalize to "Praha"
    addressAliases: [/^Praha\s*[-–]?\s*\d*/i, /^Hlavní město Praha/i, /Praha\s+\d+/i],
  },
  {
    name: 'Brno',
    latMin: 49.14, latMax: 49.27,
    lngMin: 16.52, lngMax: 16.73,
    addressAliases: [/^Brno[-–]/i],
  },
  {
    name: 'Ostrava',
    latMin: 49.78, latMax: 49.88,
    lngMin: 18.15, lngMax: 18.39,
    addressAliases: [/^Ostrava[-–]/i],
  },
  {
    name: 'Plzeň',
    latMin: 49.71, latMax: 49.79,
    lngMin: 13.33, lngMax: 13.46,
    addressAliases: [/^Plzeň[-–]/i],
  },
  {
    name: 'Olomouc',
    latMin: 49.56, latMax: 49.63,
    lngMin: 17.21, lngMax: 17.33,
    addressAliases: [/^Olomouc[-–]/i],
  },
];

const GRID_STEP_LAT   = 0.014; // ~1.55km
const GRID_STEP_LNG   = 0.021; // ~1.49km at 50°N
const NEARBY_RADIUS_M = 1000;
const MIN_REQUEST_GAP_MS = 120; // ~8 req/sec

// Text search queries supplement the grid — catch gyms tagged differently in Places
const TEXT_QUERIES = [
  'fitness centrum',
  'posilovna',
  'crossfit',
  'gym',
  'fitko',
];

// ── Exclusion rules ───────────────────────────────────────────────────────────

const EXCLUDE_NAME_KEYWORDS = [
  // Schools / academia
  'základní škola', 'střední škola', 'gymnázium', 'vut ', 'univerzita', 'fakulta',
  'akademie věd', 'základní umělecká',
  // Medical / physio
  'fyzioterapie', 'fyzio', 'rehabilitace', 'rehabilit', 'ordinace', 'poliklinika',
  'nemocnice', 'zdravotní', 'terapie', 'léčebna', 'sanatorium',
  // Spa / water leisure
  'lázně', 'lázn', 'termální', 'balneo', 'aquapark', 'bazén', 'koupaliště', 'plovárna',
  // Retail / equipment
  'e-shop', 'eshop', 'prodej', 'sport shop', 'intersport', 'decathlon', 'hervis',
  'velkoobchod', 'maloobchod',
  // Hospitality
  'hotel', 'resort', 'penzion', 'hostel', 'apartmán',
  // Beauty / tanning
  'solárium', 'solárn', 'tanning', 'kosmetik', 'nehtové',
  // Food & drink
  'restaur', 'kavárna', 'bar ', ' bar', 'pub ', ' pub', 'bistro', 'pizz', 'bufet',
  'bowling',
  // Shooting ranges (English + Czech already covered)
  'shooting range',
  // Cycling / wheeled sports
  'pumptrack', 'bmx ', ' bmx', 'cyklo',
  // Table tennis / ping pong
  'stolní tenis', 'ping pong', 'table tennis',
  // Canoe / water sports (supplement existing kanoistik)
  'kanoe', 'kajak', 'veslař',
  // Cultural / community centers
  'kulturní dům', 'kulturní centrum', 'dům kultury',
  // Dance studios (distinct from fitness)
  'centrum tance', 'taneční studio', 'taneční škola',
  // RC / model clubs
  'rc modell', 'model car', 'modell car',
  // Dog runs
  'výběh pro psy', 'psí výběh',
  // Beach / sand courts (not a gym)
  'beach bar', 'plážový bar',
  // Outdoor / non-gym sport
  'hřiště',        // football/playground fields (Czech)
  'football field', 'soccer field', 'fotbalové',  // English + Czech
  'skatepark', 'skateboard',
  'paintball',
  'střelnice', 'střelba', 'střelby',
  'loděnice', 'kanoistik', 'lodní',
  'dračí lodě', 'dračích lodí',
  'in-line', 'inline',
  'plážový', 'pláž',
  'golf',
  'házení sekery', 'házení sekerou', 'axe throw',
  'psí ', ' psí',  // dog training halls
  'koňsk', 'equin', 'jezdecký', 'jezdeck',  // equestrian
  // Stadiums / arenas (large spectator venues)
  'stadion', 'stadión', 'aréna', 'arena',
  // Entertainment / trampoline parks
  'laser game', 'lasergame', 'escape room', 'úniková',
  'trampolín', 'trampoline', 'jump family', 'jump arena', 'jump park',
  // Football / sports clubs (not gyms)
  ' fk ', 'fk ', ' fk,',  // fotbalový klub
  'fotbalový klub',
  // Tennis-specific venues (not mixed fitness venues)
  'tenisov',              // tenisový/tenisová/tenisové kurt(y)/hala/areál
  'tenisový kurt', 'tenisové kurty', ' kurty',
  'tenis areál', 'areal tenis', 'tenis a beach', 'tenis beach',
  'tennis club', 'tennis court', 'tennis center',
  'ttc ',                 // table tennis club
  'table tennis', 'stolni tenis', 'ping pong',
  'herna stolni',
  // Archery
  'archery', 'lukostřelb', 'lukostřelec', 'lukostřelb',
  // Kite / wind sports
  'kiting', 'kite surf', 'kite spot', 'kiteboard',
  // Festivals / events
  'festival', ' fest ',
  // Community halls / pubs (not gyms)
  'baráčnická', 'rychta', 'kulturní dům', 'dům kultury',
];

// Place types from Places API that indicate a non-gym business
const EXCLUDE_PLACE_TYPES = new Set([
  'lodging', 'hotel', 'motel', 'resort_hotel',
  'sporting_goods_store', 'store', 'shopping_mall',
  'hospital', 'doctor', 'physiotherapist', 'dentist',
  'school', 'university',
  'spa',
  'bar', 'restaurant', 'food', 'cafe', 'night_club',
  'bowling_alley', 'movie_theater', 'amusement_center',
  'golf_course', 'shooting_range',
  'park', 'playground', 'stadium',
]);

// When the primary type is sports_complex (broad), require a gym-related keyword in the name
// so we don't include football grounds, tennis clubs, etc.
const GYM_NAME_SIGNALS = [
  'fitness', 'gym', 'posilovna', 'fitko', 'crossfit', 'cross fit',
  'pilates', 'yoga', 'jóga', 'workout', 'strength', 'bodybuilding',
  'weight', 'muscle', 'iron', 'power', 'sport centrum', 'sportcentrum',
  'sportovní centrum', 'fit centrum', 'fitcentrum', 'wellness',
  'box', 'boxing', 'mma', 'judo', 'karate', 'bojov', 'martial',
  'spinning', 'zumba', 'aerobik', 'činka', 'činkárna', 'silovn',
];

const SPORTS_COMPLEX_ONLY_TYPES = new Set(['sports_complex', 'recreation_center', 'health']);

// ── Quality floor ─────────────────────────────────────────────────────────────
// A candidate must pass at least one of these to avoid inserting ghost listings

function passesQualityFloor(place) {
  const hasRating  = place.rating != null;
  const hasContact = place.internationalPhoneNumber || place.websiteUri;
  const hasReviews = (place.userRatingCount ?? 0) >= 3;
  return hasRating || hasContact || hasReviews;
}

// ── Confidence scoring ────────────────────────────────────────────────────────
// 0.4 × has_rating + 0.3 × review_depth + 0.2 × has_contact + 0.1 × has_hours

function computeConfidence(place) {
  const hasRating   = place.rating != null ? 0.4 : 0;
  const reviewDepth = place.userRatingCount
    ? Math.min(place.userRatingCount / 10, 1) * 0.3
    : 0;
  const hasContact  = (place.internationalPhoneNumber || place.websiteUri) ? 0.2 : 0;
  const hasHours    = place.regularOpeningHours ? 0.1 : 0;
  return Math.round((hasRating + reviewDepth + hasContact + hasHours) * 100) / 100;
}

// ── Normalization helpers ─────────────────────────────────────────────────────

const LEGAL_SUFFIXES = /\b(s\.?\s*r\.?\s*o\.?|a\.?\s*s\.?|z\.?\s*s\.?|spol|ltd|gmbh|inc)\b/gi;

function normalizeName(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(LEGAL_SUFFIXES, '')
    .replace(/[^a-z0-9\s]/g, '')
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
  const na = normalizeName(a), nb = normalizeName(b);
  if (!na || !nb) return 0; // empty after normalization → no match
  if (na === nb) return 1;
  // includes shortcut: only when the shorter string is meaningful (≥ 9 chars)
  // prevents "fitness" (7) matching "world fitness club Praha"
  const shorter = na.length <= nb.length ? na : nb;
  const longer  = na.length <= nb.length ? nb : na;
  if (shorter.length >= 9 && longer.includes(shorter)) return 0.85;
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length, 1);
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

// Parse coordinates from DB JSON string
function parseCoords(raw) {
  if (!raw) return null;
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const lat = parseFloat(p.lat);
    const lng = parseFloat(p.lng ?? p.lon);
    return isNaN(lat) || isNaN(lng) ? null : { lat, lng };
  } catch { return null; }
}

// Map a Places formattedAddress to canonical city name.
// Uses word-boundary match so "Olomoucký kraj" does not match "Olomouc".
function resolveCity(address, cityConfig) {
  if (!address) return null;
  for (const alias of cityConfig.addressAliases) {
    if (alias.test(address)) return cityConfig.name;
  }
  // Word-boundary check: "Praha" must appear as a standalone token, not inside
  // region names like "Středočeský kraj" or adjectives like "Olomoucký".
  const wordBoundary = new RegExp(`(?<![a-zA-ZÀ-žÀ-ž])${cityConfig.name}(?![a-zA-ZÀ-žÀ-ž])`, 'i');
  return wordBoundary.test(address) ? cityConfig.name : null;
}

// ── Slug generation ───────────────────────────────────────────────────────────

function toSlug(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Places API ────────────────────────────────────────────────────────────────

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.types',
  'places.location',
  'places.formattedAddress',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.regularOpeningHours',
  'places.priceLevel',
  'places.rating',
  'places.userRatingCount',
].join(',');

const PRICE_LEVEL_MAP = {
  PRICE_LEVEL_FREE: 'Zdarma',
  PRICE_LEVEL_INEXPENSIVE: 'Levné',
  PRICE_LEVEL_MODERATE: 'Střední',
  PRICE_LEVEL_EXPENSIVE: 'Drahé',
  PRICE_LEVEL_VERY_EXPENSIVE: 'Velmi drahé',
};

let lastRequestAt = 0;
async function rateLimitedFetch(fn) {
  const wait = MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestAt = Date.now();
  return fn();
}

async function nearbySearch(lat, lng) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: ['gym', 'fitness_center', 'sports_complex', 'yoga_studio'],
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: NEARBY_RADIUS_M },
      },
      maxResultCount: 20,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Nearby HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()).places ?? [];
}

async function textSearch(query, city) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${query} ${city} Czech Republic`,
      languageCode: 'cs',
      maxResultCount: 20,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Text Search HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()).places ?? [];
}

// ── Grid generation ───────────────────────────────────────────────────────────

function generateGrid(cityConfig) {
  const points = [];
  for (let lat = cityConfig.latMin; lat <= cityConfig.latMax; lat += GRID_STEP_LAT) {
    for (let lng = cityConfig.lngMin; lng <= cityConfig.lngMax; lng += GRID_STEP_LNG) {
      points.push({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
    }
  }
  return points;
}

// ── Progress tracking ─────────────────────────────────────────────────────────

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8')); }
  catch { return { doneCities: [], seenPlaceIds: [] }; }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function loadExistingGyms(db) {
  const { rows } = await db.query(`
    SELECT id, name, city, coordinates, place_id, discovery_source
    FROM gyms WHERE name != 'Unnamed Gym'
  `);
  return rows;
}

async function updatePlaceId(db, gymId, placeId) {
  await db.query(`UPDATE gyms SET place_id = $1 WHERE id = $2`, [placeId, gymId]);
}

async function insertGym(db, gym) {
  const { rows } = await db.query(`
    INSERT INTO gyms (
      name, slug, city, address, coordinates, phone, website,
      opening_hours, price_level, rating, rating_count, place_id,
      discovery_source, discovery_batch, confidence, staging, verified
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING id
  `, [
    gym.name, gym.slug, gym.city, gym.address, gym.coordinates,
    gym.phone, gym.website, gym.opening_hours, gym.price_level,
    gym.rating, gym.rating_count, gym.place_id,
    'places_discovery', gym.discovery_batch, gym.confidence,
    true, // staging = TRUE
    0,    // verified = 0
  ]);
  return rows[0].id;
}

async function logDiscovery(db, entry) {
  await db.query(`
    INSERT INTO discovery_log
      (batch_id, city, searches, candidates, duplicates, inserted, promoted, api_cost_usd)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [
    entry.batchId, entry.city, entry.searches, entry.candidates,
    entry.duplicates, entry.inserted, 0,
    Math.round(entry.searches * 0.032 * 100) / 100,
  ]);
}

// ── Dedup engine ──────────────────────────────────────────────────────────────

function isDuplicate(place, existingGyms, targetCity) {
  const placeName = place.displayName?.text ?? '';
  const placeLat  = place.location?.latitude;
  const placeLng  = place.location?.longitude;

  for (const gym of existingGyms) {
    // 1. place_id match — strongest signal
    if (gym.place_id && gym.place_id === place.id) {
      return { dup: true, reason: 'place_id', gymId: gym.id };
    }

    // Only compare same city
    if (gym.city !== targetCity) continue;

    const sim = nameSimilarity(placeName, gym.name);

    // 2. Near-identical name in same city
    if (sim >= 0.85) {
      return { dup: true, reason: `name_sim=${sim.toFixed(2)}`, gymId: gym.id, sim };
    }

    // 3. Ambiguous name but very close coordinates (< 150m) → same place
    if (sim >= 0.65 && placeLat != null && placeLng != null) {
      const coords = parseCoords(gym.coordinates);
      if (coords) {
        const dist = haversineMeters(placeLat, placeLng, coords.lat, coords.lng);
        if (dist < 150) {
          return { dup: true, reason: `name_sim=${sim.toFixed(2)},dist=${Math.round(dist)}m`, gymId: gym.id, sim };
        }
      }
    }
  }
  return { dup: false };
}

// ── Exclusion filter ──────────────────────────────────────────────────────────

function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isExcluded(place) {
  // Normalize name for keyword matching: lowercase + strip diacritics
  // so "stolní tenis" keyword catches "Stolni Tenis" and vice versa
  const rawName  = (place.displayName?.text ?? '').toLowerCase();
  const name     = stripDiacritics(rawName);
  const types    = place.types ?? [];

  // Type-based exclusions (fast path)
  const badType = types.find(t => EXCLUDE_PLACE_TYPES.has(t));
  if (badType) return `place type: ${badType}`;

  // Name-based exclusions (keywords also stripped of diacritics for matching)
  const badKw = EXCLUDE_NAME_KEYWORDS.find(kw => name.includes(stripDiacritics(kw)));
  if (badKw) return `name contains "${badKw}"`;

  // sports_complex / recreation_center / health are broad types.
  // Only accept them if the name contains a recognisable gym signal.
  const primaryTypes = types.filter(t => SPORTS_COMPLEX_ONLY_TYPES.has(t));
  const hasStrongType = types.some(t => t === 'gym' || t === 'fitness_center' || t === 'yoga_studio');
  if (primaryTypes.length > 0 && !hasStrongType) {
    const hasGymSignal = GYM_NAME_SIGNALS.some(s => name.includes(stripDiacritics(s)));
    if (!hasGymSignal) return `sports_complex type without gym name signal`;
  }

  // "Tenis X" prefix guard: names starting with "Tenis" are tennis clubs
  // unless they also have a gym signal (e.g., "Tenis & Fitness Centrum")
  if (/^tenis\s+/i.test(rawName)) {
    const hasGymSignal = GYM_NAME_SIGNALS.some(s => name.includes(stripDiacritics(s)));
    if (!hasGymSignal) return `tenis prefix without gym signal`;
  }

  // Sports-club prefix guard: SK/TJ/HC/FC prefixes are Czech sports clubs
  // (football, ice hockey, athletics). Google sometimes mis-tags them as 'gym'.
  // Only accept them if the name contains a recognisable gym/fitness signal.
  const CLUB_PREFIX = /^(sk|hc|fc|ac|mk|orel)\s+/i;
  if (CLUB_PREFIX.test(rawName)) {
    const hasGymSignal = GYM_NAME_SIGNALS.some(s => name.includes(stripDiacritics(s)));
    if (!hasGymSignal) return `sports club prefix (${rawName.split(' ')[0].toUpperCase()}) without gym signal`;
  }

  return null;
}

// ── Candidate builder ─────────────────────────────────────────────────────────

function buildGymRecord(place, targetCity, batchId, usedSlugs) {
  const name    = place.displayName?.text ?? '';
  const lat     = place.location?.latitude ?? null;
  const lng     = place.location?.longitude ?? null;
  const coords  = lat && lng ? JSON.stringify({ lat, lng }) : null;

  const opening_hours = place.regularOpeningHours?.weekdayDescriptions
    ? JSON.stringify(place.regularOpeningHours.weekdayDescriptions)
    : null;

  const baseSlug = toSlug(`${name} ${targetCity}`);
  let slug = baseSlug, n = 2;
  while (usedSlugs.has(slug)) slug = `${baseSlug}-${n++}`;
  usedSlugs.add(slug);

  return {
    name,
    slug,
    city: targetCity,
    address:      place.formattedAddress ?? null,
    coordinates:  coords,
    phone:        place.internationalPhoneNumber ?? null,
    website:      place.websiteUri ? place.websiteUri.replace(/\/$/, '') : null,
    opening_hours,
    price_level:  place.priceLevel ? (PRICE_LEVEL_MAP[place.priceLevel] ?? null) : null,
    rating:       place.rating ?? null,
    rating_count: place.userRatingCount ?? null,
    place_id:     place.id ?? null,
    confidence:   computeConfidence(place),
    discovery_batch: batchId,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function processCity(db, cityConfig, existingGyms, usedSlugs, progress, batchId) {
  const { name: city } = cityConfig;
  const grid = generateGrid(cityConfig);

  const totalSearches = grid.length + TEXT_QUERIES.length;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${city} — ${grid.length} grid points + ${TEXT_QUERIES.length} text searches = ${totalSearches} API calls (~$${(totalSearches * 0.032).toFixed(2)})`);
  console.log(`${'─'.repeat(60)}`);

  // Collect all place_ids seen this city run to deduplicate across grid cells
  const seenThisRun = new Set(progress.seenPlaceIds);

  const stats = { searches: 0, candidates: 0, duplicates: 0, inserted: 0 };
  const insertedGyms = [];

  // ── Grid-based Nearby Search ──────────────────────────────────────────────
  for (let i = 0; i < grid.length; i++) {
    const { lat, lng } = grid[i];
    process.stdout.write(`\r  Grid [${i + 1}/${grid.length}] (${lat.toFixed(3)}, ${lng.toFixed(3)})   `);

    let places = [];
    try {
      places = await rateLimitedFetch(() => nearbySearch(lat, lng));
      stats.searches++;
    } catch (err) {
      process.stdout.write(`\n  [WARN] Grid point failed: ${err.message}\n`);
      continue;
    }

    for (const place of places) {
      if (!place.id || seenThisRun.has(place.id)) continue;
      seenThisRun.add(place.id);
      await evaluateCandidate(place, city, cityConfig, existingGyms, usedSlugs, batchId, stats, insertedGyms, db);
    }
  }

  // ── Text Search sweeps ────────────────────────────────────────────────────
  console.log(`\n  Text searches...`);
  for (const query of TEXT_QUERIES) {
    let places = [];
    try {
      places = await rateLimitedFetch(() => textSearch(query, city));
      stats.searches++;
    } catch (err) {
      console.log(`  [WARN] Text search "${query}" failed: ${err.message}`);
      continue;
    }

    for (const place of places) {
      if (!place.id || seenThisRun.has(place.id)) continue;
      seenThisRun.add(place.id);
      await evaluateCandidate(place, city, cityConfig, existingGyms, usedSlugs, batchId, stats, insertedGyms, db);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n  ── ${city} results ──────────────────────────────────────`);
  console.log(`     Searches:   ${stats.searches}`);
  console.log(`     Candidates: ${stats.candidates} (passed type + quality filters)`);
  console.log(`     Duplicates: ${stats.duplicates} (matched existing)`);
  console.log(`     Inserted:   ${stats.inserted} new gyms${DRY_RUN ? ' (dry run)' : ' → staging'}`);

  if (insertedGyms.length > 0) {
    console.log(`\n  New gyms found:`);
    insertedGyms.forEach(g => {
      console.log(`    + ${g.name} | conf=${g.confidence} | rating=${g.rating ?? '—'} (${g.rating_count ?? 0} reviews)`);
    });
  }

  // ── Log to DB ─────────────────────────────────────────────────────────────
  if (!DRY_RUN) {
    await logDiscovery(db, {
      batchId, city,
      searches:   stats.searches,
      candidates: stats.candidates,
      duplicates: stats.duplicates,
      inserted:   stats.inserted,
    });
    progress.doneCities.push(city);
    progress.seenPlaceIds = [...seenThisRun];
    saveProgress(progress);
  }

  return stats;
}

async function evaluateCandidate(
  place, city, cityConfig, existingGyms, usedSlugs, batchId, stats, insertedGyms, db
) {
  // Must resolve to the target city from its address
  const resolvedCity = resolveCity(place.formattedAddress ?? '', cityConfig);
  if (!resolvedCity) return;

  // Exclusion filter
  const exclusionReason = isExcluded(place);
  if (exclusionReason) return;

  // Quality floor
  if (!passesQualityFloor(place)) return;

  stats.candidates++;

  // Deduplication
  const dedup = isDuplicate(place, existingGyms, city);
  if (dedup.dup) {
    stats.duplicates++;
    // Opportunistically back-fill place_id on existing record if it's missing
    if (dedup.gymId && dedup.sim !== 1 && !DRY_RUN) {
      const existing = existingGyms.find(g => g.id === dedup.gymId);
      if (existing && !existing.place_id) {
        await updatePlaceId(db, dedup.gymId, place.id);
        existing.place_id = place.id; // update in-memory
      }
    }
    return;
  }

  // Build record + insert
  const gym = buildGymRecord(place, city, batchId, usedSlugs);
  insertedGyms.push(gym);
  stats.inserted++;

  // Add to in-memory list so subsequent grid cells don't re-insert
  existingGyms.push({
    id: null,
    name: gym.name,
    city: gym.city,
    coordinates: gym.coordinates,
    place_id: gym.place_id,
    discovery_source: 'places_discovery',
  });

  if (!DRY_RUN) {
    gym.id = await insertGym(db, gym);
  }
}

async function main() {
  const db  = new pg.Pool({ connectionString: process.env.POSTGRES_URL });
  const now = new Date();
  const batchId = `${now.toISOString().slice(0, 10)}-discovery`;

  const citiesToRun = ONLY_CITY
    ? CITIES.filter(c => c.name.toLowerCase() === ONLY_CITY.toLowerCase())
    : CITIES;

  if (citiesToRun.length === 0) {
    console.error(`Unknown city: "${ONLY_CITY}". Valid options: ${CITIES.map(c => c.name).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  IRONmap — Google Places Discovery`);
  console.log(`  Batch:  ${batchId}`);
  console.log(`  Mode:   ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'LIVE'}`);
  console.log(`  Cities: ${citiesToRun.map(c => c.name).join(', ')}`);
  const totalEstSearches = citiesToRun.reduce(
    (sum, c) => sum + generateGrid(c).length + TEXT_QUERIES.length, 0
  );
  console.log(`  Est. API calls: ~${totalEstSearches} (~$${(totalEstSearches * 0.032).toFixed(2)})`);
  console.log(`${'═'.repeat(60)}`);

  // Load existing gyms once
  console.log('\nLoading existing gyms from DB...');
  const existingGyms = await loadExistingGyms(db);
  console.log(`  ${existingGyms.length} gyms loaded.`);

  // Load slug set once
  const { rows: slugRows } = await db.query(`SELECT slug FROM gyms`);
  const usedSlugs = new Set(slugRows.map(r => r.slug));

  const progress = DRY_RUN ? { doneCities: [], seenPlaceIds: [] } : loadProgress();

  const globalStats = { searches: 0, candidates: 0, duplicates: 0, inserted: 0 };

  for (const cityConfig of citiesToRun) {
    if (!DRY_RUN && progress.doneCities.includes(cityConfig.name)) {
      console.log(`\nSKIP ${cityConfig.name} (already done in progress file)`);
      continue;
    }
    const stats = await processCity(db, cityConfig, existingGyms, usedSlugs, progress, batchId);
    globalStats.searches   += stats.searches;
    globalStats.candidates += stats.candidates;
    globalStats.duplicates += stats.duplicates;
    globalStats.inserted   += stats.inserted;
  }

  // ── Final summary ─────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Final Summary (${DRY_RUN ? 'DRY RUN' : 'LIVE'})`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Total API searches: ${globalStats.searches}`);
  console.log(`  Estimated cost:     $${(globalStats.searches * 0.032).toFixed(2)}`);
  console.log(`  Candidates:         ${globalStats.candidates}`);
  console.log(`  Duplicates skipped: ${globalStats.duplicates}`);
  console.log(`  New gyms inserted:  ${globalStats.inserted}${DRY_RUN ? ' (not written)' : ' → staging'}`);
  if (!DRY_RUN && globalStats.inserted > 0) {
    console.log(`\n  Rollback:  DELETE FROM gyms WHERE discovery_batch = '${batchId}';`);
    console.log(`  Promote:   node scripts/promote-staged.mjs`);
  }
  console.log(`${'═'.repeat(60)}\n`);

  await db.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
