#!/usr/bin/env node
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const client = new Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// ── STAGING blacklist (ignoruje rating_count) ─────────────────────────────────
const { rowCount: s1 } = await client.query(`
  UPDATE gyms SET staging = true
  WHERE staging = false AND (
    name ILIKE '%trampolín%' OR name ILIKE '%trampolinov%' OR name ILIKE '%trampolin%'
    OR name ILIKE 'Cvičení s %' OR name ILIKE 'Cvičení se %' OR name ILIKE 'Cviceni s%'
    OR name ILIKE '%ekopark%' OR name ILIKE '%eko park%'
    OR name ILIKE '%lanové centrum%' OR name ILIKE '%lanový park%' OR name ILIKE '%lanov%park%'
    OR name ILIKE '%zábavní centrum%' OR name ILIKE '%zábavní park%'
    OR name ILIKE '%airsoft%' OR name ILIKE '%paintball%' OR name ILIKE '%laser game%' OR name ILIKE '%lasergame%'
    OR name ILIKE '%přírodní park%' OR name ILIKE '%nature park%'
    OR name ILIKE '%dětský klub%' OR name ILIKE '%dětské centrum%'
    OR name ILIKE '%jumping%' AND name NOT ILIKE '%fitness%' AND name NOT ILIKE '%gym%'
  )
`);
console.log(`Staging blacklist: ${s1}`);

// ── RECATEGORIZACE: Bojové sporty ─────────────────────────────────────────────
const { rowCount: r1 } = await client.query(`
  UPDATE gyms SET category = 'Bojové sporty'
  WHERE staging = false
    AND category != 'Bojové sporty'
    AND (
      name ILIKE '%fight club%' OR name ILIKE '%fight centre%' OR name ILIKE '%fight center%'
      OR name ILIKE '%fight gym%' OR name ILIKE '%fight sport%'
      OR name ILIKE '% MMA%' OR name ILIKE 'MMA %'
      OR name ILIKE '%kickbox%' OR name ILIKE '%kick-box%'
      OR name ILIKE '%box gym%' OR name ILIKE '%boxing gym%' OR name ILIKE '%boxárna%'
      OR name ILIKE '%dojo%'
      OR name ILIKE '%judo%' OR name ILIKE '%judo%'
      OR name ILIKE '%karate%'
      OR name ILIKE '%taekwondo%' OR name ILIKE '%tae kwon do%'
      OR name ILIKE '%bjj%' OR name ILIKE '%brazilian jiu%' OR name ILIKE '%jiu jitsu%' OR name ILIKE '%jiu-jitsu%'
      OR name ILIKE '%wrestl%'
      OR name ILIKE '%muay thai%'
      OR name ILIKE '%thaibox%' OR name ILIKE '%thai box%'
      OR name ILIKE '%aikido%'
      OR name ILIKE '%kung fu%' OR name ILIKE '%kung-fu%'
      OR name ILIKE '%box klub%' OR name ILIKE '%boxersk%'
    )
`);
console.log(`Recategorizace → Bojové sporty: ${r1}`);

// ── RECATEGORIZACE: Pilates ───────────────────────────────────────────────────
const { rowCount: r2 } = await client.query(`
  UPDATE gyms SET category = 'Pilates'
  WHERE staging = false
    AND category != 'Pilates'
    AND (
      name ILIKE '%pilates%'
    )
`);
console.log(`Recategorizace → Pilates: ${r2}`);

// ── RECATEGORIZACE: Jóga ──────────────────────────────────────────────────────
const { rowCount: r3 } = await client.query(`
  UPDATE gyms SET category = 'Jóga'
  WHERE staging = false
    AND category != 'Jóga'
    AND (
      name ILIKE '%jóga%' OR name ILIKE '%yoga%' OR name ILIKE '%joga%'
    )
    AND name NOT ILIKE '%pilates%'
`);
console.log(`Recategorizace → Jóga: ${r3}`);

// ── RECATEGORIZACE: Spinning ──────────────────────────────────────────────────
const { rowCount: r4 } = await client.query(`
  UPDATE gyms SET category = 'Spinning'
  WHERE staging = false
    AND category != 'Spinning'
    AND (
      name ILIKE '%spinning%' OR name ILIKE '%indoor cycling%' OR name ILIKE '%indoor bike%'
    )
`);
console.log(`Recategorizace → Spinning: ${r4}`);

// ── RECATEGORIZACE: CrossFit ──────────────────────────────────────────────────
const { rowCount: r5 } = await client.query(`
  UPDATE gyms SET category = 'CrossFit'
  WHERE staging = false
    AND category != 'CrossFit'
    AND (
      name ILIKE '%crossfit%' OR name ILIKE '%cross fit%'
    )
`);
console.log(`Recategorizace → CrossFit: ${r5}`);

// ── Finální počet ─────────────────────────────────────────────────────────────
const { rows: [{ live }] } = await client.query(
  "SELECT COUNT(*)::int AS live FROM gyms WHERE staging = false AND name != 'Unnamed Gym'"
);
const { rows: cats } = await client.query(`
  SELECT category, COUNT(*)::int AS cnt
  FROM gyms WHERE staging = false AND name != 'Unnamed Gym'
  GROUP BY category ORDER BY cnt DESC
`);

console.log(`\n── Finální stav ──`);
console.log(`Live gymů: ${live}`);
console.log(`Kategorie:`);
cats.forEach(r => console.log(`  ${r.category ?? 'NULL'}: ${r.cnt}`));

await client.end();
