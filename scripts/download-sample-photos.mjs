#!/usr/bin/env node
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import https from 'https';

const { Client } = pg;
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const OUT_DIR = path.join(process.cwd(), 'scripts', 'sample-photos');
fs.mkdirSync(OUT_DIR, { recursive: true });

const client = new Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows } = await client.query(`
  SELECT id, name, city, rating, rating_count, photos
  FROM gyms
  WHERE photos IS NOT NULL
    AND photos != '[]'
    AND staging = false
    AND rating >= 4.5
    AND rating_count >= 50
  ORDER BY rating DESC, rating_count DESC
  LIMIT 5
`);

console.log('\nSelected gyms:');
rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.name} (${r.city}) — ⭐ ${r.rating} (${r.rating_count} reviews)`));

function fetchPhoto(ref) {
  return new Promise((resolve, reject) => {
    function get(url, redirects) {
      if (redirects > 10) return reject(new Error('Too many redirects'));
      https.get(url, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    }
    const url = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=800&key=${API_KEY}`;
    get(url, 0);
  });
}

const results = [];
let totalBytes = 0;

for (const gym of rows) {
  const refs = JSON.parse(gym.photos);
  const ref = refs[0];
  const safeName = gym.name.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40);
  const outPath = path.join(OUT_DIR, `${safeName}_${gym.id}.jpg`);

  try {
    process.stdout.write(`Downloading: ${gym.name}... `);
    const buffer = await fetchPhoto(ref);
    fs.writeFileSync(outPath, buffer);
    totalBytes += buffer.length;
    results.push({ gym: gym.name, city: gym.city, path: outPath, bytes: buffer.length });
    console.log(`✓ ${(buffer.length / 1024).toFixed(0)} KB`);
  } catch (err) {
    console.log(`✗ ${err.message}`);
  }
}

await client.end();

console.log('\n── Results ──');
results.forEach(r => {
  console.log(`  ${r.gym} (${r.city})`);
  console.log(`    ${r.path}`);
  console.log(`    ${(r.bytes / 1024).toFixed(0)} KB`);
});
console.log(`\n  Total downloaded: ${(totalBytes / 1024).toFixed(0)} KB`);
console.log(`  API cost: ${results.length} × $0.007 = $${(results.length * 0.007).toFixed(3)}`);
