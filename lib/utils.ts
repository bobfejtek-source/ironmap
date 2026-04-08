import type { Gym } from './db';

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

export function parseOpeningHours(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
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
