import { sql } from './postgres';

export type CheckinRow = {
  id: number;
  user_id: number;
  gym_id: string;
  checked_in_at: string;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  gym_name: string | null;
  gym_city: string | null;
  gym_coordinates: string | null;
  gym_tags: string | null;
};

export type BadgeRow = {
  id: number;
  user_id: number;
  badge_type: string;
  earned_at: string;
};

export type UserStats = {
  totalCheckins: number;
  uniqueGyms: number;
  uniqueCities: number;
};

// ─── Check-ins ────────────────────────────────────────────────────────────────

export async function createCheckin(
  userId: number,
  gymId: string,
  lat: number | null,
  lng: number | null,
  photoUrl: string | null,
): Promise<CheckinRow> {
  const rows = await sql`
    INSERT INTO checkins (user_id, gym_id, lat, lng, photo_url)
    VALUES (${userId}, ${gymId}, ${lat}, ${lng}, ${photoUrl})
    RETURNING *
  `;
  return rows[0] as CheckinRow;
}

export async function getUserCheckins(userId: number): Promise<CheckinRow[]> {
  const rows = await sql`
    SELECT
      c.id, c.user_id, c.gym_id, c.checked_in_at::text, c.lat, c.lng, c.photo_url,
      g.name  AS gym_name,
      g.city  AS gym_city,
      g.coordinates AS gym_coordinates,
      g.tags  AS gym_tags
    FROM checkins c
    LEFT JOIN gyms g ON g.slug = c.gym_id
    WHERE c.user_id = ${userId}
    ORDER BY c.checked_in_at DESC
  `;
  return rows as CheckinRow[];
}

export async function getUserCheckinCount(userId: number): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int AS n FROM checkins WHERE user_id = ${userId}`;
  return (rows[0] as { n: number }).n;
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export async function getUserBadges(userId: number): Promise<BadgeRow[]> {
  const rows = await sql`SELECT * FROM badges WHERE user_id = ${userId} ORDER BY earned_at ASC`;
  return rows as BadgeRow[];
}

export async function awardBadge(userId: number, badgeType: string): Promise<boolean> {
  try {
    const rows = await sql`
      INSERT INTO badges (user_id, badge_type)
      VALUES (${userId}, ${badgeType})
      ON CONFLICT (user_id, badge_type) DO NOTHING
      RETURNING id
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getUserStats(userId: number): Promise<UserStats> {
  const rows = await sql`
    SELECT c.gym_id, g.city AS gym_city
    FROM checkins c
    LEFT JOIN gyms g ON g.slug = c.gym_id
    WHERE c.user_id = ${userId}
  `;
  const totalCheckins = rows.length;
  const uniqueGyms = new Set(rows.map((r) => r.gym_id as string)).size;
  const uniqueCities = new Set(rows.map((r) => r.gym_city as string).filter(Boolean)).size;
  return { totalCheckins, uniqueGyms, uniqueCities };
}
