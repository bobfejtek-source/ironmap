/**
 * Forward-geocode gyms that have an address but no coordinates.
 * Uses Nominatim (1 req/sec).
 * Writes results back to gyms.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GYMS_PATH = path.join(__dirname, '..', 'gyms.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=cz`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Gymie/1.0 (Czech gym directory; geocoding)', Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
}

const gyms = JSON.parse(fs.readFileSync(GYMS_PATH, 'utf8'));
const toGeocode = gyms.filter(g => !g.coordinates && g.address && g.city);

console.log(`To geocode: ${toGeocode.length}`);

let found = 0, failed = 0;

for (let i = 0; i < toGeocode.length; i++) {
  const gym = toGeocode[i];

  // Try full address first, then just name+city
  const queries = [
    `${gym.address}, Česká republika`,
    `${gym.name}, ${gym.city}, Česká republika`,
    `${gym.city}, Česká republika`,
  ];

  let coords = null;
  for (const q of queries) {
    try {
      coords = await geocode(q);
      if (coords) break;
    } catch {}
    await sleep(1100);
  }

  if (coords) {
    gym.coordinates = coords;
    found++;
  } else {
    failed++;
  }

  const done = i + 1;
  if (done % 25 === 0 || done === toGeocode.length) {
    const pct = ((done / toGeocode.length) * 100).toFixed(1);
    process.stdout.write(`\r[${done}/${toGeocode.length}] ${pct}% | found: ${found} | failed: ${failed}   `);
    fs.writeFileSync(GYMS_PATH, JSON.stringify(gyms, null, 2), 'utf8');
  }

  if (i < toGeocode.length - 1) await sleep(1100);
}

fs.writeFileSync(GYMS_PATH, JSON.stringify(gyms, null, 2), 'utf8');
console.log(`\n\nDone. Geocoded: ${found}, Failed: ${failed}`);
console.log(`Still no coords: ${gyms.filter(g => !g.coordinates).length}`);
