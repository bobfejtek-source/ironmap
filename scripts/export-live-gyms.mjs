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
  SELECT id, name, city, category, discovery_source, rating, rating_count, multisport
  FROM gyms
  WHERE staging = false AND name != 'Unnamed Gym'
  ORDER BY city, name
`);

await client.end();

// CSV
const esc = v => v == null ? '' : String(v).replace(/"/g, '""');
const lines = ['id,name,city,category,discovery_source,rating,rating_count,multisport'];
for (const r of rows) {
  lines.push(`${r.id},"${esc(r.name)}","${esc(r.city)}","${esc(r.category ?? '')}",${r.discovery_source ?? ''},${r.rating ?? ''},${r.rating_count ?? ''},${r.multisport ?? ''}`);
}
fs.writeFileSync('scripts/live-gyms-export.csv', lines.join('\n'), 'utf8');
console.log(`Exported ${rows.length} live gyms → scripts/live-gyms-export.csv`);
