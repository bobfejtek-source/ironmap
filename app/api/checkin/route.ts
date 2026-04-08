import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCheckin } from '@/lib/db-users';
import { evaluateBadges, BADGE_DEFS, fetchMaxTempCelsius } from '@/lib/badges';
import { sql, HAS_DB } from '@/lib/postgres';
import { rateLimit } from '@/lib/rate-limit';

// Bounding box: Czech Republic + generous 50 km border buffer
const LAT_MIN = 48.5, LAT_MAX = 51.1;
const LNG_MIN = 12.0, LNG_MAX = 18.9;

function isValidCoords(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    isFinite(lat) && isFinite(lng) &&
    lat >= LAT_MIN && lat <= LAT_MAX &&
    (lng as number) >= LNG_MIN && (lng as number) <= LNG_MAX
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
  }

  // Rate limit: 10 check-ins per user per hour
  if (!rateLimit(`checkin:${userId}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Příliš mnoho check-inů. Zkus to znovu za hodinu.' },
      { status: 429 }
    );
  }

  let body: { gymSlug?: unknown; lat?: unknown; lng?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { gymSlug, lat, lng } = body;

  // Validate gymSlug
  if (!gymSlug || typeof gymSlug !== 'string' || gymSlug.length > 200 || !/^[a-z0-9-]+$/.test(gymSlug)) {
    return NextResponse.json({ error: 'Neplatný gymSlug' }, { status: 400 });
  }

  // Verify gym exists in DB
  if (HAS_DB) {
    const rows = await sql`SELECT id FROM gyms WHERE slug = ${gymSlug} LIMIT 1`;
    if (!rows.length) {
      return NextResponse.json({ error: 'Posilovna nenalezena' }, { status: 404 });
    }
  }

  // Validate coordinates (optional, but must be in-bounds if provided)
  const coordsValid = isValidCoords(lat, lng);
  const safeLat = coordsValid ? (lat as number) : null;
  const safeLng = coordsValid ? (lng as number) : null;

  // Fetch weather if we have valid coordinates (for Horko nevadí badge)
  let maxTempC: number | null = null;
  if (safeLat !== null && safeLng !== null) {
    maxTempC = await fetchMaxTempCelsius(safeLat, safeLng);
  }

  await createCheckin(userId, gymSlug, safeLat, safeLng, null);
  const newBadgeIds = await evaluateBadges(userId, { maxTempC });

  const newBadges = newBadgeIds.map((id) => {
    const def = BADGE_DEFS.find((b) => b.id === id);
    return { id, name: def?.name ?? id, icon: def?.icon ?? '🏅' };
  });

  return NextResponse.json({ ok: true, newBadges });
}
