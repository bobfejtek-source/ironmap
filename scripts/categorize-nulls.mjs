/**
 * One-off: categorize the 586 places_discovery gyms that have category = NULL.
 * Uses name-based signals only (types field was not stored at insert time).
 *
 * Usage:
 *   node scripts/categorize-nulls.mjs --dry-run   # show what would change
 *   node scripts/categorize-nulls.mjs             # apply
 */

import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const db = new pg.Pool({ connectionString: process.env.POSTGRES_URL });

// ── Category signal rules (checked in priority order) ─────────────────────────
// First match wins.

function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function nameContains(name, ...terms) {
  const n = stripDiacritics(name.toLowerCase());
  return terms.some(t => n.includes(stripDiacritics(t.toLowerCase())));
}

function categorize(name) {
  if (nameContains(name,
    'yoga', 'jóga', 'joga', 'jógov', 'jogov', 'yogi', 'iyengar', 'ashtanga',
    'vinyasa', 'taiji', 'tai chi', 'qigong', 'chi gong'
  )) return 'Jóga';

  if (nameContains(name,
    'pilates', 'pilate'
  )) return 'Pilates';

  if (nameContains(name,
    'crossfit', 'cross fit', 'cross-fit'
  )) return 'CrossFit';

  if (nameContains(name,
    'spinning', 'spin studio', 'indoor cycling', 'cyklo studio', 'cyklostudio'
  )) return 'Spinning';

  if (nameContains(name,
    'box', 'boxing', 'boxárna', 'boxarna', 'kickbox', 'muay thai',
    'mma', 'judo', 'karate', 'aikido', 'taekwondo', 'bjj', 'jiu jitsu',
    'jiu-jitsu', 'bojov', 'martial', 'zápas', 'zapas', 'wrestling',
    'budo', 'kapap', 'krav maga', 'combat', 'šerm', 'serm', 'fencing'
  )) return 'Bojové sporty';

  if (nameContains(name,
    'outdoor', 'venkovní', 'venkovni', 'street workout', 'fitpark', 'fit park',
    'fitness park', 'fitness stezka', 'workout park', 'outdoor gym',
    'lezecká stěna', 'lezecka stena', 'bouldering', 'calisthenics',
    'hřiště', 'hriste', 'schody', 'athletic track', 'atletická dráha'
  )) return 'Outdoor';

  if (nameContains(name,
    'bazén', 'bazen', 'plaveck', 'plovárna', 'plovarna', 'aqua', 'swim'
  )) return 'Bazén';

  // Default for anything that looks like a gym/fitness
  return 'Posilovna';
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Categorize NULL gyms`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Before distribution
  const { rows: before } = await db.query(`
    SELECT category, COUNT(*)::int as count
    FROM gyms WHERE staging = FALSE
    GROUP BY category ORDER BY count DESC NULLS FIRST
  `);

  console.log('BEFORE:');
  before.forEach(r => console.log(`  ${String(r.count).padStart(4)}  ${r.category ?? 'NULL'}`));

  // Fetch all nulls
  const { rows: nullGyms } = await db.query(`
    SELECT id, name FROM gyms
    WHERE staging = FALSE AND category IS NULL
    ORDER BY name
  `);

  console.log(`\nGyms to categorize: ${nullGyms.length}\n`);

  // Assign categories
  const assignments = {};
  for (const g of nullGyms) {
    const cat = categorize(g.name);
    (assignments[cat] ??= []).push(g);
  }

  console.log('Assignments:');
  for (const [cat, gyms] of Object.entries(assignments).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(gyms.length).padStart(4)}  ${cat}`);
  }

  if (!DRY_RUN) {
    for (const [cat, gyms] of Object.entries(assignments)) {
      const ids = gyms.map(g => g.id);
      await db.query(
        `UPDATE gyms SET category = $1 WHERE id = ANY($2)`,
        [cat, ids]
      );
    }
    console.log(`\n  ✓ Updated ${nullGyms.length} gyms\n`);

    // After distribution
    const { rows: after } = await db.query(`
      SELECT category, COUNT(*)::int as count
      FROM gyms WHERE staging = FALSE
      GROUP BY category ORDER BY count DESC NULLS FIRST
    `);

    console.log('AFTER:');
    after.forEach(r => console.log(`  ${String(r.count).padStart(4)}  ${r.category ?? 'NULL'}`));
  } else {
    console.log('\n  [dry-run — nothing written]');
  }

  console.log(`\n${'═'.repeat(60)}\n`);
  await db.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
