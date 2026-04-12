/**
 * Promote staged gyms: auto-promote confidence >= 0.75, list the rest for manual review.
 *
 * Usage:
 *   node scripts/promote-staged.mjs --dry-run          # show what would be promoted
 *   node scripts/promote-staged.mjs                    # auto-promote high-confidence
 *   node scripts/promote-staged.mjs --batch 2026-04-12-discovery  # specific batch only
 *   node scripts/promote-staged.mjs --approve 123,456  # manually approve specific IDs
 *   node scripts/promote-staged.mjs --reject  123,456  # permanently delete specific IDs
 */

import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.local') });

// ── CLI args ──────────────────────────────────────────────────────────────────

const DRY_RUN    = process.argv.includes('--dry-run');
const BATCH_ARG  = process.argv.indexOf('--batch');
const BATCH_ID   = BATCH_ARG !== -1 ? process.argv[BATCH_ARG + 1] : null;

const APPROVE_ARG = process.argv.indexOf('--approve');
const REJECT_ARG  = process.argv.indexOf('--reject');
const APPROVE_IDS = APPROVE_ARG !== -1
  ? process.argv[APPROVE_ARG + 1].split(',').map(Number).filter(Boolean)
  : [];
const REJECT_IDS  = REJECT_ARG !== -1
  ? process.argv[REJECT_ARG + 1].split(',').map(Number).filter(Boolean)
  : [];

const AUTO_PROMOTE_THRESHOLD = 0.75;

// ── DB ────────────────────────────────────────────────────────────────────────

const db = new pg.Pool({ connectionString: process.env.POSTGRES_URL });

async function getStagedGyms(batchId) {
  const batchClause = batchId ? `AND discovery_batch = '${batchId}'` : '';
  const { rows } = await db.query(`
    SELECT id, name, city, address, rating, rating_count, phone, website,
           confidence, discovery_batch, discovery_source, created_at
    FROM gyms
    WHERE staging = TRUE ${batchClause}
    ORDER BY confidence DESC NULLS LAST, city, name
  `);
  return rows;
}

async function promoteIds(ids) {
  if (ids.length === 0) return 0;
  const { rowCount } = await db.query(
    `UPDATE gyms SET staging = FALSE WHERE id = ANY($1) AND staging = TRUE`,
    [ids]
  );
  // Update discovery_log promoted count per batch
  await db.query(`
    UPDATE discovery_log SET promoted = promoted + $1
    WHERE batch_id IN (
      SELECT DISTINCT discovery_batch FROM gyms WHERE id = ANY($2)
    )
  `, [rowCount, ids]);
  return rowCount;
}

async function rejectIds(ids) {
  if (ids.length === 0) return 0;
  const { rowCount } = await db.query(
    `DELETE FROM gyms WHERE id = ANY($1) AND staging = TRUE`,
    [ids]
  );
  return rowCount;
}

// ── Display helpers ───────────────────────────────────────────────────────────

function confidenceBar(conf) {
  if (conf == null) return '░░░░░ null';
  const filled = Math.round(conf * 5);
  const bar = '█'.repeat(filled) + '░'.repeat(5 - filled);
  return `${bar} ${(conf * 100).toFixed(0).padStart(3)}%`;
}

function formatRow(g) {
  const rating  = g.rating ? `${g.rating}★ (${g.rating_count})` : 'no rating';
  const contact = [g.phone, g.website].filter(Boolean).join(' | ') || '—';
  return [
    `  [${g.id}] ${g.name}`,
    `       ${g.city} | ${g.address ?? '—'}`,
    `       ${confidenceBar(g.confidence)} | ${rating} | ${contact}`,
    `       batch: ${g.discovery_batch ?? '—'}`,
  ].join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  IRONmap — Promote Staged Gyms`);
  console.log(`  Mode:  ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  if (BATCH_ID) console.log(`  Batch: ${BATCH_ID}`);
  console.log(`${'═'.repeat(60)}\n`);

  // ── Manual approve / reject ───────────────────────────────────────────────
  if (APPROVE_IDS.length > 0) {
    console.log(`Manual approve IDs: ${APPROVE_IDS.join(', ')}`);
    if (!DRY_RUN) {
      const n = await promoteIds(APPROVE_IDS);
      console.log(`  ✓ Promoted ${n} gym(s)\n`);
    } else {
      console.log(`  [dry-run]\n`);
    }
  }

  if (REJECT_IDS.length > 0) {
    console.log(`Manual reject IDs: ${REJECT_IDS.join(', ')}`);
    if (!DRY_RUN) {
      const n = await rejectIds(REJECT_IDS);
      console.log(`  ✓ Deleted ${n} gym(s)\n`);
    } else {
      console.log(`  [dry-run]\n`);
    }
  }

  if (APPROVE_IDS.length > 0 || REJECT_IDS.length > 0) {
    await db.end();
    return;
  }

  // ── Auto-promote + review queue ───────────────────────────────────────────
  const staged = await getStagedGyms(BATCH_ID);

  if (staged.length === 0) {
    console.log('No staged gyms found.\n');
    await db.end();
    return;
  }

  const autoPromote = staged.filter(g => (g.confidence ?? 0) >= AUTO_PROMOTE_THRESHOLD);
  const needsReview = staged.filter(g => (g.confidence ?? 0) <  AUTO_PROMOTE_THRESHOLD);

  // ── Auto-promote section ──────────────────────────────────────────────────
  console.log(`Auto-promote (confidence >= ${AUTO_PROMOTE_THRESHOLD * 100}%): ${autoPromote.length} gyms`);
  console.log(`Manual review queue:                                    ${needsReview.length} gyms`);
  console.log(`${'─'.repeat(60)}\n`);

  // Group auto-promotes by city for readability
  const byCityAuto = {};
  for (const g of autoPromote) {
    (byCityAuto[g.city] ??= []).push(g);
  }

  for (const [city, gyms] of Object.entries(byCityAuto)) {
    console.log(`  ${city} (${gyms.length}):`);
    for (const g of gyms) {
      const rating  = g.rating ? `${g.rating}★ (${g.rating_count})` : 'no rating';
      console.log(`    [${g.id}] ${g.name} — ${rating} — conf: ${(g.confidence * 100).toFixed(0)}%`);
    }
  }

  if (!DRY_RUN && autoPromote.length > 0) {
    const n = await promoteIds(autoPromote.map(g => g.id));
    console.log(`\n  ✓ Promoted ${n} gyms (staging → live)\n`);
  } else if (DRY_RUN) {
    console.log(`\n  [dry-run — nothing promoted]\n`);
  }

  // ── Manual review queue ───────────────────────────────────────────────────
  if (needsReview.length > 0) {
    console.log(`${'─'.repeat(60)}`);
    console.log(`MANUAL REVIEW QUEUE (confidence < ${AUTO_PROMOTE_THRESHOLD * 100}%)`);
    console.log(`${'─'.repeat(60)}\n`);
    console.log(`These gyms are in staging and need a human decision.\n`);

    for (const g of needsReview) {
      console.log(formatRow(g));
      console.log();
    }

    console.log(`To approve specific IDs:`);
    console.log(`  node scripts/promote-staged.mjs --approve ${needsReview.slice(0, 3).map(g => g.id).join(',')}\n`);
    console.log(`To reject specific IDs:`);
    console.log(`  node scripts/promote-staged.mjs --reject ${needsReview.slice(0, 3).map(g => g.id).join(',')}\n`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Summary`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Total staged:    ${staged.length}`);
  console.log(`  Auto-promoted:   ${autoPromote.length}${DRY_RUN ? ' (dry run)' : ''}`);
  console.log(`  Needs review:    ${needsReview.length}`);
  if (DRY_RUN) {
    console.log(`\n  Run without --dry-run to execute.`);
  }
  console.log(`${'═'.repeat(60)}\n`);

  await db.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
