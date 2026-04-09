/**
 * Ceník URL checker
 *
 * For each gym with a website, checks /cenik, /ceny, /vstupne, /permanentky.
 * Stores the first URL that returns HTTP 200 AND contains a price keyword.
 * Saves progress every 25 gyms. Restart-safe.
 *
 * Usage:
 *   node scripts/check-cenik.mjs --dry-run   # no DB writes
 *   node scripts/check-cenik.mjs             # full run
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.local') });

const DRY_RUN      = process.argv.includes('--dry-run');
const PROGRESS_PATH = path.join(__dirname, 'check-cenik-progress.json');
const TIMEOUT_MS   = 6000;
const DELAY_MS     = 200;
const SAVE_EVERY   = 25;

const PRICE_PATHS  = ['/cenik', '/ceny', '/vstupne', '/permanentky', '/clenství'];
const PRICE_KWS    = ['cena', 'ceny', 'ceník', 'cenik', 'vstupné', 'vstupne', 'permanentka', 'členství', 'clenstvi', 'kč', 'czk'];

const db = new pg.Pool({ connectionString: process.env.POSTGRES_URL });

function loadProgress() {
  try { return new Set(JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8')).done ?? []); }
  catch { return new Set(); }
}
function saveProgress(done) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify({ done: [...done] }, null, 2));
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizeOrigin(raw) {
  let url = raw.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  try { return new URL(url).origin; }
  catch { return null; }
}

async function checkUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IRONMAPbot/1.0)',
        'Accept-Language': 'cs-CZ,cs;q=0.9',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
    });
    if (!res.ok) return false;
    const text = (await res.text()).toLowerCase();
    return PRICE_KWS.some(kw => text.includes(kw));
  } catch {
    return false;
  }
}

async function main() {
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  IRONMAP — Ceník URL Checker`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`${'═'.repeat(55)}\n`);

  const { rows: gyms } = await db.query(`
    SELECT id, name, city, website FROM gyms
    WHERE website IS NOT NULL
      AND name != 'Unnamed Gym'
      AND website NOT LIKE '%facebook%'
      AND website NOT LIKE '%instagram%'
    ORDER BY id
  `);

  const done = DRY_RUN ? new Set() : loadProgress();
  const todo = gyms.filter(g => !done.has(g.id));

  console.log(`Gyms with websites: ${gyms.length}`);
  console.log(`Already checked:    ${done.size}`);
  console.log(`This run:           ${todo.length}\n`);

  const stats = { found: 0, notFound: 0, badUrl: 0 };

  for (let i = 0; i < todo.length; i++) {
    const gym    = todo[i];
    const origin = normalizeOrigin(gym.website);
    const prefix = `[${i + 1}/${todo.length}] ${gym.name} (${gym.city})`;

    if (!origin) {
      process.stdout.write(`${prefix} — SKIP bad URL\n`);
      stats.badUrl++;
      done.add(gym.id);
      continue;
    }

    let found = null;
    for (const p of PRICE_PATHS) {
      const candidate = origin + p;
      const ok = await checkUrl(candidate);
      if (ok) { found = candidate; break; }
      await sleep(DELAY_MS);
    }

    if (found) {
      process.stdout.write(`${prefix} — ✓ ${found}\n`);
      stats.found++;
      if (!DRY_RUN) {
        await db.query('UPDATE gyms SET cenik_url = $1 WHERE id = $2', [found, gym.id]);
      }
    } else {
      process.stdout.write(`${prefix} — not found\n`);
      stats.notFound++;
    }

    done.add(gym.id);
    if (!DRY_RUN && (i + 1) % SAVE_EVERY === 0) {
      saveProgress(done);
      console.log(`  ── [SAVED] ${i + 1} processed ──`);
    }
    await sleep(DELAY_MS);
  }

  if (!DRY_RUN) saveProgress(done);

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  Found ceník:  ${stats.found}`);
  console.log(`  Not found:    ${stats.notFound}`);
  console.log(`  Bad URL:      ${stats.badUrl}`);
  console.log(`${'═'.repeat(55)}\n`);

  await db.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
