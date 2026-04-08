import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserCheckins, getUserBadges, getUserStats } from '@/lib/db-users';
import { computeProgress } from '@/lib/badges';
import ProfilClient from '@/components/ProfilClient';

export const metadata: Metadata = {
  title: 'Můj profil',
  robots: { index: false, follow: false },
};

export default async function ProfilPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/prihlaseni?callbackUrl=/profil');
  }

  const userId = parseInt(session.user.id, 10);

  const [checkins, badges, stats] = await Promise.all([
    getUserCheckins(userId),
    getUserBadges(userId),
    getUserStats(userId),
  ]);

  const badgeProgress = computeProgress(checkins);

  return (
    <ProfilClient
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }}
      checkins={checkins}
      badges={badges}
      stats={stats}
      badgeProgress={badgeProgress}
    />
  );
}
