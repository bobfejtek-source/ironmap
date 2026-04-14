export interface DayHours {
  day: string;   // Czech day name, e.g. "Pondělí"
  hours: string; // 24h format, e.g. "6:00–22:00", "Zavřeno", "Nonstop"
}

const EN_TO_CS: Record<string, string> = {
  monday: 'Pondělí',
  tuesday: 'Úterý',
  wednesday: 'Středa',
  thursday: 'Čtvrtek',
  friday: 'Pátek',
  saturday: 'Sobota',
  sunday: 'Neděle',
};

// Normalized (no diacritics, lowercase) Czech day → canonical Czech
const CS_NORM_TO_CS: Record<string, string> = {
  pondeli: 'Pondělí',
  utery: 'Úterý',
  streda: 'Středa',
  ctvrtek: 'Čtvrtek',
  patek: 'Pátek',
  sobota: 'Sobota',
  nedele: 'Neděle',
};

const CS_DAY_ORDER = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

function normDay(raw: string): string | null {
  const lower = raw.trim().toLowerCase();
  if (EN_TO_CS[lower]) return EN_TO_CS[lower];
  // Strip diacritics and try Czech
  const stripped = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CS_NORM_TO_CS[stripped] ?? null;
}

function minutesToStr(min: number): string {
  return `${Math.floor(min / 60)}:${(min % 60).toString().padStart(2, '0')}`;
}

// Parse a single time token like "9:00 AM", "10:00 PM", "14:00" → minutes from midnight.
// period param is a fallback when the token itself has no AM/PM marker.
function parseToken(token: string, fallbackPeriod?: 'AM' | 'PM'): number | null {
  const m = token.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const period = (m[3] ?? fallbackPeriod ?? '').toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

// Convert a single time-range segment like "9:00 AM – 10:00 PM" or "6:00 – 8:00 AM" → "9:00–22:00"
function convertSegment(seg: string): string {
  // Split on en-dash, em-dash, or hyphen (with optional surrounding spaces)
  const parts = seg.trim().split(/\s*[–—\-]\s*/);
  if (parts.length !== 2) return seg.trim();

  const endHasPeriod = /AM|PM/i.test(parts[1]);
  const startHasPeriod = /AM|PM/i.test(parts[0]);

  let startMin: number | null;
  let endMin: number | null;

  if (endHasPeriod && !startHasPeriod) {
    // Inherit the period from the end token for the start token
    const period = parts[1].trim().match(/AM|PM/i)![0].toUpperCase() as 'AM' | 'PM';
    startMin = parseToken(parts[0], period);
  } else {
    startMin = parseToken(parts[0]);
  }
  endMin = parseToken(parts[1]);

  if (startMin === null || endMin === null) return seg.trim();
  return `${minutesToStr(startMin)}–${minutesToStr(endMin)}`;
}

// Convert a full hours string (may contain AM/PM, comma-separated split intervals, or already 24h)
function convertHours(raw: string): string {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'closed' || lower === 'zavřeno') return 'Zavřeno';
  if (lower === 'open 24 hours' || lower === 'nonstop' || lower === '0:00–24:00') return 'Nonstop';

  // No AM/PM — already 24h; just normalise dashes and whitespace
  if (!/AM|PM/i.test(trimmed)) {
    return trimmed.replace(/\s*[–—]\s*/g, '–').replace(/\s*-\s*/g, '–');
  }

  // Split on commas to handle split-hour entries like "6:00 – 8:00 AM, 1:00 – 10:00 PM"
  return trimmed
    .split(',')
    .map(seg => convertSegment(seg.trim()))
    .join(', ');
}

function parseLine(line: string): { day: string; hours: string } | null {
  const colon = line.indexOf(':');
  if (colon === -1) return null;
  const dayRaw = line.slice(0, colon).trim();
  const hoursRaw = line.slice(colon + 1).trim();
  const day = normDay(dayRaw);
  if (!day) return null;
  return { day, hours: convertHours(hoursRaw) };
}

/**
 * Parse opening_hours from any of the three stored formats into a canonical
 * array of 7 days (Mon–Sun) with Czech day names and 24h hour strings.
 *
 * Returns null when raw is empty / unparseable.
 */
export function parseOpeningHours(raw: string | null | undefined): DayHours[] | null {
  if (!raw) return null;

  let lines: string[] = [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      lines = parsed.map(String);
    } else if (parsed && typeof parsed === 'object') {
      // Legacy plain-object format: { monday: "6:00–22:00", … }
      lines = Object.entries(parsed as Record<string, unknown>).map(
        ([day, h]) => `${day}: ${h}`,
      );
    }
  } catch {
    // Not JSON — plain-text with newlines
    lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  }

  if (lines.length === 0) return null;

  const parsed = lines.map(parseLine).filter((x): x is { day: string; hours: string } => x !== null);
  if (parsed.length === 0) return null;

  const map = new Map(parsed.map(d => [d.day, d.hours]));
  return CS_DAY_ORDER.map(day => ({ day, hours: map.get(day) ?? 'Zavřeno' }));
}
