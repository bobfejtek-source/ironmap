/**
 * For OSM-sourced gyms that have no detail_url, query firmy.cz suggest API
 * to find a matching POI and set the detail_url. No browser needed.
 *
 * Saves progress to data/match-progress.json so it can resume.
 * Rate: ~2 req/sec.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GYMS_PATH = path.join(__dirname, '..', 'gyms.json');
const PROGRESS_PATH = path.join(__dirname, '..', 'data', 'match-progress.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function loadProgress() {
  try { return new Set(JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'))); }
  catch { return new Set(); }
}
function saveProgress(done) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify([...done], null, 2));
}

async function suggest(phrase) {
  const url = `https://www.firmy.cz/suggest?phrase=${encodeURIComponent(phrase)}&highlight=0&count=5`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.firmy.cz/',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.result || []).filter(r => r.category === 'premise');
}

function scoreMatch(gym, item) {
  const gymName = normalize(gym.name);
  const gymCity = normalize(gym.city);
  const itemName = normalize(item.sentence || '');
  const itemLoc = normalize(item.userData?.loc || '');

  let score = 0;
  // Name similarity
  if (itemName === gymName) score += 10;
  else if (itemName.includes(gymName) || gymName.includes(itemName)) score += 5;
  else {
    // Word overlap
    const gymWords = gymName.split(/\s+/).filter(w => w.length > 3);
    const overlap = gymWords.filter(w => itemName.includes(w)).length;
    score += overlap * 2;
  }
  // City match
  if (itemLoc.includes(gymCity)) score += 5;

  return score;
}

// ── main ─────────────────────────────────────────────────────────────────────

const gyms = JSON.parse(fs.readFileSync(GYMS_PATH, 'utf8'));
const done = loadProgress();

// Only process OSM records without detail_url
const candidates = gyms.filter(g => !g.detail_url && g.name && g.city);
const toProcess = candidates.filter(g => {
  const key = `${normalize(g.name)}|${normalize(g.city)}`;
  return !done.has(key);
});

console.log(`Candidates (no detail_url): ${candidates.length}`);
console.log(`Already processed: ${done.size}`);
console.log(`To process: ${toProcess.length}\n`);

let matched = 0, noMatch = 0, failed = 0;

for (let i = 0; i < toProcess.length; i++) {
  const gym = toProcess[i];
  const key = `${normalize(gym.name)}|${normalize(gym.city)}`;

  let results = [];
  try {
    results = await suggest(`${gym.name} ${gym.city}`);
  } catch {
    // Retry once
    try {
      await sleep(2000);
      results = await suggest(`${gym.name} ${gym.city}`);
    } catch {
      failed++;
      done.add(key);
      if ((i + 1) % 100 === 0) saveProgress(done);
      await sleep(600);
      continue;
    }
  }

  // Score each result and pick best match (must score > 4 to avoid false positives)
  let best = null;
  let bestScore = 4;
  for (const item of results) {
    const score = scoreMatch(gym, item);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (best) {
    const id = best.userData?.id;
    const seoName = best.userData?.seo_name;
    if (id && seoName) {
      gym.detail_url = `https://www.firmy.cz/detail/${id}-${seoName}.html`;
      matched++;
    } else {
      noMatch++;
    }
  } else {
    noMatch++;
  }

  done.add(key);

  const total = i + 1;
  if (total % 50 === 0 || total === toProcess.length) {
    const pct = ((total / toProcess.length) * 100).toFixed(1);
    process.stdout.write(`\r[${total}/${toProcess.length}] ${pct}% | matched: ${matched} | no_match: ${noMatch} | failed: ${failed}   `);
    fs.writeFileSync(GYMS_PATH, JSON.stringify(gyms, null, 2), 'utf8');
    saveProgress(done);
  }

  await sleep(550);
}

fs.writeFileSync(GYMS_PATH, JSON.stringify(gyms, null, 2), 'utf8');
saveProgress(done);

console.log(`\n\nDone. Matched: ${matched} | No match: ${noMatch} | Failed: ${failed}`);
console.log(`Total with detail_url now: ${gyms.filter(g => g.detail_url).length}`);
