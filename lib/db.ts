import { sql, HAS_DB } from './postgres';

export type Gym = {
  id: number;
  name: string;
  slug: string;
  city: string;
  address: string | null;
  rating: number | null;
  rating_count: number | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  opening_hours: string | null;
  coordinates: string | null;
  description: string | null;
  ico: string | null;
  tags: string | null;
  source: string | null;
  detail_url: string | null;
  price_level: string | null;
  osm_id: number | null;
  verified: number;
  created_at: string;
  category: string | null;
  cenik_url: string | null;
  daily_price: number | null;
  monthly_price: number | null;
  price_verified: boolean | null;
  raw_price_text: string | null;
  discovery_source: string | null;
  discovery_batch: string | null;
  confidence: number | null;
  staging: boolean;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllGyms(): Promise<Gym[]> {
  if (!HAS_DB) return [];
  const rows = await sql`SELECT * FROM gyms WHERE name != 'Unnamed Gym' AND staging = FALSE ORDER BY name`;
  return rows as Gym[];
}

export async function getGymsByCity(city: string): Promise<Gym[]> {
  if (!HAS_DB) return [];
  const rows = await sql`
    SELECT * FROM gyms WHERE city = ${city} AND name != 'Unnamed Gym' AND staging = FALSE ORDER BY name
  `;
  return rows as Gym[];
}

export async function getGymBySlug(slug: string): Promise<Gym | undefined> {
  if (!HAS_DB) return undefined;
  const rows = await sql`SELECT * FROM gyms WHERE slug = ${slug}`;
  const gym = rows[0] as Gym | undefined;
  if (gym?.name === 'Unnamed Gym') return undefined;
  return gym;
}

export async function getCities(): Promise<{ city: string; count: number }[]> {
  if (!HAS_DB) return [];
  const rows = await sql`
    SELECT city, COUNT(*)::int AS count
    FROM gyms WHERE name != 'Unnamed Gym'
    GROUP BY city ORDER BY count DESC, city
  `;
  return rows as { city: string; count: number }[];
}

export async function getTopCities(limit = 12): Promise<{ city: string; count: number }[]> {
  if (!HAS_DB) return [];
  const rows = await sql`
    SELECT city, COUNT(*)::int AS count
    FROM gyms WHERE name != 'Unnamed Gym'
    GROUP BY city ORDER BY count DESC
    LIMIT ${limit}
  `;
  return rows as { city: string; count: number }[];
}

export async function getTotalCount(): Promise<number> {
  if (!HAS_DB) return 0;
  const rows = await sql`SELECT COUNT(*)::int AS n FROM gyms WHERE name != 'Unnamed Gym' AND staging = FALSE`;
  return (rows[0] as { n: number }).n;
}

export async function getSimilarGyms(city: string, excludeSlug: string, limit = 4): Promise<Gym[]> {
  if (!HAS_DB) return [];
  const rows = await sql`
    SELECT * FROM gyms
    WHERE city = ${city} AND slug != ${excludeSlug} AND name != 'Unnamed Gym' AND staging = FALSE
    ORDER BY CASE WHEN rating IS NOT NULL THEN 0 ELSE 1 END, rating DESC
    LIMIT ${limit}
  `;
  return rows as Gym[];
}

export async function getGymsBySlugs(slugs: string[]): Promise<Gym[]> {
  if (!HAS_DB || slugs.length === 0) return [];
  const rows = await sql`SELECT * FROM gyms WHERE slug = ANY(${slugs as unknown as string})`;
  return rows as Gym[];
}

export async function getCityCenters(): Promise<{ city: string; lat: number; lng: number }[]> {
  if (!HAS_DB) return [];
  const rows = await sql`
    SELECT
      city,
      AVG((coordinates::json->>'lat')::float) AS lat,
      AVG((coordinates::json->>'lng')::float) AS lng
    FROM gyms
    WHERE staging = FALSE AND coordinates IS NOT NULL
    GROUP BY city
    HAVING COUNT(*) >= 2
    ORDER BY COUNT(*) DESC
  `;
  return rows as { city: string; lat: number; lng: number }[];
}

export async function getGymsByCategory(category: string): Promise<Gym[]> {
  if (!HAS_DB) return [];
  const rows = await sql`
    SELECT * FROM gyms
    WHERE category = ${category} AND name != 'Unnamed Gym' AND staging = FALSE
    ORDER BY CASE WHEN rating IS NOT NULL THEN 0 ELSE 1 END, rating DESC, name
  `;
  return rows as Gym[];
}

export async function getGymsByCityAndCategory(city: string, category: string): Promise<Gym[]> {
  if (!HAS_DB) return [];
  const rows = await sql`
    SELECT * FROM gyms
    WHERE city = ${city} AND category = ${category} AND name != 'Unnamed Gym' AND staging = FALSE
    ORDER BY CASE WHEN rating IS NOT NULL THEN 0 ELSE 1 END, rating DESC, name
  `;
  return rows as Gym[];
}
