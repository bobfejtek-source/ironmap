/**
 * Manually insert specific gyms via Google Places text search.
 * Skips if a gym with the same name + city already exists.
 *
 * Usage:
 *   node scripts/insert-manual-gyms.mjs [--dry-run]
 */

import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!PLACES_API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY in .env.local');
  process.exit(1);
}

const GYMS_TO_INSERT = [
  { name: 'Form Factory Černý Most', city: 'Praha' },
  { name: 'AURA fit Černý Most',     city: 'Praha' },
  { name: 'Clever Fit Černý Most',   city: 'Praha' },
  { name: 'Delta Fitness Černý Most', city: 'Praha' },
];

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

const PRICE_LEVEL_MAP = {
  PRICE_LEVEL_FREE: 'Zdarma',
  PRICE_LEVEL_INEXPENSIVE: 'Levné',
  PRICE_LEVEL_MODERATE: 'Střední',
  PRICE_LEVEL_EXPENSIVE: 'Drahé',
  PRICE_LEVEL_VERY_EXPENSIVE: 'Velmi drahé',
};

function normalize(s) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function nameSimilarity(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  // simple token overlap
  const tokA = new Set(na.split(' '));
  const tokB = nb.split(' ');
  const hits = tokB.filter(t => tokA.has(t)).length;
  return hits / Math.max(tokA.size, tokB.length);
}

function bestMatch(results, queryName) {
  if (results.length === 0) return null;
  return results
    .map(p => ({ p, sim: nameSimilarity(queryName, p.displayName?.text ?? '') }))
    .sort((a, b) => b.sim - a.sim)[0].p;
}

function toSlug(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function textSearch(query) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify({
      textQuery: `${query} Czech Republic`,
      languageCode: 'cs',
      maxResultCount: 3,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Places API HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.places ?? [];
}

async function main() {
  const db = new pg.Pool({ connectionString: process.env.POSTGRES_URL });

  // Fetch existing slugs + names for dedup
  const { rows: existing } = await db.query('SELECT slug, name, city FROM gyms');
  const existingByNameCity = new Set(existing.map(r => `${r.name.toLowerCase()}|${r.city.toLowerCase()}`));
  const usedSlugs = new Set(existing.map(r => r.slug));

  function uniqueSlug(base) {
    let slug = base, n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);
    return slug;
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Insert Manual Gyms — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`${'═'.repeat(60)}\n`);

  for (const { name, city } of GYMS_TO_INSERT) {
    const key = `${name.toLowerCase()}|${city.toLowerCase()}`;
    if (existingByNameCity.has(key)) {
      console.log(`SKIP  "${name}" — already in DB`);
      continue;
    }

    console.log(`Searching: "${name} ${city}"...`);

    let place;
    try {
      const results = await textSearch(`${name} ${city}`);
      place = bestMatch(results, name);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      continue;
    }

    if (!place) {
      console.log(`  NOT FOUND in Google Places`);
      continue;
    }

    const placeName  = place.displayName?.text ?? name;
    const lat        = place.location?.latitude ?? null;
    const lng        = place.location?.longitude ?? null;
    const coords     = lat && lng ? JSON.stringify({ lat, lng }) : null;
    const address    = place.formattedAddress ?? null;
    const phone      = place.internationalPhoneNumber ?? null;
    const website    = place.websiteUri ? place.websiteUri.replace(/\/$/, '') : null;
    const opening_hours = place.regularOpeningHours?.weekdayDescriptions
      ? JSON.stringify(place.regularOpeningHours.weekdayDescriptions)
      : null;
    const price_level = place.priceLevel ? (PRICE_LEVEL_MAP[place.priceLevel] ?? place.priceLevel) : null;
    const rating      = place.rating ?? null;
    const rating_count = place.userRatingCount ?? null;
    const place_id    = place.id ?? null;
    const slug        = uniqueSlug(toSlug(name));

    console.log(`  FOUND: "${placeName}"`);
    console.log(`    address:  ${address}`);
    console.log(`    coords:   ${lat}, ${lng}`);
    console.log(`    rating:   ${rating} (${rating_count} reviews)`);
    console.log(`    phone:    ${phone}`);
    console.log(`    website:  ${website}`);
    console.log(`    slug:     ${slug}`);

    if (!DRY_RUN) {
      await db.query(
        `INSERT INTO gyms
           (name, slug, city, address, coordinates, phone, website, opening_hours,
            price_level, rating, rating_count, place_id, source, verified)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          name, slug, city, address, coords, phone, website, opening_hours,
          price_level, rating, rating_count, place_id, 'manual', 1,
        ]
      );
      console.log(`  INSERTED (id auto-assigned)\n`);
    } else {
      console.log(`  [DRY RUN — not inserted]\n`);
    }
  }

  console.log(`${'═'.repeat(60)}`);
  console.log(DRY_RUN ? '  Dry run complete.' : '  Done.');
  console.log(`${'═'.repeat(60)}\n`);

  await db.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
