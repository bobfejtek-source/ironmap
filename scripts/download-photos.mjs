#!/usr/bin/env node
/**
 * Download gym photos from Google Places API v1 → public/photos/{id}_1.jpg, {id}_2.jpg
 * Compresses via sharp to 80% quality, max 800px wide.
 * Budget limit: $30 (max 4285 photos @ $0.007 each)
 * Progress saved to scripts/download-photos-progress.json
 */
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import https from 'https';
import sharp from 'sharp';

const { Client } = pg;
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const OUT_DIR = path.join(process.cwd(), 'public', 'photos');
const PROGRESS_FILE = path.join(process.cwd(), 'scripts', 'download-photos-progress.json');
const BUDGET_USD = 30;
const COST_PER_PHOTO = 0.007;
const MAX_PHOTOS = Math.floor(BUDGET_USD / COST_PER_PHOTO); // 4285
const BATCH_SIZE = 50;
const BATCH_PAUSE_MS = 1000;
const MAX_PER_GYM = 2;
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = process.argv.includes('--limit')
  ? parseInt(process.argv[process.argv.indexOf('--limit') + 1])
  : null;

fs.mkdirSync(OUT_DIR, { recursive: true });

// Load progress
let progress = { done: [], totalPhotos: 0, totalCost: 0 };
if (fs.existsSync(PROGRESS_FILE)) {
  try { progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch {}
}
const doneSet = new Set(progress.done);

const client = new Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows: gyms } = await client.query(`
  SELECT id, name, photos FROM gyms
  WHERE staging = false AND photos IS NOT NULL AND photos != '[]'
  ORDER BY id
`);
await client.end();

const pending = gyms.filter(g => !doneSet.has(g.id));
const total = LIMIT ? Math.min(pending.length, LIMIT) : pending.length;
const toProcess = pending.slice(0, total);

console.log(`\nTotal gyms with photos: ${gyms.length}`);
console.log(`Already done: ${doneSet.size}`);
console.log(`To process: ${toProcess.length}${LIMIT ? ` (limited to ${LIMIT})` : ''}`);
console.log(`Budget: $${BUDGET_USD} → max ${MAX_PHOTOS} photos`);
console.log(`Spent so far: $${progress.totalCost.toFixed(2)} (${progress.totalPhotos} photos)`);
if (DRY_RUN) console.log('DRY RUN — no files written\n');
else console.log('');

// Fetch with redirect following
function fetchBytes(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 10) return reject(new Error('Too many redirects'));
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchBytes(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadPhoto(ref) {
  // Places API v1: get signed photoUri first
  const metaUrl = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=800&skipHttpRedirect=true&key=${API_KEY}`;
  const raw = await fetchBytes(metaUrl);
  const json = JSON.parse(raw.toString());
  if (!json.photoUri) throw new Error('No photoUri in response');
  return fetchBytes(json.photoUri);
}

let photosThisRun = 0;
let costThisRun = 0;
let errors = 0;

for (let i = 0; i < toProcess.length; i++) {
  const gym = toProcess[i];

  // Budget check
  if (progress.totalPhotos + photosThisRun >= MAX_PHOTOS) {
    console.log(`\nBudget limit reached ($${BUDGET_USD}). Stopping.`);
    break;
  }

  let refs;
  try { refs = JSON.parse(gym.photos).slice(0, MAX_PER_GYM); } catch { continue; }
  if (!refs.length) continue;

  process.stdout.write(`[${i + 1}/${toProcess.length}] ${gym.name} (${gym.id})... `);

  if (DRY_RUN) { console.log('skip (dry run)'); continue; }

  let gymOk = true;
  for (let n = 0; n < refs.length; n++) {
    const outPath = path.join(OUT_DIR, `${gym.id}_${n + 1}.jpg`);
    if (fs.existsSync(outPath)) continue; // already downloaded

    try {
      const buf = await downloadPhoto(refs[n]);
      const compressed = await sharp(buf)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
      fs.writeFileSync(outPath, compressed);
      photosThisRun++;
      costThisRun += COST_PER_PHOTO;
      process.stdout.write(`✓${n + 1}(${(compressed.length / 1024).toFixed(0)}KB) `);
    } catch (err) {
      process.stdout.write(`✗${n + 1} `);
      gymOk = false;
      errors++;
    }
  }
  console.log('');

  // Mark done only if all photos succeeded
  if (gymOk) {
    doneSet.add(gym.id);
    progress.done.push(gym.id);
  }
  progress.totalPhotos += photosThisRun > 0 ? Math.min(refs.length, photosThisRun) : 0;
  progress.totalCost = (progress.totalCost || 0) + costThisRun;
  costThisRun = 0;
  photosThisRun = 0;

  // Save progress
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

  // Batch pause
  if ((i + 1) % BATCH_SIZE === 0 && i + 1 < toProcess.length) {
    console.log(`  Batch pause ${BATCH_PAUSE_MS}ms...`);
    await new Promise(r => setTimeout(r, BATCH_PAUSE_MS));
  }
}

// Final stats
const totalPhotosNow = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.jpg')).length;
const totalSizeKB = fs.readdirSync(OUT_DIR)
  .filter(f => f.endsWith('.jpg'))
  .reduce((s, f) => s + fs.statSync(path.join(OUT_DIR, f)).size, 0) / 1024;

console.log(`\n── Done ──`);
console.log(`Photos in public/photos/: ${totalPhotosNow}`);
console.log(`Total size: ${(totalSizeKB / 1024).toFixed(1)} MB`);
console.log(`Total cost: $${(progress.totalCost || 0).toFixed(2)}`);
console.log(`Errors: ${errors}`);
