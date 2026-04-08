// scripts/categorize.js — auto-categorize gyms by name + tags, store in DB
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });

function classify(name, tags) {
  const haystack = ((name ?? '') + ' ' + (tags ?? '')).toLowerCase();

  if (/crossfit|cross.?fit/.test(haystack)) return 'CrossFit';
  if (/jog[ay]|jóga|yoga/.test(haystack)) return 'Jóga';
  if (/pilates/.test(haystack)) return 'Pilates';
  if (/box(ing)?|muay|bjj|judo|karate|zápas|zapas|bojov/.test(haystack)) return 'Bojové sporty';
  if (/spinning|spin studio|cyklo/.test(haystack)) return 'Spinning';
  if (/bazén|bazen|plav|aqua|pool/.test(haystack)) return 'Bazén';
  if (/outdoor|park park|venkovní|venkovni/.test(haystack)) return 'Outdoor';
  return 'Posilovna';
}

async function run() {
  const client = await pool.connect();
  try {
    // Add column if needed
    await client.query(`ALTER TABLE gyms ADD COLUMN IF NOT EXISTS category TEXT`);
    console.log('✓ category column ready');

    const { rows: gyms } = await client.query(`SELECT id, name, tags FROM gyms WHERE name != 'Unnamed Gym'`);
    console.log(`Fetched ${gyms.length} gyms`);

    const counts = {};
    for (const gym of gyms) {
      const cat = classify(gym.name, gym.tags);
      counts[cat] = (counts[cat] ?? 0) + 1;
      await client.query(`UPDATE gyms SET category = $1 WHERE id = $2`, [cat, gym.id]);
    }

    console.log('\nResults:');
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    for (const [cat, n] of sorted) {
      console.log(`  ${cat.padEnd(20)} ${n}`);
    }
    console.log(`  ${'TOTAL'.padEnd(20)} ${gyms.length}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
