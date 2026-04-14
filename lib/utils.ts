import type { Gym } from './db';

/** Parse the `categories` JSON array, falling back to legacy `category` field */
export function parseCategories(gym: Pick<Gym, 'categories' | 'category'>): string[] {
  try {
    if (gym.categories) return JSON.parse(gym.categories) as string[];
  } catch { /* invalid JSON */ }
  return gym.category ? [gym.category] : [];
}

/** Convert city name to URL-safe slug (Czech chars preserved where safe, else transliterated) */
export function cityToSlug(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Slug to display label: capitalize first letter */
export function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatRating(rating: number | null): string {
  if (rating == null) return '—';
  return rating.toFixed(1);
}

const GOOGLE_DAY_MAP: Record<string, string> = {
  monday: 'monday', tuesday: 'tuesday', wednesday: 'wednesday',
  thursday: 'thursday', friday: 'friday', saturday: 'saturday', sunday: 'sunday',
};

export function parseOpeningHours(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Legacy format: plain object {monday: "6:00–22:00", ...}
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    // Google Places format: ["Monday: 6:00 AM – 10:00 PM", "Tuesday: Closed", ...]
    if (Array.isArray(parsed)) {
      const result: Record<string, string> = {};
      for (const entry of parsed) {
        const colon = entry.indexOf(':');
        if (colon === -1) continue;
        const dayRaw = entry.slice(0, colon).trim().toLowerCase();
        const hours  = entry.slice(colon + 1).trim();
        const dayKey = GOOGLE_DAY_MAP[dayRaw];
        if (dayKey) result[dayKey] = hours;
      }
      return Object.keys(result).length > 0 ? result : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseCoordinates(raw: string | null): { lat: number; lng: number } | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Pondělí',
  tuesday: 'Úterý',
  wednesday: 'Středa',
  thursday: 'Čtvrtek',
  friday: 'Pátek',
  saturday: 'Sobota',
  sunday: 'Neděle',
};

export function getDayLabel(day: string): string {
  return DAY_LABELS[day.toLowerCase()] ?? day;
}

// ── City display ──────────────────────────────────────────────────────────────

const BAD_CITY_NAMES = new Set(['česko', 'czechia', 'czech republic', 'cz']);

function extractCityFromAddress(address: string): string | null {
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  // Walk from second-to-last inward; skip country-level names
  for (let i = parts.length - 2; i >= 0; i--) {
    // Strip leading Czech postal code ("160 00 " or "16000 ")
    const stripped = parts[i].replace(/^\d{3}\s?\d{2}\s*/, '').trim();
    if (stripped && !BAD_CITY_NAMES.has(stripped.toLowerCase())) return stripped;
  }
  return null;
}

/**
 * Returns the best city label for display purposes.
 * 1. gym.city if non-empty and not a country name
 * 2. City extracted from gym.address
 * 3. Empty string (caller should hide the element)
 */
export function getDisplayCity(gym: Pick<Gym, 'city' | 'address'>): string {
  const city = (gym.city ?? '').trim();
  if (city && !BAD_CITY_NAMES.has(city.toLowerCase())) return city;
  if (gym.address) {
    const extracted = extractCityFromAddress(gym.address);
    if (extracted) return extracted;
  }
  return '';
}

export function gymDetailUrl(gym: Pick<Gym, 'city' | 'slug'>): string {
  return `/posilovny/${cityToSlug(gym.city)}/${gym.slug}`;
}

export function cityUrl(city: string): string {
  return `/posilovny/${cityToSlug(city)}`;
}


export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// ── Neighborhood extraction ────────────────────────────────────────────────────

const BAD_NEIGHBORHOOD = new Set(['czechia', 'czech republic', 'česká republika', 'česko', 'cz']);

export function getNeighborhood(address: string | null, city: string): string {
  if (!address) return city;
  // Match "City X-Neighborhood" or "City-Neighborhood" e.g. "Praha 10-Vinohrady", "Brno-Žabovřesky"
  const dashMatch = address.match(/[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+(?:\s+\d+)?-([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž\s-]+?)(?:,|$)/);
  if (dashMatch) return dashMatch[1].trim();
  // Last comma segment — strip PSČ prefix, filter country names
  const parts = address.split(',');
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].trim();
    const stripped = last.replace(/^\d{3}\s?\d{2}\s*/, '').trim();
    if (stripped && stripped.length < 40 && !BAD_NEIGHBORHOOD.has(stripped.toLowerCase())) {
      return stripped;
    }
  }
  return city;
}

// ── Opening hours: today + open/closed ───────────────────────────────────────

const TODAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function getTodayKey(): string {
  return TODAY_KEYS[new Date().getDay()];
}

/** Parse "9:00 AM – 10:00 PM", "6:00–22:00", "Closed", "Nonstop" → minutes from midnight */
function parseTimeToMinutes(t: string): number | null {
  const ampm = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    if (ampm[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ampm[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const h24 = t.match(/(\d{1,2}):(\d{2})/);
  if (h24) return parseInt(h24[1], 10) * 60 + parseInt(h24[2], 10);
  return null;
}

export type OpenStatus = { open: true; closesAt: string } | { open: false; opensAt: string | null } | null;

export function getOpenStatus(hoursStr: string | null | undefined): OpenStatus {
  if (!hoursStr) return null;
  const lower = hoursStr.toLowerCase().trim();
  if (lower === 'closed' || lower === 'zavřeno') return { open: false, opensAt: null };
  if (lower === 'nonstop' || lower === 'open 24 hours' || lower === '0:00–24:00') return { open: true, closesAt: 'půlnoc' };

  // Find time range: "9:00 AM – 10:00 PM" or "6:00–22:00"
  const rangeSep = hoursStr.match(/[–\-]/g);
  if (!rangeSep) return null;

  // Split on em-dash, en-dash, or hyphen between times
  const parts = hoursStr.split(/\s*[–]\s*|\s*-\s*(?=\d)/);
  if (parts.length < 2) return null;

  const openMin  = parseTimeToMinutes(parts[0]);
  const closeMin = parseTimeToMinutes(parts[parts.length - 1]);
  if (openMin === null || closeMin === null) return null;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const isOpen = closeMin > openMin
    ? nowMin >= openMin && nowMin < closeMin
    : nowMin >= openMin || nowMin < closeMin; // overnight

  if (isOpen) {
    const ch = Math.floor(closeMin / 60), cm = closeMin % 60;
    return { open: true, closesAt: `${ch}:${cm.toString().padStart(2, '0')}` };
  } else {
    const oh = Math.floor(openMin / 60), om = openMin % 60;
    return { open: false, opensAt: `${oh}:${om.toString().padStart(2, '0')}` };
  }
}

export function formatHoursShort(hoursStr: string): string {
  // Convert "9:00 AM – 10:00 PM" → "9:00–22:00" for compact display
  const lower = hoursStr.toLowerCase().trim();
  if (lower === 'closed' || lower === 'zavřeno') return 'Zavřeno';
  if (lower === 'nonstop' || lower === 'open 24 hours') return 'Nonstop';
  // Already compact like "6:00–22:00"
  if (/^\d{1,2}:\d{2}[–\-]/.test(hoursStr)) return hoursStr;
  // Convert AM/PM format
  const parts = hoursStr.split(/\s*–\s*/);
  if (parts.length === 2) {
    const t1 = parseTimeToMinutes(parts[0]);
    const t2 = parseTimeToMinutes(parts[1]);
    if (t1 !== null && t2 !== null) {
      const fmt = (m: number) => `${Math.floor(m / 60)}:${(m % 60).toString().padStart(2, '0')}`;
      return `${fmt(t1)}–${fmt(t2)}`;
    }
  }
  return hoursStr.slice(0, 11);
}
