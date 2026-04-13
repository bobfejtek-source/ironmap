import { unstable_cache } from 'next/cache';
import { sql } from './postgres';

export const getGymCount = unstable_cache(
  async (): Promise<number> => {
    const rows = await sql`SELECT COUNT(*) FROM gyms WHERE name != 'Unnamed Gym' AND staging = FALSE`;
    return Number(rows[0].count);
  },
  ['gym-count'],
  { revalidate: 86400 },
);
