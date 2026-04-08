// scripts/categorize-ai.js
// Re-categorizes all gyms using claude-haiku-4-5 with name + description.
// Saves progress to scripts/categorize-progress.json so it can resume.
// Usage: node scripts/categorize-ai.js
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk').default;
const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = path.join(__dirname, 'categorize-progress.json');
const BATCH_SIZE = 50;
const VALID_CATEGORIES = new Set([
  'Posilovna', 'CrossFit', 'Jóga', 'Pilates',
  'Bojové sporty', 'Spinning', 'Bazén', 'Outdoor',
]);

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Progress helpers ────────────────────────────────────────────────────────

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch {
    return { processed: {} }; // { processed: { [gymId]: category } }
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ─── Classification ──────────────────────────────────────────────────────────

async function classify(name, description) {
  const prompt = `Classify this Czech fitness facility into exactly one category. Return only the category name, nothing else.
Categories: Posilovna, CrossFit, Jóga, Pilates, Bojové sporty, Spinning, Bazén, Outdoor
Name: ${name}
Description: ${description || '(no description)'}`;

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 20,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0].text.trim();
  // Exact match first, then case-insensitive fallback
  if (VALID_CATEGORIES.has(raw)) return raw;
  for (const cat of VALID_CATEGORIES) {
    if (cat.toLowerCase() === raw.toLowerCase()) return cat;
  }
  // If model returns garbage, default to Posilovna
  console.warn(`  ⚠ Unexpected response "${raw}" for "${name}" — defaulting to Posilovna`);
  return 'Posilovna';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY is not set in .env.local');
    process.exit(1);
  }

  const client = await pool.connect();
  let gyms;
  try {
    // Ensure column exists
    await client.query(`ALTER TABLE gyms ADD COLUMN IF NOT EXISTS category TEXT`);
    const { rows } = await client.query(
      `SELECT id, name, description FROM gyms WHERE name != 'Unnamed Gym' ORDER BY id`
    );
    gyms = rows;
  } finally {
    client.release();
  }

  console.log(`Total gyms: ${gyms.length}`);

  const progress = loadProgress();
  const alreadyDone = Object.keys(progress.processed).length;
  const todo = gyms.filter(g => !progress.processed[g.id]);

  console.log(`Already processed: ${alreadyDone} | Remaining: ${todo.length}`);
  if (todo.length === 0) {
    console.log('Nothing to do — all gyms already classified. Showing distribution:\n');
    printDistribution(progress.processed);
    await pool.end();
    return;
  }

  // Process in batches
  let done = 0;
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(todo.length / BATCH_SIZE);
    console.log(`\nBatch ${batchNum}/${totalBatches} (gyms ${i + 1}–${Math.min(i + BATCH_SIZE, todo.length)})`);

    // Process sequentially with delay to respect Tier 1 rate limits (50 req/min)
    const results = [];
    for (const gym of batch) {
      const cat = await classify(gym.name, gym.description);
      results.push({ id: gym.id, cat });
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, 1300)); // ~46 req/min, safe under 50
    }

    // Write results to DB and progress file
    const dbClient = await pool.connect();
    try {
      for (const { id, cat } of results) {
        await dbClient.query(`UPDATE gyms SET category = $1 WHERE id = $2`, [cat, id]);
        progress.processed[id] = cat;
        done++;
      }
    } finally {
      dbClient.release();
    }

    saveProgress(progress);
    console.log(`  ✓ Saved. Total processed: ${alreadyDone + done}/${gyms.length}`);
  }

  console.log('\n✅ Done! Category distribution:\n');
  printDistribution(progress.processed);

  // Clean up progress file on full completion
  if (Object.keys(progress.processed).length >= gyms.length) {
    fs.unlinkSync(PROGRESS_FILE);
    console.log('\n(Progress file removed — all gyms classified.)');
  }

  await pool.end();
}

function printDistribution(processed) {
  const counts = {};
  for (const cat of Object.values(processed)) {
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, n]) => s + n, 0);
  for (const [cat, n] of sorted) {
    const bar = '█'.repeat(Math.round(n / total * 40));
    console.log(`  ${cat.padEnd(18)} ${String(n).padStart(4)}  ${bar}`);
  }
  console.log(`  ${'TOTAL'.padEnd(18)} ${String(total).padStart(4)}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
