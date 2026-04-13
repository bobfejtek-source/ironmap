#!/usr/bin/env node
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const client = new Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// ── ÚKOL 1: Osobní trenéři → staging ─────────────────────────────────────────
const trainerIds = [928, 812, 914, 1525, 804, 851, 709, 750, 738, 789, 737];
const { rowCount: staged1 } = await client.query(
  'UPDATE gyms SET staging = true WHERE id = ANY($1) AND staging = false',
  [trainerIds]
);
console.log(`ÚKOL 1 — Trenéři staging: ${staged1}/${trainerIds.length}`);

// ── ÚKOL 2: Překategorizace ───────────────────────────────────────────────────
const yogaIds = [2363, 2377, 1990, 2080, 2479, 1762, 1782, 2371, 2318, 2528, 2026, 2543, 1847, 2461, 2467, 2501];
const { rowCount: yoga } = await client.query(
  "UPDATE gyms SET category = 'Jóga' WHERE id = ANY($1)",
  [yogaIds]
);
console.log(`ÚKOL 2 — Jóga překategorizace: ${yoga}/${yogaIds.length}`);

const spinningIds = [2351, 1812, 1192];
const { rowCount: spinning } = await client.query(
  "UPDATE gyms SET category = 'Spinning' WHERE id = ANY($1)",
  [spinningIds]
);
console.log(`ÚKOL 2 — Spinning (Jumping): ${spinning}/${spinningIds.length}`);

const kluziste = [1487, 1087];
const { rowCount: staged2 } = await client.query(
  'UPDATE gyms SET staging = true WHERE id = ANY($1) AND staging = false',
  [kluziste]
);
console.log(`ÚKOL 2 — Kluziště staging: ${staged2}/${kluziste.length}`);

// ── ÚKOL 3: GPS + rating_count duplikáty ────────────────────────────────────
// Find pairs: same city, distance < 100m, same rating_count (not null), stage = false
const { rows: dupPairs } = await client.query(`
  SELECT
    a.id AS id_keep, a.name AS name_keep, a.discovery_source AS src_keep,
    b.id AS id_del,  b.name AS name_del,  b.discovery_source AS src_del,
    a.city,
    a.rating_count,
    round((
      6371000 * acos(LEAST(1.0,
        cos(radians((a.coordinates::json->>'lat')::float)) *
        cos(radians((b.coordinates::json->>'lat')::float)) *
        cos(radians((b.coordinates::json->>'lng')::float) - radians((a.coordinates::json->>'lng')::float)) +
        sin(radians((a.coordinates::json->>'lat')::float)) *
        sin(radians((b.coordinates::json->>'lat')::float))
      ))
    )::numeric, 0) AS dist_m
  FROM gyms a
  JOIN gyms b ON a.id < b.id
    AND a.city = b.city
    AND a.rating_count IS NOT NULL
    AND a.rating_count = b.rating_count
    AND a.staging = false AND b.staging = false
    AND a.coordinates IS NOT NULL AND b.coordinates IS NOT NULL
  WHERE (
    6371000 * acos(LEAST(1.0,
      cos(radians((a.coordinates::json->>'lat')::float)) *
      cos(radians((b.coordinates::json->>'lat')::float)) *
      cos(radians((b.coordinates::json->>'lng')::float) - radians((a.coordinates::json->>'lng')::float)) +
      sin(radians((a.coordinates::json->>'lat')::float)) *
      sin(radians((b.coordinates::json->>'lat')::float))
    ))
  ) < 100
  ORDER BY a.city, dist_m
`);

console.log(`\nÚKOL 3 — GPS+rating_count duplikáty nalezeno: ${dupPairs.length} párů`);
dupPairs.forEach(r =>
  console.log(`  KEEP[${r.id_keep}] "${r.name_keep}" (${r.src_keep}) | DEL[${r.id_del}] "${r.name_del}" (${r.src_del}) — ${r.city} ${r.dist_m}m rc=${r.rating_count}`)
);

const delIds = dupPairs.map(r => r.id_del);
let deleted = 0;
if (delIds.length > 0) {
  const { rowCount } = await client.query(
    'DELETE FROM gyms WHERE id = ANY($1)',
    [delIds]
  );
  deleted = rowCount;
}
console.log(`\nÚKOL 3 — Smazáno duplikátů: ${deleted}`);

// ── Finální počet ─────────────────────────────────────────────────────────────
const { rows: [{ n }] } = await client.query(
  "SELECT COUNT(*)::int AS n FROM gyms WHERE staging = false AND name != 'Unnamed Gym'"
);
console.log(`\n── Finální live gymů: ${n} ──`);
console.log(`   Staging celkem: ${staged1} + ${staged2} = ${staged1 + staged2}`);
console.log(`   Překategorizováno: ${yoga} jóga, ${spinning} spinning`);
console.log(`   Smazáno duplikátů: ${deleted}`);

await client.end();
