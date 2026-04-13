#!/usr/bin/env node
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const client = new Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rowCount } = await client.query(`
  UPDATE gyms SET staging = true
  WHERE staging = false AND name != 'Unnamed Gym'
    AND id NOT IN (
      SELECT id FROM gyms WHERE staging = false AND name != 'Unnamed Gym' AND (
        name ILIKE '%gym%'
        OR name ILIKE '%fitness%'
        OR name ILIKE '%posilovna%'
        OR name ILIKE '%crossfit%'
        OR name ILIKE '%workout%'
        OR name ILIKE '%strength%'
        OR name ILIKE '%jóga studio%' OR name ILIKE '%yoga studio%'
        OR name ILIKE '%pilates studio%'
        OR name ILIKE '%bazén%' OR name ILIKE '%aquapark%'
        OR rating_count >= 20
        OR (discovery_source = 'osm' AND rating_count >= 10)
        OR (multisport = true AND rating_count >= 10)
        OR (discovery_source = 'multisport' AND category IN ('Posilovna','CrossFit','Bazén') AND rating_count >= 5)
      )
    )
`);

const { rows: [{ n }] } = await client.query(
  "SELECT COUNT(*)::int AS n FROM gyms WHERE staging = false AND name != 'Unnamed Gym'"
);

console.log(`Moved to staging: ${rowCount}`);
console.log(`Live gyms remaining: ${n}`);

await client.end();
