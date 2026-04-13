#!/usr/bin/env node
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const client = new Client({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows } = await client.query(`
  SELECT id, name, city, category, discovery_source, rating,
    CASE
      WHEN name ILIKE '%trenér%' OR name ILIKE '%trener%' OR name ILIKE '%masér%'
           OR name ILIKE '%lektor%' OR name ILIKE 'Coach %' OR name ILIKE 'Lekce %'
           OR name ILIKE '%personal trainer%' THEN 'trener/lektor'
      WHEN name ILIKE '%workout hřiště%' OR name ILIKE '%workoutové hřiště%'
           OR name ILIKE '%venkovní posilovna%' OR name ILIKE 'Fit stezka%'
           OR name ILIKE '%lesní posilovna%' THEN 'outdoor/hriste'
      WHEN name ILIKE '%bazén%' OR name ILIKE '%aquapark%' OR name ILIKE '%koupaliště%'
           OR name ILIKE '%plovárna%' THEN 'bazen/aquapark'
      WHEN name ILIKE 'Sokol %' OR name ILIKE '%tělocvična%' THEN 'sokol/telocvicna'
      WHEN name ~* E'^[A-Z\\u00C0-\\u017E][a-z\\u00C0-\\u017E]+ [A-Z\\u00C0-\\u017E][a-z\\u00C0-\\u017E]+(ov\\u00E1|ova)$'
           THEN 'osobni-jmeno-ova'
      ELSE 'ostatni'
    END AS reason
  FROM gyms
  WHERE staging = false AND (
    name ILIKE '%trenér%' OR name ILIKE '%trener%' OR name ILIKE '%masér%'
    OR name ILIKE '%lektor%' OR name ILIKE 'Coach %' OR name ILIKE 'Lekce %'
    OR name ILIKE '%workout hřiště%' OR name ILIKE '%workoutové hřiště%'
    OR name ILIKE '%venkovní posilovna%' OR name ILIKE 'Fit stezka%'
    OR name ILIKE '%bazén%' OR name ILIKE '%aquapark%' OR name ILIKE '%koupaliště%'
    OR name ILIKE '%plovárna%'
    OR name ILIKE 'Sokol %' OR name ILIKE '%tělocvična%'
    OR name ~* E'^[A-Z\\u00C0-\\u017E][a-z\\u00C0-\\u017E]+ [A-Z\\u00C0-\\u017E][a-z\\u00C0-\\u017E]+(ov\\u00E1|ova)$'
  )
  ORDER BY reason, city, name
`);

const esc = v => v == null ? '' : String(v).replace(/"/g, '""');
const lines = ['id,name,city,category,discovery_source,rating,reason'];
for (const r of rows) {
  lines.push(`${r.id},"${esc(r.name)}","${esc(r.city)}","${esc(r.category ?? '')}",${esc(r.discovery_source ?? '')},${r.rating ?? ''},${r.reason}`);
}
fs.writeFileSync('scripts/staging-review.csv', lines.join('\n'), 'utf8');
console.log(`CSV: ${rows.length} položek → scripts/staging-review.csv`);

const counts = {};
rows.forEach(r => { counts[r.reason] = (counts[r.reason] ?? 0) + 1; });
Object.entries(counts).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));
