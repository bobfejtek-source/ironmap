/**
 * Migration: add discovery tracking columns + discovery_log table
 *
 * Safe to run multiple times (all ADD COLUMN IF NOT EXISTS).
 *
 * Usage:
 *   node scripts/migrate-discovery-schema.mjs
 *   node scripts/migrate-discovery-schema.mjs --dry-run
 */

import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const db = new pg.Pool({ connectionString: process.env.POSTGRES_URL });

const MIGRATIONS = [
  {
    label: 'gyms.discovery_source',
    sql: `ALTER TABLE gyms ADD COLUMN IF NOT EXISTS discovery_source TEXT`,
    description: 'Track how each gym was discovered: osm, firmy.cz, manual, places_discovery',
  },
  {
    label: 'gyms.discovery_batch',
    sql: `ALTER TABLE gyms ADD COLUMN IF NOT EXISTS discovery_batch TEXT`,
    description: 'Batch ID for rollback: e.g. "2026-04-12-Praha". DELETE WHERE discovery_batch = X rolls back a full city run.',
  },
  {
    label: 'gyms.confidence',
    sql: `ALTER TABLE gyms ADD COLUMN IF NOT EXISTS confidence REAL`,
    description: 'Quality score 0.0–1.0 based on rating, review count, contact data, opening hours.',
  },
  {
    label: 'gyms.staging',
    sql: `ALTER TABLE gyms ADD COLUMN IF NOT EXISTS staging BOOLEAN NOT NULL DEFAULT FALSE`,
    description: 'TRUE = auto-discovered but not yet reviewed. Hidden from public site until promoted.',
  },
  {
    label: 'discovery_log table',
    sql: `
      CREATE TABLE IF NOT EXISTS discovery_log (
        id            SERIAL PRIMARY KEY,
        batch_id      TEXT        NOT NULL,
        city          TEXT        NOT NULL,
        ran_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        searches      INTEGER,
        candidates    INTEGER,
        duplicates    INTEGER,
        inserted      INTEGER,
        promoted      INTEGER,
        api_cost_usd  REAL
      )
    `,
    description: 'Audit log for every discovery run — used for cost tracking and rollback reference.',
  },
  {
    label: 'idx_gyms_staging',
    sql: `CREATE INDEX IF NOT EXISTS idx_gyms_staging ON gyms(staging) WHERE staging = TRUE`,
    description: 'Partial index for fast staging queue queries.',
  },
  {
    label: 'idx_gyms_discovery_batch',
    sql: `CREATE INDEX IF NOT EXISTS idx_gyms_discovery_batch ON gyms(discovery_batch) WHERE discovery_batch IS NOT NULL`,
    description: 'Index for batch rollback queries.',
  },
  {
    label: 'idx_gyms_place_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_gyms_place_id ON gyms(place_id) WHERE place_id IS NOT NULL`,
    description: 'Fast dedup lookup by Google place_id.',
  },
  {
    label: 'backfill discovery_source for existing gyms (osm)',
    sql: `UPDATE gyms SET discovery_source = 'osm' WHERE source IS NULL AND discovery_source IS NULL`,
    description: 'Tag existing OSM-sourced gyms.',
  },
  {
    label: 'backfill discovery_source for existing gyms (firmy.cz)',
    sql: `UPDATE gyms SET discovery_source = 'firmy.cz' WHERE source = 'firmy.cz' AND discovery_source IS NULL`,
    description: 'Tag existing firmy.cz gyms.',
  },
  {
    label: 'backfill discovery_source for existing gyms (manual)',
    sql: `UPDATE gyms SET discovery_source = 'manual' WHERE source = 'manual' AND discovery_source IS NULL`,
    description: 'Tag existing manually inserted gyms.',
  },
];

async function verify() {
  // Check columns exist and staging defaults are correct
  const { rows } = await db.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'gyms'
      AND column_name IN ('discovery_source', 'discovery_batch', 'confidence', 'staging', 'place_id')
    ORDER BY column_name
  `);

  const { rows: tableRows } = await db.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_name = 'discovery_log'
  `);

  const { rows: idxRows } = await db.query(`
    SELECT indexname FROM pg_indexes
    WHERE tablename IN ('gyms', 'discovery_log')
      AND indexname IN ('idx_gyms_staging', 'idx_gyms_discovery_batch', 'idx_gyms_place_id')
  `);

  const { rows: backfillRows } = await db.query(`
    SELECT discovery_source, COUNT(*)::int as count
    FROM gyms GROUP BY discovery_source ORDER BY count DESC
  `);

  console.log('\n── Verification ──────────────────────────────────────────');
  console.log('Columns on gyms:');
  rows.forEach(r => console.log(`  ${r.column_name.padEnd(20)} ${r.data_type} | default: ${r.column_default ?? 'none'} | nullable: ${r.is_nullable}`));
  console.log('\ndiscovery_log table:', tableRows.length ? 'EXISTS' : 'MISSING');
  console.log('\nIndexes:');
  idxRows.forEach(r => console.log(' ', r.indexname));
  console.log('\ndiscovery_source backfill:');
  backfillRows.forEach(r => console.log(`  ${String(r.count).padStart(4)} — ${r.discovery_source ?? 'NULL'}`));
  console.log('──────────────────────────────────────────────────────────\n');
}

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Discovery Schema Migration`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`${'═'.repeat(60)}\n`);

  for (const { label, sql, description } of MIGRATIONS) {
    console.log(`▸ ${label}`);
    console.log(`  ${description}`);
    if (!DRY_RUN) {
      try {
        await db.query(sql.trim());
        console.log(`  ✓ done\n`);
      } catch (err) {
        console.error(`  ✗ FAILED: ${err.message}\n`);
        await db.end();
        process.exit(1);
      }
    } else {
      console.log(`  [dry-run — skipped]\n`);
    }
  }

  if (!DRY_RUN) {
    await verify();
    console.log('Migration complete.\n');
  } else {
    console.log('Dry run complete — no changes made.\n');
  }

  await db.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
