import { describe, it, expect } from 'vitest';
import { parseOpeningHours } from './parseOpeningHours';

// ── helpers ──────────────────────────────────────────────────────────────────

function day(result: ReturnType<typeof parseOpeningHours>, dayName: string) {
  return result?.find(d => d.day === dayName)?.hours ?? null;
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('parseOpeningHours', () => {
  it('returns null for null input', () => {
    expect(parseOpeningHours(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseOpeningHours('')).toBeNull();
  });

  it('Format A — JSON array with simple AM/PM ranges', () => {
    const raw = JSON.stringify([
      'Monday: 9:00 AM – 9:00 PM',
      'Tuesday: 9:00 AM – 9:00 PM',
      'Wednesday: 9:00 AM – 9:00 PM',
      'Thursday: 9:00 AM – 9:00 PM',
      'Friday: 9:00 AM – 9:00 PM',
      'Saturday: 7:00 AM – 9:00 PM',
      'Sunday: 9:00 AM – 9:00 PM',
    ]);
    const result = parseOpeningHours(raw);
    expect(result).not.toBeNull();
    expect(day(result, 'Pondělí')).toBe('9:00–21:00');
    expect(day(result, 'Sobota')).toBe('7:00–21:00');
    expect(result).toHaveLength(7);
  });

  it('Format B — plain text with \\n and AM/PM', () => {
    const raw =
      'Monday: 6:00 AM – 10:00 PM\n' +
      'Tuesday: 6:00 AM – 10:00 PM\n' +
      'Wednesday: 6:00 AM – 10:00 PM\n' +
      'Thursday: 6:00 AM – 10:00 PM\n' +
      'Friday: 6:00 AM – 10:00 PM\n' +
      'Saturday: 8:00 AM – 10:00 PM\n' +
      'Sunday: 8:00 AM – 10:00 PM';
    const result = parseOpeningHours(raw);
    expect(day(result, 'Pondělí')).toBe('6:00–22:00');
    expect(day(result, 'Sobota')).toBe('8:00–22:00');
  });

  it('Format C — already Czech 24h format', () => {
    const raw =
      'Pondělí: 6:00-21:00\n' +
      'Úterý: 6:00-21:00\n' +
      'Středa: 6:00-21:00\n' +
      'Čtvrtek: 6:00-21:00\n' +
      'Pátek: 6:00-20:00\n' +
      'Sobota: 8:00-18:00\n' +
      'Neděle: Zavřeno';
    const result = parseOpeningHours(raw);
    expect(day(result, 'Pondělí')).toBe('6:00–21:00');
    expect(day(result, 'Pátek')).toBe('6:00–20:00');
    expect(day(result, 'Neděle')).toBe('Zavřeno');
  });

  it('split hours — AM/PM with comma separator', () => {
    const raw = JSON.stringify([
      'Monday: 6:00 – 8:00 AM, 1:00 – 10:00 PM',
      'Tuesday: 6:00 – 8:00 AM, 1:00 – 9:00 PM',
    ]);
    const result = parseOpeningHours(raw);
    expect(day(result, 'Pondělí')).toBe('6:00–8:00, 13:00–22:00');
    expect(day(result, 'Úterý')).toBe('6:00–8:00, 13:00–21:00');
  });

  it('"Closed" → "Zavřeno"', () => {
    const raw = JSON.stringify([
      'Monday: Closed',
      'Tuesday: 9:00 AM – 9:00 PM',
      'Wednesday: Closed',
      'Thursday: 9:00 AM – 9:00 PM',
      'Friday: 9:00 AM – 9:00 PM',
      'Saturday: Closed',
      'Sunday: Closed',
    ]);
    const result = parseOpeningHours(raw);
    expect(day(result, 'Pondělí')).toBe('Zavřeno');
    expect(day(result, 'Sobota')).toBe('Zavřeno');
    expect(day(result, 'Úterý')).toBe('9:00–21:00');
  });

  it('"Open 24 hours" → "Nonstop"', () => {
    const raw = JSON.stringify([
      'Monday: Open 24 hours',
      'Tuesday: Open 24 hours',
      'Wednesday: Open 24 hours',
      'Thursday: Open 24 hours',
      'Friday: Open 24 hours',
      'Saturday: Open 24 hours',
      'Sunday: Open 24 hours',
    ]);
    const result = parseOpeningHours(raw);
    expect(day(result, 'Pondělí')).toBe('Nonstop');
    expect(day(result, 'Neděle')).toBe('Nonstop');
  });

  it('midnight edge case — 12:00 AM → 0:00 and 12:00 PM → 12:00', () => {
    const raw = JSON.stringify(['Monday: 12:00 AM – 12:00 PM']);
    const result = parseOpeningHours(raw);
    expect(day(result, 'Pondělí')).toBe('0:00–12:00');
  });

  it('12:30 AM → 0:30, 11:30 PM → 23:30', () => {
    const raw = JSON.stringify(['Monday: 12:30 AM – 11:30 PM']);
    const result = parseOpeningHours(raw);
    expect(day(result, 'Pondělí')).toBe('0:30–23:30');
  });

  it('missing days are filled with "Zavřeno"', () => {
    const raw = JSON.stringify(['Monday: 9:00 AM – 5:00 PM']);
    const result = parseOpeningHours(raw);
    expect(result).toHaveLength(7);
    expect(day(result, 'Pondělí')).toBe('9:00–17:00');
    expect(day(result, 'Úterý')).toBe('Zavřeno');
    expect(day(result, 'Neděle')).toBe('Zavřeno');
  });

  it('result always ordered Mon → Sun', () => {
    const raw = JSON.stringify([
      'Sunday: 10:00 AM – 6:00 PM',
      'Monday: 8:00 AM – 8:00 PM',
    ]);
    const result = parseOpeningHours(raw)!;
    expect(result[0].day).toBe('Pondělí');
    expect(result[6].day).toBe('Neděle');
  });

  it('Format A — explicit AM on start, PM on end', () => {
    const raw = JSON.stringify(['Friday: 6:55 AM – 7:45 PM']);
    const result = parseOpeningHours(raw);
    expect(day(result, 'Pátek')).toBe('6:55–19:45');
  });
});
