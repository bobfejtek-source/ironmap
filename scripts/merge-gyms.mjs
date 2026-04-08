/**
 * Merge data/gyms_new.json (firmy.cz scrape) into gyms.json (OSM base).
 * - Matching by normalized name+city: enrich existing record (ico, detail_url, tags, phone, website)
 * - No match: append as new record with generated slug
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const existingPath = path.join(ROOT, 'gyms.json');
const newPath = path.join(ROOT, 'data', 'gyms_new.json');

const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
const incoming = JSON.parse(fs.readFileSync(newPath, 'utf8'));

function toSlug(text) {
  return text.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeKey(name, city) {
  return toSlug(name) + '|' + toSlug(city);
}

// Build lookup index from existing records
const existingIndex = new Map();
for (const gym of existing) {
  existingIndex.set(normalizeKey(gym.name, gym.city), gym);
}

// Build slug set to avoid collisions when appending
const usedSlugs = new Set(existing.map(g => g.slug).filter(Boolean));

function ensureUniqueSlug(base) {
  let slug = base;
  let n = 2;
  while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
  usedSlugs.add(slug);
  return slug;
}

let enriched = 0;
let appended = 0;

for (const gym of incoming) {
  const key = normalizeKey(gym.name, gym.city);
  const match = existingIndex.get(key);

  if (match) {
    // Enrich existing record with firmy.cz data
    if (!match.ico && gym.ico) { match.ico = gym.ico; }
    if (!match.detail_url && gym.detail_url) { match.detail_url = gym.detail_url; }
    if (!match.tags && gym.tags) { match.tags = gym.tags; }
    if ((!match.phone || match.phone === 'N/A') && gym.phone) { match.phone = gym.phone; }
    if ((!match.website || match.website === 'N/A') && gym.website) { match.website = gym.website; }
    if (!match.source) match.source = gym.source;
    enriched++;
  } else {
    // Append new record
    const slug = ensureUniqueSlug(toSlug(gym.name) + '-' + toSlug(gym.city));
    existing.push({
      name: gym.name,
      slug,
      city: gym.city,
      address: gym.address || null,
      phone: gym.phone || null,
      website: gym.website || null,
      opening_hours: null,
      coordinates: null,
      ico: gym.ico || null,
      tags: gym.tags || null,
      source: gym.source,
      detail_url: gym.detail_url || null,
      osm_id: null,
    });
    appended++;
  }
}

fs.writeFileSync(existingPath, JSON.stringify(existing, null, 2), 'utf8');

console.log(`Merge complete:`);
console.log(`  Enriched existing records: ${enriched}`);
console.log(`  Appended new records:      ${appended}`);
console.log(`  Total gyms.json records:   ${existing.length}`);

// Quick stats on new total
const withCoords = existing.filter(g => g.coordinates).length;
const withWebsite = existing.filter(g => g.website && g.website !== 'N/A').length;
const withPhone = existing.filter(g => g.phone && g.phone !== 'N/A').length;
const withDetailUrl = existing.filter(g => g.detail_url).length;
const withIco = existing.filter(g => g.ico).length;
console.log(`\nData coverage:`);
console.log(`  With coordinates: ${withCoords}`);
console.log(`  With website:     ${withWebsite}`);
console.log(`  With phone:       ${withPhone}`);
console.log(`  With detail_url:  ${withDetailUrl}`);
console.log(`  With IČO:         ${withIco}`);
