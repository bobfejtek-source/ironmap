#!/usr/bin/env node
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const client = new Client({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const SAFE_CTE = `
  WITH safe AS (
    SELECT id FROM gyms WHERE staging = false AND name != 'Unnamed Gym' AND (
      -- Jasné fitness klíčové slovo v názvu
      name ILIKE '%gym%'
      OR name ILIKE '%fitness%'
      OR name ILIKE '%posilovna%'
      OR name ILIKE '%crossfit%'
      OR name ILIKE '%workout%'
      OR name ILIKE '%strength%'
      OR name ILIKE '%jóga studio%' OR name ILIKE '%yoga studio%'
      OR name ILIKE '%pilates studio%'
      OR name ILIKE '%bazén%' OR name ILIKE '%aquapark%'
      -- Dostatek recenzí = reálné místo
      OR rating_count >= 20
      -- OSM s alespoň 10 recenzemi
      OR (discovery_source = 'osm' AND rating_count >= 10)
      -- MultiSport ověřený s recenzemi
      OR (multisport = true AND rating_count >= 10)
      -- MultiSport posilovna/crossfit/bazén s alespoň 5 recenzemi
      OR (discovery_source = 'multisport' AND category IN ('Posilovna','CrossFit','Bazén') AND rating_count >= 5)
    )
  )
`;

// Count safe vs stage
const { rows: [counts] } = await client.query(`
  ${SAFE_CTE}
  SELECT
    (SELECT COUNT(*) FROM safe) AS will_stay,
    (SELECT COUNT(*) FROM gyms WHERE staging = false AND name != 'Unnamed Gym') - (SELECT COUNT(*) FROM safe) AS will_stage
`);
console.log(`\nDRY RUN výsledky:`);
console.log(`  Zůstane live:    ${counts.will_stay}`);
console.log(`  Půjde do staging: ${counts.will_stage}`);

// 20 příkladů co půjde do staging
const { rows: examples } = await client.query(`
  ${SAFE_CTE}
  SELECT g.id, g.name, g.city, g.category, g.discovery_source, g.rating_count, g.multisport
  FROM gyms g
  WHERE g.staging = false
    AND g.name != 'Unnamed Gym'
    AND g.id NOT IN (SELECT id FROM safe)
  ORDER BY g.city, g.name
  LIMIT 20
`);
console.log(`\n20 příkladů co půjde do staging:`);
examples.forEach(r =>
  console.log(`  [${r.id}] "${r.name}" — ${r.city} | ${r.category} | ${r.discovery_source} | rc=${r.rating_count ?? 0} | ms=${r.multisport}`)
);

// Breakdown by reason why staged
const { rows: breakdown } = await client.query(`
  ${SAFE_CTE}
  SELECT
    CASE
      WHEN g.rating_count IS NULL OR g.rating_count = 0 THEN 'nulové recenze'
      WHEN g.rating_count < 5 THEN 'méně než 5 recenzí'
      WHEN g.rating_count < 10 THEN '5-9 recenzí'
      WHEN g.rating_count < 20 THEN '10-19 recenzí'
      ELSE '20+ recenzí (ale bez klíčového slova?)'
    END AS reason,
    COUNT(*) AS cnt
  FROM gyms g
  WHERE g.staging = false
    AND g.name != 'Unnamed Gym'
    AND g.id NOT IN (SELECT id FROM safe)
  GROUP BY 1 ORDER BY cnt DESC
`);
console.log(`\nBreakdown proč jdou do staging:`);
breakdown.forEach(r => console.log(`  ${r.reason}: ${r.cnt}`));

await client.end();
