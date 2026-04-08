import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCities, getGymsByCity } from '@/lib/db';
import { cityToSlug } from '@/lib/utils';
import CityListing from '@/components/CityListing';

export const dynamicParams = true;

type Props = { params: { city: string } };

export async function generateStaticParams() {
  const cities = await getCities();
  return cities.map(({ city }) => ({ city: cityToSlug(city) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cityName = await resolveCityName(params.city);
  if (!cityName) return {};
  const gyms = await getGymsByCity(cityName);
  return {
    title: `Posilovny ${cityName} — ${gyms.length} fitness center`,
    description: `Najděte nejlepší posilovnu v ${cityName}. ${gyms.length} fitness center s hodnoceními, otevírací dobou a kontakty.`,
    alternates: { canonical: `/posilovny/${params.city}` },
  };
}

export default async function CityGymsPage({ params }: Props) {
  const cityName = await resolveCityName(params.city);
  if (!cityName) notFound();

  const gyms = await getGymsByCity(cityName);
  if (gyms.length === 0) notFound();

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Page header */}
      <div style={{
        padding: '2rem 2rem 0',
        borderBottom: '1px solid var(--border)',
        background: 'var(--off-black)',
      }}>
        {/* Breadcrumb */}
        <nav style={{
          marginBottom: '1.25rem',
          fontSize: '0.72rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <Link href="/" style={{ color: 'var(--muted)', transition: 'color 0.2s' }}>IRON</Link>
          <span style={{ color: 'var(--border-mid)' }}>—</span>
          <Link href="/posilovny" style={{ color: 'var(--muted)', transition: 'color 0.2s' }}>Posilovny</Link>
          <span style={{ color: 'var(--border-mid)' }}>—</span>
          <span style={{ color: 'var(--text)' }}>{cityName}</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            lineHeight: 0.9,
          }}>
            Posilovny <span style={{ color: 'var(--lime)' }}>{cityName}</span>
          </h1>
          <div style={{
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
          }}>
            {gyms.length} fitness center
          </div>
        </div>
      </div>

      {/* Listing with map */}
      <CityListing gyms={gyms} cityName={cityName} />
    </div>
  );
}

async function resolveCityName(citySlug: string): Promise<string | null> {
  const cities = await getCities();
  return cities.find((c) => cityToSlug(c.city) === citySlug)?.city ?? null;
}
