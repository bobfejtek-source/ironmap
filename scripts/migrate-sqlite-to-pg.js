#!/usr/bin/env node
/**
 * One-time migration: reads existing data/gymie.db (SQLite) and inserts all
 * gyms into the Postgres database.
 *
 * Run AFTER `npm run db:init`.
 *
 * Usage:
 *   npm run db:migrate
 */

require('dotenv').config({ path: '.env.local' });
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'gymie.db');
if (!fs.existsSync(dbPath)) {
  console.error(`❌  SQLite DB not found at: ${dbPath}`);
  console.error('   Nothing to migrate.');
  process.exit(0);
}

const sqlite = new Database(dbPath, { readonly: true });
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const rows = sqlite.prepare('SELECT * FROM gyms').all();
  console.log(`📦  Found ${rows.length} gyms in SQLite`);

  const client = await pool.connect();
  let inserted = 0;
  let skipped = 0;

  try {
    for (const gym of rows) {
      try {
        await client.query(
          `INSERT INTO gyms
             (name, slug, city, address, rating, phone, website, email,
              opening_hours, coordinates, description, ico, tags, source,
              detail_url, price_level, osm_id, verified)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           ON CONFLICT (slug) DO NOTHING`,
          [
            gym.name, gym.slug, gym.city, gym.address ?? null,
            gym.rating ?? null, gym.phone ?? null, gym.website ?? null,
            gym.email ?? null, gym.opening_hours ?? null,
            gym.coordinates ?? null, gym.description ?? null,
            gym.ico ?? null, gym.tags ?? null, gym.source ?? null,
            gym.detail_url ?? null, gym.price_level ?? null,
            gym.osm_id ?? null, gym.verified ?? 0,
          ],
        );
        inserted++;
      } catch (e) {
        console.warn(`  ⚠  Skipped "${gym.slug}": ${e.message}`);
        skipped++;
      }
    }
    console.log(`✅  Done. Inserted: ${inserted}, Skipped: ${skipped}`);
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
