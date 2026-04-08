import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/postgres';

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
  }

  // Delete all user data in dependency order
  await sql`DELETE FROM badges   WHERE user_id = ${userId}`;
  await sql`DELETE FROM checkins WHERE user_id = ${userId}`;
  await sql`DELETE FROM sessions WHERE "userId" = ${userId}`;
  await sql`DELETE FROM accounts WHERE "userId" = ${userId}`;
  await sql`DELETE FROM users    WHERE id       = ${userId}`;

  return NextResponse.json({ ok: true });
}
