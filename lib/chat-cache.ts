/**
 * In-memory FAQ cache pro chatbota.
 *
 * Cachujeme pouze jednoduche single-turn dotazy bez tool-use
 * (typicky "jak funguje IRON", "kolik stoji Pro", "kde vas najdu").
 * Kontextove follow-up dotazy NEcachujeme.
 *
 * TTL 24h, max 200 zaznamu (LRU-lite: pri prekroceni smazeme nejstarsi).
 */

type CacheEntry = {
  text: string;
  expiresAt: number;
};

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;
const store = new Map<string, CacheEntry>();

/** Normalizace klice: lowercase, strip diakritiky, whitespace, diakritika, interpunkce. */
export function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getCached(userMessage: string): string | null {
  const key = normalizeKey(userMessage);
  if (!key) return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.text;
}

export function setCached(userMessage: string, text: string): void {
  const key = normalizeKey(userMessage);
  if (!key || !text) return;

  // Simple eviction: smaz nejstarsi zaznam pokud jsme nad limitem
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }

  store.set(key, {
    text,
    expiresAt: Date.now() + TTL_MS,
  });
}
