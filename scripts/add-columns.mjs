#!/usr/bin/env node
/**
 * ÚKOL 1 + 3 + 4 — Add new columns to gyms table, set is_24_7, report results.
 * Uses POSTGRES_URL_NON_POOLING for DDL (pooled connection doesn't support DDL).
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const client = new Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log('Connected to Postgres (non-pooling)');

// ── ÚKOL 1: Add 12 new columns ───────────────────────────────────────────────
const alterStatements = [
  'ALTER TABLE gyms ADD COLUMN IF NOT EXISTS multisport BOOLEAN DEFAULT NULL',
  'ALTER TABLE gyms ADD COLUMN IF NOT EXISTS gopass BOOLEAN DEFAULT NULL',
  'ALTER TABLE gyms ADD COLUMN IF NOT EXISTS benefit_plus BOOLEAN DEFAULT NULL',
  'ALTER TABLE gyms ADD COLUMN IF NOT EXISTS is_24_7 BOOLEAN DEFAULT NULL',
  'ALTER TABLE gyms ADD COLUMN IF NOT EXISTS has_sauna BOOLEAN DEFAULT NULL',
  'ALTER TABLE gyms ADD COLUMN IF NOT EXISTS has_pool BOOLEAN DEFAULT NULL',
  'ALTER TABLE gyms ADD COLUMN IF NOT EXISTS has_parking BOOLEAN DEFAULT NULL',
  'ALTER TABLE gyms ADD COLUMN IF NOT EXISTS has_showers BOOLEAN DEFAULT NULL',
  'ALTER TABLE gyms ADD COLUMN IF NOT EXISTS has_lockers BOOLEAN DEFAULT NULL',
  'ALTER TABLE gyms ADD COLUMN IF NOT EXISTS has_cardio BOOLEAN DEFAULT NULL',
  'ALTER TABLE gyms ADD COLUMN IF NOT EXISTS has_weights BOOLEAN DEFAULT NULL',
  'ALTER TABLE gyms ADD COLUMN IF NOT EXISTS has_classes BOOLEAN DEFAULT NULL',
];

console.log('\n── ÚKOL 1: ALTER TABLE ──');
for (const stmt of alterStatements) {
  try {
    await client.query(stmt);
    const col = stmt.match(/ADD COLUMN IF NOT EXISTS (\w+)/)[1];
    console.log(`  ✓ ${col}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${stmt}`);
    console.error(`    ${err.message}`);
  }
}

// ── Verify columns were added ─────────────────────────────────────────────────
const { rows: colCheck } = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'gyms' AND table_schema = 'public'
  ORDER BY ordinal_position
`);
const colNames = colCheck.map(r => r.column_name);
const newCols = ['multisport','gopass','benefit_plus','is_24_7','has_sauna','has_pool','has_parking','has_showers','has_lockers','has_cardio','has_weights','has_classes'];
const missing = newCols.filter(c => !colNames.includes(c));
if (missing.length) {
  console.error(`\n  MISSING columns after ALTER: ${missing.join(', ')}`);
  process.exit(1);
} else {
  console.log(`\n  All 12 columns confirmed present. Total columns: ${colNames.length}`);
}

// ── ÚKOL 3: Set is_24_7 from opening_hours ───────────────────────────────────
console.log('\n── ÚKOL 3: UPDATE is_24_7 ──');
const { rowCount: updated } = await client.query(`
  UPDATE gyms
  SET is_24_7 = true
  WHERE opening_hours ILIKE '%24%'
     OR opening_hours ILIKE '%nonstop%'
     OR opening_hours ILIKE '%00:00-23:59%'
`);
console.log(`  Updated ${updated} gyms with is_24_7 = true`);

// ── ÚKOL 4: Report ───────────────────────────────────────────────────────────
console.log('\n── ÚKOL 4: Report ──');

const { rows: [{ total_cols }] } = await client.query(`
  SELECT COUNT(*) AS total_cols FROM information_schema.columns
  WHERE table_name = 'gyms' AND table_schema = 'public'
`);
console.log(`  Total columns in gyms: ${total_cols}`);

const { rows: [{ count_24_7 }] } = await client.query(`
  SELECT COUNT(*) AS count_24_7 FROM gyms WHERE is_24_7 = true
`);
console.log(`  Gyms with is_24_7 = true: ${count_24_7}`);

console.log('\n  10 staging gym examples:');
const { rows: stagingExamples } = await client.query(`
  SELECT id, name, city, staging, confidence, discovery_source, created_at
  FROM gyms
  WHERE staging = true
  ORDER BY created_at DESC
  LIMIT 10
`);
console.table(stagingExamples);

await client.end();
console.log('\nDone.');
