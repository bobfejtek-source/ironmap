export const CATEGORIES = [
  { slug: 'posilovna',     db: 'Posilovna',    labelCs: 'Posilovna' },
  { slug: 'crossfit',      db: 'CrossFit',     labelCs: 'CrossFit' },
  { slug: 'joga',          db: 'Jóga',         labelCs: 'Jóga' },
  { slug: 'pilates',       db: 'Pilates',      labelCs: 'Pilates' },
  { slug: 'outdoor',       db: 'Outdoor',      labelCs: 'Outdoor' },
  { slug: 'bojove-sporty', db: 'Bojové sporty',labelCs: 'Bojové sporty' },
  { slug: 'spinning',      db: 'Spinning',     labelCs: 'Spinning' },
  { slug: 'bazen',         db: 'Bazén',        labelCs: 'Bazén' },
] as const;

export type CategorySlug = typeof CATEGORIES[number]['slug'];

export function categoryBySlug(slug: string) {
  return CATEGORIES.find(c => c.slug === slug) ?? null;
}

export function categoryByDb(db: string) {
  return CATEGORIES.find(c => c.db === db) ?? null;
}
