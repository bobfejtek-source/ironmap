import type { Metadata } from 'next';
import { getTotalCount, getCities } from '@/lib/db';
import OProjektuClient from './OProjektuClient';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'O projektu',
  description: 'IRONMAP vznikl z otočení ve dveřích. Příběh za největším adresářem posiloven v ČR.',
  alternates: { canonical: '/o-projektu' },
};

export default async function OProjektuPage() {
  const [total, cities] = await Promise.all([getTotalCount(), getCities()]);

  const gymCount = Math.floor(total / 100) * 100;
  const cityCount = Math.floor(cities.length / 10) * 10;

  // Format Czech style: 1200 → "1 200", 200 → "200"
  const gymCountStr = gymCount >= 1000
    ? `${Math.floor(gymCount / 1000)}\u00a0${String(gymCount % 1000).padStart(3, '0')}`
    : String(gymCount);
  const cityCountStr = String(cityCount);

  return <OProjektuClient gymCountStr={gymCountStr} cityCountStr={cityCountStr} />;
}
