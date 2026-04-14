import type { Metadata } from 'next';
import { getTopCities, getTotalCount, getCities } from '@/lib/db';
import HomeClient from '@/components/HomeClient';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const total = await getTotalCount();
  const count = Math.floor(total / 100) * 100;
  return {
    title: 'IRON — Najdi svou posilovnu v České republice | Fitness directory',
    description: `Největší adresář posiloven v ČR. ${count}+ fitness center, filtry, hodnocení, otevírací doby. MultiSport, jóga, CrossFit, pilates. Najdi fitko blízko tebe.`,
    alternates: { canonical: '/' },
    openGraph: {
      title: 'IRON — Najdi svou posilovnu v České republice',
      description: `${count}+ fitness center v ČR. Hodnocení, otevírací doby, MultiSport, filtry.`,
      url: 'https://www.ironmap.cz',
      type: 'website',
    },
  };
}

export default async function HomePage() {
  const [topCities, total, allCities] = await Promise.all([
    getTopCities(10),
    getTotalCount(),
    getCities(),
  ]);

  return (
    <HomeClient
      topCities={topCities}
      total={total}
      allCities={allCities}
    />
  );
}
