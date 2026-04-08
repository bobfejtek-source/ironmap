#!/usr/bin/env node
/**
 * Initialize Postgres schema for gymie.
 *
 * Usage:
 *   npm run db:init
 *
 * Requires POSTGRES_URL (or POSTGRES_URL_NON_POOLING) in .env.local
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔌  Connected to Postgres');

    await client.query('BEGIN');

    // ── Gyms ──────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS gyms (
        id            SERIAL PRIMARY KEY,
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
        osm_id        BIGINT,
        verified      INTEGER NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_gyms_slug ON gyms(slug)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gyms_city ON gyms(city)`);
    console.log('  ✓ gyms');

    // ── NextAuth: users ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(255),
        email         VARCHAR(255) UNIQUE,
        "emailVerified" TIMESTAMPTZ,
        image         TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('  ✓ users');

    // ── NextAuth: accounts ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id                  SERIAL PRIMARY KEY,
        "userId"            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type                VARCHAR(255) NOT NULL,
        provider            VARCHAR(255) NOT NULL,
        "providerAccountId" VARCHAR(255) NOT NULL,
        refresh_token       TEXT,
        access_token        TEXT,
        expires_at          BIGINT,
        id_token            TEXT,
        scope               TEXT,
        session_state       TEXT,
        token_type          TEXT,
        UNIQUE(provider, "providerAccountId")
      )
    `);
    console.log('  ✓ accounts');

    // ── NextAuth: sessions ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id             SERIAL PRIMARY KEY,
        "userId"       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires        TIMESTAMPTZ NOT NULL,
        "sessionToken" VARCHAR(255) UNIQUE NOT NULL
      )
    `);
    console.log('  ✓ sessions');

    // ── NextAuth: verification tokens ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_token (
        identifier TEXT NOT NULL,
        token      TEXT UNIQUE NOT NULL,
        expires    TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (identifier, token)
      )
    `);
    console.log('  ✓ verification_token');

    // ── Check-ins ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS checkins (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        gym_id        TEXT NOT NULL,
        checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        lat           DECIMAL(10,7),
        lng           DECIMAL(10,7),
        photo_url     TEXT
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_checkins_gym ON checkins(gym_id)`);
    console.log('  ✓ checkins');

    // ── Badges ────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS badges (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_type VARCHAR(100) NOT NULL,
        earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, badge_type)
      )
    `);
    console.log('  ✓ badges');

    await client.query('COMMIT');
    console.log('\n✅  Schema ready.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
