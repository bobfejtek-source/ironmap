// scripts/cleanup-db.js — pre-deployment DB cleanup
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const c = await pool.connect();
  let totalRemoved = 0;

  // ── 1. Duplicates (same name + city, keep lowest id) ──────────────────────
  const { rows: dupGroups } = await c.query(`
    SELECT array_agg(id ORDER BY id) as ids, name, city, COUNT(*) as cnt
    FROM gyms WHERE name != 'Unnamed Gym'
    GROUP BY name, city HAVING COUNT(*) > 1
  `);

  const dupIdsToRemove = [];
  for (const g of dupGroups) {
    dupIdsToRemove.push(...g.ids.slice(1)); // keep first (lowest), remove rest
  }

  if (dupIdsToRemove.length) {
    await c.query(`DELETE FROM gyms WHERE id = ANY($1)`, [dupIdsToRemove]);
    console.log(`✓ Removed ${dupIdsToRemove.length} duplicate rows (${dupGroups.length} groups)`);
    totalRemoved += dupIdsToRemove.length;
  }

  // ── 2. Confirmed non-gyms (identified from AI descriptions) ───────────────
  // These have descriptions clearly showing they are not fitness facilities
  const nonGymIds = [
    44,   // Rodinne centrum Honzik — preschool/daycare
    55,   // Oasis City — kosmetický/kadeřnický salón
    56,   // Gymnázium Špitálská — high school (not public gym)
    129,  // Jatomi — construction/machinery company
    213,  // Mat-Fit — motorcycle shop
    527,  // Gymnázium Jeseník — high school
    573,  // Santos — burger restaurant
    606,  // Bors Břeclav — car rental (Renault)
  ];

  const { rowCount: nonGymRemoved } = await c.query(
    `DELETE FROM gyms WHERE id = ANY($1)`, [nonGymIds]
  );
  console.log(`✓ Removed ${nonGymRemoved} confirmed non-gym entries`);
  totalRemoved += nonGymRemoved;

  // ── 3. Unnamed gyms ────────────────────────────────────────────────────────
  const { rowCount: unnamedRemoved } = await c.query(
    `DELETE FROM gyms WHERE name = 'Unnamed Gym' OR name IS NULL OR trim(name) = ''`
  );
  console.log(`✓ Removed ${unnamedRemoved} unnamed gym entries`);
  totalRemoved += unnamedRemoved;

  // ── 4. Final counts ────────────────────────────────────────────────────────
  const { rows: finalCount } = await c.query(`SELECT COUNT(*) FROM gyms`);
  const { rows: catDist } = await c.query(
    `SELECT category, COUNT(*) FROM gyms GROUP BY category ORDER BY count DESC`
  );

  console.log(`\n✅ Total removed: ${totalRemoved}`);
  console.log(`   Remaining gyms: ${finalCount[0].count}`);
  console.log(`\nCategory distribution:`);
  for (const r of catDist) {
    console.log(`  ${(r.category || 'NULL').padEnd(20)} ${r.count}`);
  }

  c.release();
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
