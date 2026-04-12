/**
 * Show 10 sample Praha gyms that pass ALL discover-places.mjs filters.
 * Also shows what the filters blocked. One-time diagnostic, not committed.
 */
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.local') });

const KEY = process.env.GOOGLE_PLACES_API_KEY;
const db  = new pg.Pool({ connectionString: process.env.POSTGRES_URL });
const { rows: existing } = await db.query(
  `SELECT id, name, city, coordinates, place_id FROM gyms WHERE city = 'Praha'`
);

// ── Same helpers as discover-places.mjs ───────────────────────────────────────

const LEGAL_SUFFIXES = /\b(s\.?\s*r\.?\s*o\.?|a\.?\s*s\.?|z\.?\s*s\.?|spol|ltd|gmbh|inc)\b/gi;
function normalizeName(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(LEGAL_SUFFIXES, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}
function lev(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}
function nameSim(a, b) {
  const na = normalizeName(a), nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const sh = na.length <= nb.length ? na : nb, lo = na.length <= nb.length ? nb : na;
  if (sh.length >= 9 && lo.includes(sh)) return 0.85;
  return 1 - lev(na, nb) / Math.max(na.length, nb.length, 1);
}
function parseCoords(raw) {
  try { const p = JSON.parse(raw); return { lat: parseFloat(p.lat), lng: parseFloat(p.lng ?? p.lon) }; }
  catch { return null; }
}
function haversine(a, b, c, d) {
  const R = 6371000, r = x => x * Math.PI / 180;
  const dl = r(c-a), dn = r(d-b);
  const q = Math.sin(dl/2)**2 + Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1-q));
}
function confidence(p) {
  return Math.round((
    (p.rating != null ? 0.4 : 0) +
    (Math.min((p.userRatingCount ?? 0) / 10, 1) * 0.3) +
    ((p.internationalPhoneNumber || p.websiteUri) ? 0.2 : 0) +
    (p.regularOpeningHours ? 0.1 : 0)
  ) * 100) / 100;
}
function isDup(place) {
  const pN = place.displayName?.text ?? '';
  const pLa = place.location?.latitude, pLn = place.location?.longitude;
  for (const g of existing) {
    if (g.place_id && g.place_id === place.id) return 'place_id match';
    if (g.city !== 'Praha') continue;
    const s = nameSim(pN, g.name);
    if (s >= 0.85) return `name_sim=${s.toFixed(2)} vs "${g.name}"`;
    if (s >= 0.65 && pLa && pLn) {
      const c = parseCoords(g.coordinates);
      if (c && haversine(pLa, pLn, c.lat, c.lng) < 150) return 'coord_proximity';
    }
  }
  return null;
}
function stripD(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

const EXCL_KW = [
  'základní škola','střední škola','gymnázium','fyzioterapie','fyzio','rehabilitace',
  'ordinace','poliklinika','nemocnice','zdravotní','terapie','lázně','lázn','termální',
  'balneo','aquapark','bazén','koupaliště','plovárna','e-shop','eshop','prodej',
  'sport shop','intersport','decathlon','hervis','hotel','resort','penzion','hostel',
  'solárium','solárn','tanning','kosmetik','restaur','kavárna','bar ','pub ','bistro',
  'pizz','bufet','bowling','shooting range','pumptrack','bmx ','cyklo','stolni tenis',
  'ping pong','table tennis','herna stolni','kanoe','kajak','veslař','kulturní dům',
  'kulturní centrum','dům kultury','centrum tance','taneční studio','taneční škola',
  'rc modell','model car','výběh pro psy','psí výběh','koňsk','equin','jezdecký',
  'jezdeck','stadion','stadión','aréna','festival','baráčnická','rychta','kiting',
  'kite surf','kite spot','tenisov','tenisové kurty','tenisový kurt',' kurty',
  'tenis areál','areal tenis','tenis a beach','tennis club','tennis court','ttc ',
  'fk ','fotbalový klub','hřiště','football field','skatepark','paintball','střelnice',
  'střelba','loděnice','dračí lodě','in-line','plážový','golf','házení sekery','psí ',
  'archery','lukostřelb',
];
const EXCL_TYPES = new Set([
  'lodging','hotel','motel','resort_hotel','sporting_goods_store','store','shopping_mall',
  'hospital','doctor','physiotherapist','dentist','school','university','spa','bar',
  'restaurant','food','cafe','night_club','bowling_alley','movie_theater','amusement_center',
  'golf_course','shooting_range','park','playground','stadium',
]);
const SPORTS_COMPLEX_ONLY = new Set(['sports_complex','recreation_center','health']);
const GYM_SIGNALS = [
  'fitness','gym','posilovna','fitko','crossfit','cross fit','pilates','yoga','joga',
  'workout','strength','bodybuilding','weight','muscle','iron','power','sport centrum',
  'sportcentrum','sportovni centrum','fit centrum','fitcentrum','wellness','box','boxing',
  'mma','judo','karate','bojov','martial','spinning','zumba','aerobik','cinka','cinkarna','silovn',
];

function isExcluded(place) {
  const raw   = (place.displayName?.text ?? '').toLowerCase();
  const name  = stripD(raw);
  const types = place.types ?? [];

  const badT = types.find(t => EXCL_TYPES.has(t));
  if (badT) return `type: ${badT}`;

  const badK = EXCL_KW.find(kw => name.includes(stripD(kw)));
  if (badK) return `keyword: "${badK}"`;

  const primary   = types.filter(t => SPORTS_COMPLEX_ONLY.has(t));
  const strongType = types.some(t => t === 'gym' || t === 'fitness_center' || t === 'yoga_studio');
  if (primary.length > 0 && !strongType) {
    if (!GYM_SIGNALS.some(s => name.includes(stripD(s))))
      return 'sports_complex without gym signal';
  }
  if (/^(sk|hc|fc|ac|mk|orel)\s+/i.test(raw)) {
    if (!GYM_SIGNALS.some(s => name.includes(stripD(s))))
      return `club prefix (${raw.split(' ')[0].toUpperCase()}) without gym signal`;
  }
  if (/^tenis\s+/i.test(raw)) {
    if (!GYM_SIGNALS.some(s => name.includes(stripD(s))))
      return 'tenis prefix without gym signal';
  }
  return null;
}

function passesQuality(p) {
  return p.rating != null || (p.internationalPhoneNumber || p.websiteUri) || (p.userRatingCount ?? 0) >= 3;
}

// ── Fetch from 7 grid points spread across Praha ──────────────────────────────

const FIELD_MASK = [
  'places.id','places.displayName','places.types','places.location',
  'places.formattedAddress','places.internationalPhoneNumber','places.websiteUri',
  'places.regularOpeningHours','places.rating','places.userRatingCount',
].join(',');

const GRID_POINTS = [
  { lat: 50.075, lng: 14.430, label: 'Nové Město / Vinohrady' },
  { lat: 50.105, lng: 14.450, label: 'Holešovice / Libeň' },
  { lat: 50.040, lng: 14.420, label: 'Nusle / Braník' },
  { lat: 50.085, lng: 14.500, label: 'Žižkov / Vršovice' },
  { lat: 50.100, lng: 14.370, label: 'Dejvice / Bubeneč' },
  { lat: 50.060, lng: 14.470, label: 'Nusle / Pankrác' },
  { lat: 50.108, lng: 14.574, label: 'Černý Most' },
];

const seen = new Set();
const samples = [];
const blocked = [];

for (const pt of GRID_POINTS) {
  if (samples.length >= 10) break;
  await new Promise(r => setTimeout(r, 130));

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': FIELD_MASK },
    body: JSON.stringify({
      includedTypes: ['gym', 'fitness_center', 'sports_complex', 'yoga_studio'],
      locationRestriction: { circle: { center: { latitude: pt.lat, longitude: pt.lng }, radius: 1000 } },
      maxResultCount: 20,
    }),
  });
  const places = (await res.json()).places ?? [];

  for (const p of places) {
    if (!p.id || seen.has(p.id)) continue;
    seen.add(p.id);

    const excl = isExcluded(p);
    if (excl) { blocked.push({ name: p.displayName?.text, reason: excl }); continue; }
    if (!passesQuality(p)) continue;
    const dup = isDup(p);
    if (dup) continue;

    if (samples.length < 10) samples.push({ ...p, _conf: confidence(p), _area: pt.label });
  }
}

// ── Print ─────────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(62));
console.log('  10 Praha gyms that pass ALL filters → WOULD BE INSERTED');
console.log('═'.repeat(62) + '\n');

samples.forEach((p, i) => {
  const c = p._conf;
  const decision = c >= 0.75 ? 'AUTO-PROMOTE' : 'manual review';
  const website  = p.websiteUri?.replace(/^https?:\/\//, '').split('/')[0] ?? '—';
  const hours    = p.regularOpeningHours?.weekdayDescriptions?.[0] ?? 'not listed';
  console.log(`${i + 1}. ${p.displayName?.text}`);
  console.log(`   Address:    ${p.formattedAddress ?? '—'}`);
  console.log(`   Rating:     ${p.rating ?? '—'} ★ (${p.userRatingCount ?? 0} reviews)`);
  console.log(`   Phone:      ${p.internationalPhoneNumber ?? '—'}`);
  console.log(`   Website:    ${website}`);
  console.log(`   Mon hours:  ${hours}`);
  console.log(`   Types:      ${(p.types ?? []).slice(0, 3).join(', ')}`);
  console.log(`   Confidence: ${c} → ${decision}`);
  console.log(`   Grid area:  ${p._area}`);
  console.log();
});

console.log('─'.repeat(62));
console.log(`  Examples of what the filters BLOCKED (${blocked.length} total from this sample)`);
console.log('─'.repeat(62));
blocked.slice(0, 8).forEach(b => console.log(`  ✗  ${b.name}\n     reason: ${b.reason}`));

await db.end();
