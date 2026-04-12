import type { Metadata } from 'next';
import { getTotalCount } from '@/lib/db';
import ProMajiteleClient from './ProMajiteleClient';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Pro majitele gymů — IRONMAP',
  description:
    'Přidejte svůj gym na IRONMAP. Přes 450 000 aktivních sportovců v ČR hledá posilovnu. Buďte tam kde hledají.',
  alternates: { canonical: '/pro-majitele' },
};

export default async function ProMajitelePage() {
  const total = await getTotalCount();
  const gymCount = Math.floor(total / 100) * 100;
  return <ProMajiteleClient gymCount={gymCount} />;
}
