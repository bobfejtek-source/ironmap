#!/usr/bin/env node
/**
 * Import script: reads gyms.json and seeds data/gymie.db
 *
 * Usage:
 *   node scripts/import.js [path/to/gyms.json]
 *
 * Expected gyms.json shape (array of objects):
 * [
 *   {
 *     "name": "FitGym Praha",
 *     "slug": "fitgym-praha",           // optional – auto-generated if missing
 *     "city": "Praha",
 *     "address": "Wenceslas Square 1",
 *     "rating": 4.5,
 *     "phone": "+420 123 456 789",
 *     "website": "https://example.com",
 *     "opening_hours": { "monday": "6:00–22:00", ... },
 *     "coordinates": { "lat": 50.0755, "lng": 14.4378 },
 *     "description": "...",
 *     "verified": false
 *   }
 * ]
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ── helpers ──────────────────────────────────────────────────────────────────

function toSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureUniqueSlug(base, usedSlugs) {
  let slug = base;
  let n = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${n++}`;
  }
  usedSlugs.add(slug);
  return slug;
}

// ── main ─────────────────────────────────────────────────────────────────────

const jsonPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', 'gyms.json');

if (!fs.existsSync(jsonPath)) {
  console.error(`❌  gyms.json not found at: ${jsonPath}`);
  console.error('   Place gyms.json in the project root or pass a custom path as argument.');
  process.exit(1);
}

const gyms = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

if (!Array.isArray(gyms) || gyms.length === 0) {
  console.error('❌  gyms.json must be a non-empty array.');
  process.exit(1);
}

const dbDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dbDir, { recursive: true });
const dbPath = path.join(dbDir, 'gymie.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS gyms (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    slug          TEXT    NOT NULL,
    city          TEXT    NOT NULL,
    address       TEXT,
    rating        REAL,
    phone         TEXT,
    website       TEXT,
    email         TEXT,
    opening_hours TEXT,
    coordinates   TEXT,
    description   TEXT,
    ico           TEXT,
    tags          TEXT,
    source        TEXT,
    detail_url    TEXT,
    price_level   TEXT,
    osm_id        INTEGER,
    verified      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_gyms_slug ON gyms(slug);
  CREATE INDEX IF NOT EXISTS idx_gyms_city ON gyms(city);
  CREATE INDEX IF NOT EXISTS idx_gyms_ico ON gyms(ico);
`);

// ── upsert ───────────────────────────────────────────────────────────────────

const upsert = db.prepare(`
  INSERT INTO gyms (name, slug, city, address, rating, phone, website, email, opening_hours, coordinates, description, ico, tags, source, detail_url, price_level, osm_id, verified)
  VALUES (@name, @slug, @city, @address, @rating, @phone, @website, @email, @opening_hours, @coordinates, @description, @ico, @tags, @source, @detail_url, @price_level, @osm_id, @verified)
  ON CONFLICT(slug) DO UPDATE SET
    name          = excluded.name,
    city          = excluded.city,
    address       = excluded.address,
    rating        = excluded.rating,
    phone         = excluded.phone,
    website       = excluded.website,
    email         = excluded.email,
    opening_hours = excluded.opening_hours,
    coordinates   = excluded.coordinates,
    description   = excluded.description,
    ico           = excluded.ico,
    tags          = excluded.tags,
    source        = excluded.source,
    detail_url    = excluded.detail_url,
    price_level   = excluded.price_level,
    osm_id        = excluded.osm_id,
    verified      = excluded.verified
`);

const usedSlugs = new Set(
  db.prepare('SELECT slug FROM gyms').all().map((r) => r.slug)
);

const importMany = db.transaction((rows) => {
  let inserted = 0;
  let updated = 0;

  for (const gym of rows) {
    const baseSlug = gym.slug ? String(gym.slug) : toSlug(String(gym.name));
    const slug = ensureUniqueSlug(baseSlug, usedSlugs);

    const info = upsert.run({
      name: gym.name,
      slug,
      city: gym.city,
      address: gym.address ?? null,
      rating: gym.rating != null ? Number(gym.rating) : null,
      phone: gym.phone ?? null,
      website: gym.website ?? null,
      opening_hours: gym.opening_hours
        ? typeof gym.opening_hours === 'string'
          ? gym.opening_hours
          : JSON.stringify(gym.opening_hours)
        : null,
      coordinates: gym.coordinates
        ? typeof gym.coordinates === 'string'
          ? gym.coordinates
          : JSON.stringify(gym.coordinates)
        : null,
      description: gym.description ?? null,
      email: gym.email ?? null,
      ico: gym.ico ?? null,
      tags: gym.tags ?? null,
      source: gym.source ?? null,
      detail_url: gym.detail_url ?? null,
      price_level: gym.price_level ?? null,
      osm_id: gym.osm_id ?? null,
      verified: gym.verified ? 1 : 0,
    });

    if (info.changes > 0) {
      if (info.lastInsertRowid && !usedSlugs.has(slug + '_existed')) {
        inserted++;
      } else {
        updated++;
      }
    }
  }

  return { inserted, updated };
});

console.log(`📦  Importing ${gyms.length} gyms from ${jsonPath} …`);
const result = importMany(gyms);

const total = db.prepare('SELECT COUNT(*) as n FROM gyms').get().n;
console.log(`✅  Done. Rows in DB: ${total}`);
console.log(`   Source records processed: ${gyms.length}`);
