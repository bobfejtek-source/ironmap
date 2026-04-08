import type { Metadata } from 'next';
import { getTopCities, getTotalCount, getCities } from '@/lib/db';
import HomeClient from '@/components/HomeClient';

export const metadata: Metadata = {
  title: 'IRON — Najdi svou posilovnu v České republice',
  description:
    'Největší adresář posiloven a fitness center v České republice. Najděte gym ve vašem městě.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [topCities, total, allCities] = await Promise.all([
    getTopCities(24),
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
