import { getUserCheckins, awardBadge } from './db-users';
import { sql } from './postgres';
import type { CheckinRow } from './db-users';

// ─── Badge definitions ────────────────────────────────────────────────────────

export type BadgeCategory =
  | 'start'
  | 'beginner'
  | 'explorer'
  | 'grinder'
  | 'time'
  | 'community'
  | 'special'
  | 'spring'
  | 'summer';

export type BadgeDef = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: BadgeCategory;
  /** For count-based badges — target number shown in progress bar */
  target?: number;
  /** Which stat drives the progress number (defaults to total check-in count) */
  progressKey?: 'checkins' | 'cities' | 'weekend' | 'custom';
  /** Community badges — awarded externally, not via check-in evaluation */
  manual?: boolean;
};

export const BADGE_DEFS: BadgeDef[] = [
  // ── Start ──────────────────────────────────────────────────────────────────
  { id: 'prvni_krok', name: 'První krok', desc: 'První check-in vůbec', icon: '🔥', category: 'start', target: 1, progressKey: 'checkins' },

  // ── Beginner ───────────────────────────────────────────────────────────────
  { id: 'dvojka', name: 'Dvojka', desc: '2 check-iny celkem', icon: '✌️', category: 'beginner', target: 2, progressKey: 'checkins' },
  { id: 'tydenny_streak', name: 'Týdenní streak', desc: '7 po sobě jdoucích dní s check-inem', icon: '📅', category: 'beginner' },
  { id: 'mesicni_clen', name: 'Měsíční člen', desc: '30 check-inů celkem', icon: '🗓️', category: 'beginner', target: 30, progressKey: 'checkins' },

  // ── Explorer ───────────────────────────────────────────────────────────────
  { id: 'nomad', name: 'Nomád', desc: 'Gymy ve 3 různých městech', icon: '🌍', category: 'explorer', target: 3, progressKey: 'cities' },
  { id: 'prazsky_pruzkumnik', name: 'Pražský průzkumník', desc: '5 různých gymů v Praze', icon: '🗺️', category: 'explorer' },
  { id: 'brnak', name: 'Brnák', desc: '3 různé gymy v Brně', icon: '🏙️', category: 'explorer' },
  { id: 'cestovatel', name: 'Cestovatel', desc: 'Gymy v 5+ různých městech', icon: '🧳', category: 'explorer', target: 5, progressKey: 'cities' },
  { id: 'objel_republiku', name: 'Objel republiku', desc: 'Gymy v 8+ různých krajích ČR', icon: '🇨🇿', category: 'explorer' },

  // ── Grinder ────────────────────────────────────────────────────────────────
  { id: 'iron_man', name: 'Iron Man', desc: '50 check-inů celkem', icon: '⚡', category: 'grinder', target: 50, progressKey: 'checkins' },
  { id: 'centurion', name: 'Centurion', desc: '100 check-inů celkem', icon: '💯', category: 'grinder', target: 100, progressKey: 'checkins' },
  { id: 'legenda', name: 'Legenda', desc: '365 check-inů celkem', icon: '👑', category: 'grinder', target: 365, progressKey: 'checkins' },

  // ── Time-based ─────────────────────────────────────────────────────────────
  { id: 'rarni_ptace', name: 'Ranní ptáče', desc: 'Check-in před 7:00', icon: '🌅', category: 'time' },
  { id: 'nocni_sova', name: 'Noční sova', desc: 'Check-in po 21:00', icon: '🦉', category: 'time' },
  { id: 'vikendovy_valecnik', name: 'Víkendový válečník', desc: '5 check-inů o víkendu', icon: '⚔️', category: 'time', target: 5, progressKey: 'weekend' },
  { id: 'vanocni_dric', name: 'Vánoční dřič', desc: 'Check-in 25. prosince', icon: '🎄', category: 'time' },

  // ── Community ──────────────────────────────────────────────────────────────
  { id: 'fotograf', name: 'Fotograf', desc: 'Nahraj první fotografii z gymu', icon: '📸', category: 'community', manual: true },
  { id: 'ambasador', name: 'Ambasador', desc: 'Přidej první nový gym do databáze', icon: '📢', category: 'community', manual: true },
  { id: 'pomocnik', name: 'Pomocník', desc: 'Doplň informace o gymu', icon: '🤝', category: 'community', manual: true },

  // ── Special ────────────────────────────────────────────────────────────────
  { id: 'plzenak', name: 'Plzeňák', desc: 'Check-in v Plzni', icon: '🍺', category: 'special' },
  { id: 'verny', name: 'Věrný', desc: '3 check-iny ve stejném gymu', icon: '❤️', category: 'special' },
  { id: 'fitko_hopper', name: 'Fitko hopper', desc: '5 různých gymů v jednom týdnu', icon: '🏃', category: 'special' },
  { id: 'sberatel', name: 'Sběratel', desc: 'Check-in ve všech 6 kategoriích', icon: '🎯', category: 'special' },

  // ── Spring ─────────────────────────────────────────────────────────────────
  { id: 'jarni_probuzeni', name: 'Jarní probuzení', desc: 'První check-in v březnu, dubnu nebo květnu', icon: '🌸', category: 'spring' },
  { id: 'jarni_vyzva', name: 'Jarní výzva', desc: '10 check-inů během dubna', icon: '🌻', category: 'spring', target: 10 },

  // ── Summer ─────────────────────────────────────────────────────────────────
  { id: 'letni_bojovnik', name: 'Letní bojovník', desc: '15 check-inů během července nebo srpna', icon: '☀️', category: 'summer', target: 15 },
  { id: 'gym_nomad', name: 'Gym Nomad', desc: 'Check-iny ve 3+ městech během července a srpna', icon: '🌊', category: 'summer' },
  { id: 'nepreruzena_leta', name: 'Nepřerušená léta', desc: 'Alespoň jeden check-in každý týden v červenci a srpnu', icon: '🔗', category: 'summer' },
  { id: 'horko_nevadi', name: 'Horko nevadí', desc: 'Check-in ve dne, kdy bylo nad 30 °C', icon: '🌡️', category: 'summer' },
];

export type BadgeId = (typeof BADGE_DEFS)[number]['id'];

// ─── Category labels ──────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  start: 'Start',
  beginner: 'Začátečník',
  explorer: 'Průzkumník',
  grinder: 'Grinder',
  time: 'Časové výzvy',
  community: 'Komunita',
  special: 'Speciální',
  spring: 'Jaro',
  summer: 'Léto',
};

// ─── Region mapping ───────────────────────────────────────────────────────────

const CITY_REGION: Record<string, string> = {
  Praha: 'Praha',
  Brno: 'Jihomoravský', Blansko: 'Jihomoravský', Hodonín: 'Jihomoravský', Znojmo: 'Jihomoravský',
  Břeclav: 'Jihomoravský', Vyškov: 'Jihomoravský', 'Hustopeče': 'Jihomoravský',
  Ostrava: 'Moravskoslezský', Opava: 'Moravskoslezský', Havířov: 'Moravskoslezský',
  Karviná: 'Moravskoslezský', Frýdek: 'Moravskoslezský', Třinec: 'Moravskoslezský',
  Nový: 'Moravskoslezský', Kopřivnice: 'Moravskoslezský', Orlová: 'Moravskoslezský',
  Olomouc: 'Olomoucký', Přerov: 'Olomoucký', Šumperk: 'Olomoucký', Prostějov: 'Olomoucký',
  Jeseník: 'Olomoucký', Zábřeh: 'Olomoucký',
  Zlín: 'Zlínský', Uherské: 'Zlínský', Kroměříž: 'Zlínský', Vsetín: 'Zlínský',
  'Uherský Brod': 'Zlínský', 'Uherské Hradiště': 'Zlínský',
  Plzeň: 'Plzeňský', Rokycany: 'Plzeňský', Klatovy: 'Plzeňský', Domažlice: 'Plzeňský',
  Tachov: 'Plzeňský', 'Český Krumlov': 'Jihočeský',
  'České Budějovice': 'Jihočeský', Písek: 'Jihočeský', Tábor: 'Jihočeský',
  Strakonice: 'Jihočeský', Prachatice: 'Jihočeský', Jindřichův: 'Jihočeský',
  Liberec: 'Liberecký', Jablonec: 'Liberecký', Česká: 'Liberecký', Semily: 'Liberecký',
  'Hradec Králové': 'Královéhradecký', Náchod: 'Královéhradecký', Trutnov: 'Královéhradecký',
  'Rychnov nad Kněžnou': 'Královéhradecký', Jičín: 'Královéhradecký',
  Pardubice: 'Pardubický', Chrudim: 'Pardubický', 'Svitavy': 'Pardubický',
  'Ústí nad Orlicí': 'Pardubický',
  Jihlava: 'Vysočina', Třebíč: 'Vysočina', 'Havlíčkův Brod': 'Vysočina',
  Pelhřimov: 'Vysočina', Žďár: 'Vysočina',
  Kladno: 'Středočeský', Mladá: 'Středočeský', Kolín: 'Středočeský',
  Příbram: 'Středočeský', Benešov: 'Středočeský', Beroun: 'Středočeský',
  Rakovník: 'Středočeský', Kutná: 'Středočeský', Nymburk: 'Středočeský',
  'Ústí nad Labem': 'Ústecký', Most: 'Ústecký', Chomutov: 'Ústecký',
  Teplice: 'Ústecký', Litoměřice: 'Ústecký', Louny: 'Ústecký', Děčín: 'Ústecký',
  'Karlovy Vary': 'Karlovarský', Cheb: 'Karlovarský', Sokolov: 'Karlovarský',
};

function getRegion(city: string | null): string | null {
  if (!city) return null;
  // Try exact match first, then prefix match
  if (CITY_REGION[city]) return CITY_REGION[city];
  const key = Object.keys(CITY_REGION).find((k) => city.startsWith(k) || k.startsWith(city.split(' ')[0]));
  return key ? CITY_REGION[key] : null;
}

// ─── Helper: detect category from gym name + tags ─────────────────────────────

function gymCategory(row: CheckinRow): string {
  const n = (row.gym_name ?? '').toLowerCase();
  const tags = (row.gym_tags ?? '').toLowerCase();
  const combined = n + ' ' + tags;
  if (combined.includes('crossfit')) return 'CrossFit';
  if (combined.includes('yoga') || combined.includes('jóga')) return 'Jóga';
  if (combined.includes('pilates')) return 'Pilates';
  if (combined.includes('spinning')) return 'Spinning';
  if (combined.includes('box') || combined.includes('mma') || combined.includes('bjj') ||
      combined.includes('bojov') || combined.includes('judo') || combined.includes('karate')) return 'Bojové sporty';
  if (combined.includes('outdoor') || combined.includes('venkovní')) return 'Outdoor';
  return 'Posilovna';
}

// ─── Helper: Prague time hour ─────────────────────────────────────────────────

function pragueHour(date: Date): number {
  const offset = isDST(date) ? 2 : 1;
  return (date.getUTCHours() + offset) % 24;
}

function isDST(date: Date): boolean {
  const m = date.getUTCMonth() + 1;
  if (m > 3 && m < 10) return true;
  if (m < 3 || m > 10) return false;
  return date.getUTCDate() >= 25;
}

// ─── Helper: ISO week key "YYYY-Www" ─────────────────────────────────────────

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// ─── Helper: consecutive days streak ─────────────────────────────────────────

function maxConsecutiveDays(checkins: CheckinRow[]): number {
  if (!checkins.length) return 0;
  const dates = Array.from(
    new Set(checkins.map((c) => new Date(c.checked_in_at).toISOString().split('T')[0]))
  ).sort();
  let best = 1, cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]).getTime();
    const curr = new Date(dates[i]).getTime();
    if ((curr - prev) / 86400000 === 1) { cur++; best = Math.max(best, cur); }
    else cur = 1;
  }
  return best;
}

// ─── Helper: weather via open-meteo (no key needed) ──────────────────────────

export async function fetchMaxTempCelsius(lat: number, lng: number): Promise<number | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max&timezone=Europe%2FPrague&forecast_days=1`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json() as { daily?: { temperature_2m_max?: number[] } };
    return data.daily?.temperature_2m_max?.[0] ?? null;
  } catch {
    return null;
  }
}

// ─── Progress computation (for BadgeGrid display) ─────────────────────────────

export type BadgeProgressMap = Record<string, { current: number; target: number }>;

export function computeProgress(checkins: CheckinRow[]): BadgeProgressMap {
  const total = checkins.length;
  const cities = new Set(checkins.map((c) => c.gym_city).filter(Boolean)).size;
  const weekendCount = checkins.filter((c) => {
    const d = new Date(c.checked_in_at).getDay();
    return d === 0 || d === 6;
  }).length;

  // April checkins this year
  const thisYear = new Date().getFullYear();
  const aprilCheckins = checkins.filter((c) => {
    const d = new Date(c.checked_in_at);
    return d.getFullYear() === thisYear && d.getMonth() === 3;
  }).length;

  // Summer (Jul+Aug this year)
  const summerCheckins = checkins.filter((c) => {
    const d = new Date(c.checked_in_at);
    return d.getFullYear() === thisYear && (d.getMonth() === 6 || d.getMonth() === 7);
  }).length;

  return {
    prvni_krok:        { current: Math.min(total, 1), target: 1 },
    dvojka:            { current: Math.min(total, 2), target: 2 },
    mesicni_clen:      { current: Math.min(total, 30), target: 30 },
    iron_man:          { current: Math.min(total, 50), target: 50 },
    centurion:         { current: Math.min(total, 100), target: 100 },
    legenda:           { current: Math.min(total, 365), target: 365 },
    nomad:             { current: Math.min(cities, 3), target: 3 },
    cestovatel:        { current: Math.min(cities, 5), target: 5 },
    vikendovy_valecnik:{ current: Math.min(weekendCount, 5), target: 5 },
    jarni_vyzva:       { current: Math.min(aprilCheckins, 10), target: 10 },
    letni_bojovnik:    { current: Math.min(summerCheckins, 15), target: 15 },
  };
}

// ─── Main evaluation ──────────────────────────────────────────────────────────

export interface CheckinContext {
  /** Max temperature today at gym location (°C), fetched from open-meteo */
  maxTempC?: number | null;
}

export async function evaluateBadges(
  userId: number,
  ctx: CheckinContext = {},
): Promise<BadgeId[]> {
  const checkins = await getUserCheckins(userId);
  const existingRows = await sql`SELECT badge_type FROM badges WHERE user_id = ${userId}`;
  const earned = new Set(existingRows.map((r) => r.badge_type as string));
  const newBadges: BadgeId[] = [];

  async function give(id: BadgeId) {
    if (!earned.has(id)) {
      const ok = await awardBadge(userId, id);
      if (ok) { newBadges.push(id); earned.add(id); }
    }
  }

  const total = checkins.length;
  if (!total) return newBadges;

  const latest = new Date(checkins[0].checked_in_at);
  const latestMonth = latest.getMonth() + 1;   // 1-12
  const latestDay   = latest.getDate();
  const latestYear  = latest.getFullYear();
  const latestHour  = pragueHour(latest);

  // ── Start ──
  if (total >= 1) await give('prvni_krok');

  // ── Beginner ──
  if (total >= 2)  await give('dvojka');
  if (total >= 30) await give('mesicni_clen');
  if (maxConsecutiveDays(checkins) >= 7) await give('tydenny_streak');

  // ── Grinder ──
  if (total >= 50)  await give('iron_man');
  if (total >= 100) await give('centurion');
  if (total >= 365) await give('legenda');

  // ── Time-based ──
  if (latestHour < 7)  await give('rarni_ptace');
  if (latestHour >= 21) await give('nocni_sova');
  if (latestMonth === 12 && latestDay === 25) await give('vanocni_dric');

  const weekendCheckins = checkins.filter((c) => {
    const d = new Date(c.checked_in_at).getDay();
    return d === 0 || d === 6;
  }).length;
  if (weekendCheckins >= 5) await give('vikendovy_valecnik');

  // ── Cities / Explorer ──
  const cities = new Set(checkins.map((c) => c.gym_city).filter(Boolean));
  if (cities.size >= 3) await give('nomad');
  if (cities.size >= 5) await give('cestovatel');

  const pragueGyms = new Set(
    checkins.filter((c) => c.gym_city === 'Praha').map((c) => c.gym_id),
  );
  if (pragueGyms.size >= 5) await give('prazsky_pruzkumnik');

  const brnoGyms = new Set(
    checkins.filter((c) => c.gym_city === 'Brno').map((c) => c.gym_id),
  );
  if (brnoGyms.size >= 3) await give('brnak');

  const regions = new Set(
    checkins.map((c) => getRegion(c.gym_city)).filter(Boolean),
  );
  if (regions.size >= 8) await give('objel_republiku');

  // ── Special ──
  if (checkins.some((c) => c.gym_city === 'Plzeň' || c.gym_city === 'Plzen')) await give('plzenak');

  // Věrný — 3+ check-ins at same gym
  const gymCounts = new Map<string, number>();
  for (const c of checkins) gymCounts.set(c.gym_id, (gymCounts.get(c.gym_id) ?? 0) + 1);
  if (Array.from(gymCounts.values()).some((n) => n >= 3)) await give('verny');

  // Fitko hopper — 5 different gyms in one ISO week
  const weekGyms = new Map<string, Set<string>>();
  for (const c of checkins) {
    const wk = isoWeekKey(new Date(c.checked_in_at));
    if (!weekGyms.has(wk)) weekGyms.set(wk, new Set());
    weekGyms.get(wk)!.add(c.gym_id);
  }
  if (Array.from(weekGyms.values()).some((s) => s.size >= 5)) await give('fitko_hopper');

  // Sběratel — all 6 required categories
  const REQUIRED_CATS = ['Posilovna', 'CrossFit', 'Jóga', 'Pilates', 'Outdoor', 'Bojové sporty'];
  const visitedCats = new Set(checkins.map(gymCategory));
  if (REQUIRED_CATS.every((cat) => visitedCats.has(cat))) await give('sberatel');

  // ── Spring ──
  if ([3, 4, 5].includes(latestMonth)) await give('jarni_probuzeni');

  const aprilCheckins = checkins.filter((c) => {
    const d = new Date(c.checked_in_at);
    return d.getFullYear() === latestYear && d.getMonth() === 3;
  }).length;
  if (aprilCheckins >= 10) await give('jarni_vyzva');

  // ── Summer ──
  const isSummer = latestMonth === 7 || latestMonth === 8;
  const summerCheckins = checkins.filter((c) => {
    const d = new Date(c.checked_in_at);
    return d.getFullYear() === latestYear && (d.getMonth() === 6 || d.getMonth() === 7);
  });
  if (summerCheckins.length >= 15) await give('letni_bojovnik');

  const summerCities = new Set(summerCheckins.map((c) => c.gym_city).filter(Boolean));
  if (summerCities.size >= 3) await give('gym_nomad');

  // Nepřerušená léta — every ISO week of Jul+Aug has ≥1 check-in
  if (isSummer) {
    const year = latestYear;
    // Build set of weeks that should have a check-in (all weeks overlapping Jul+Aug)
    const weeksNeeded = new Set<string>();
    for (let month = 6; month <= 7; month++) {
      const daysInMonth = month === 6 ? 31 : 31;
      for (let day = 1; day <= daysInMonth; day++) {
        weeksNeeded.add(isoWeekKey(new Date(year, month, day)));
      }
    }
    const weeksWithCheckin = new Set(
      summerCheckins.map((c) => isoWeekKey(new Date(c.checked_in_at))),
    );
    if (Array.from(weeksNeeded).every((w) => weeksWithCheckin.has(w))) await give('nepreruzena_leta');
  }

  // Horko nevadí — temperature > 30°C today
  if (ctx.maxTempC !== null && ctx.maxTempC !== undefined && ctx.maxTempC > 30) {
    await give('horko_nevadi');
  }

  return newBadges;
}
