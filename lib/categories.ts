export const CATEGORIES = [
  { slug: 'posilovna',     db: 'Posilovna',    labelCs: 'Posilovna',     labelEn: 'Gym' },
  { slug: 'crossfit',      db: 'CrossFit',     labelCs: 'CrossFit',      labelEn: 'CrossFit' },
  { slug: 'joga',          db: 'Jóga',         labelCs: 'Jóga',          labelEn: 'Yoga' },
  { slug: 'pilates',       db: 'Pilates',      labelCs: 'Pilates',       labelEn: 'Pilates' },
  { slug: 'outdoor',       db: 'Outdoor',      labelCs: 'Outdoor',       labelEn: 'Outdoor' },
  { slug: 'bojove-sporty', db: 'Bojové sporty',labelCs: 'Bojové sporty', labelEn: 'Martial Arts' },
  { slug: 'spinning',      db: 'Spinning',     labelCs: 'Spinning',      labelEn: 'Spinning' },
  { slug: 'bazen',         db: 'Bazén',        labelCs: 'Bazén',         labelEn: 'Swimming Pool' },
] as const;

export type CategorySlug = typeof CATEGORIES[number]['slug'];

export function categoryBySlug(slug: string) {
  return CATEGORIES.find(c => c.slug === slug) ?? null;
}

export function categoryByDb(db: string) {
  return CATEGORIES.find(c => c.db === db) ?? null;
}
