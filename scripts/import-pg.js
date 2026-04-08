#!/usr/bin/env node
/**
 * Import gyms from JSON into Postgres.
 *
 * Usage:
 *   npm run import [path/to/gyms.json]
 *
 * Requires POSTGRES_URL in .env.local
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// ── helpers ──────────────────────────────────────────────────────────────────

function toSlug(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureUniqueSlug(base, usedSlugs) {
  let slug = base;
  let n = 2;
  while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
  usedSlugs.add(slug);
  return slug;
}

// ── main ─────────────────────────────────────────────────────────────────────

const jsonPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', 'gyms.json');

if (!fs.existsSync(jsonPath)) {
  console.error(`❌  Not found: ${jsonPath}`);
  process.exit(1);
}

const gyms = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
if (!Array.isArray(gyms) || gyms.length === 0) {
  console.error('❌  gyms.json must be a non-empty array.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const client = await pool.connect();
  try {
    // Load existing slugs for uniqueness check
    const { rows: existingRows } = await client.query('SELECT slug FROM gyms');
    const usedSlugs = new Set(existingRows.map((r) => r.slug));

    let inserted = 0;
    let updated = 0;

    console.log(`📦  Importing ${gyms.length} gyms from ${jsonPath} …`);

    for (const gym of gyms) {
      const baseSlug = gym.slug ? String(gym.slug) : toSlug(String(gym.name));
      const slug = ensureUniqueSlug(baseSlug, usedSlugs);

      const openingHours = gym.opening_hours
        ? typeof gym.opening_hours === 'string' ? gym.opening_hours : JSON.stringify(gym.opening_hours)
        : null;
      const coordinates = gym.coordinates
        ? typeof gym.coordinates === 'string' ? gym.coordinates : JSON.stringify(gym.coordinates)
        : null;

      const { rowCount } = await client.query(
        `INSERT INTO gyms
           (name, slug, city, address, rating, phone, website, email,
            opening_hours, coordinates, description, ico, tags, source,
            detail_url, price_level, osm_id, verified)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (slug) DO UPDATE SET
           name          = EXCLUDED.name,
           city          = EXCLUDED.city,
           address       = EXCLUDED.address,
           rating        = EXCLUDED.rating,
           phone         = EXCLUDED.phone,
           website       = EXCLUDED.website,
           email         = EXCLUDED.email,
           opening_hours = EXCLUDED.opening_hours,
           coordinates   = EXCLUDED.coordinates,
           description   = EXCLUDED.description,
           ico           = EXCLUDED.ico,
           tags          = EXCLUDED.tags,
           source        = EXCLUDED.source,
           detail_url    = EXCLUDED.detail_url,
           price_level   = EXCLUDED.price_level,
           osm_id        = EXCLUDED.osm_id,
           verified      = EXCLUDED.verified`,
        [
          gym.name, slug, gym.city, gym.address ?? null,
          gym.rating != null ? Number(gym.rating) : null,
          gym.phone ?? null, gym.website ?? null, gym.email ?? null,
          openingHours, coordinates, gym.description ?? null,
          gym.ico ?? null, gym.tags ?? null, gym.source ?? null,
          gym.detail_url ?? null, gym.price_level ?? null,
          gym.osm_id ?? null, gym.verified ? 1 : 0,
        ],
      );
      if (usedSlugs.has(baseSlug)) updated++; else inserted++;
    }

    const { rows: total } = await client.query('SELECT COUNT(*) AS n FROM gyms');
    console.log(`✅  Done. Rows in DB: ${total[0].n}`);
    console.log(`   Inserted: ${inserted}, Updated: ${updated}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
