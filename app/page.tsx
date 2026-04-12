import type { Metadata } from 'next';
import { getTopCities, getTotalCount, getCities, getCityCenters } from '@/lib/db';
import HomeClient from '@/components/HomeClient';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'IRON — Najdi svou posilovnu v České republice',
  description:
    'Největší adresář posiloven a fitness center v České republice. Najděte gym ve vašem městě.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [topCities, total, allCities, cityCenters] = await Promise.all([
    getTopCities(10),
    getTotalCount(),
    getCities(),
    getCityCenters(),
  ]);

  return (
    <HomeClient
      topCities={topCities}
      total={total}
      allCities={allCities}
      cityCenters={cityCenters}
    />
  );
}
