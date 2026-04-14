import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCities, getGymsByCity } from '@/lib/db';
import { cityToSlug, gymDetailUrl } from '@/lib/utils';
import CityListing from '@/components/CityListing';

export const dynamicParams = true;
export const revalidate = 3600;

import { CATEGORIES } from '@/lib/categories';

type Props = { params: Promise<{ city: string }>; searchParams: Promise<{ kategorie?: string; lat?: string; lng?: string }> };

export async function generateStaticParams() {
  const cities = await getCities();
  return cities.map(({ city }) => ({ city: cityToSlug(city) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const cityName = await resolveCityName(city);
  if (!cityName) return {};
  const gyms = await getGymsByCity(cityName);
  const title = `Posilovny ${cityName} — ${gyms.length} fitness center | IRON`;
  const description = `Kompletní přehled ${gyms.length} posiloven a fitness center v ${cityName}. Hodnocení, otevírací doby, MultiSport akceptace, filtry podle vybavení.`;
  return {
    title,
    description,
    alternates: { canonical: `/posilovny/${city}` },
    openGraph: { title, description, url: `https://www.ironmap.cz/posilovny/${city}`, type: 'website' },
  };
}

export default async function CityGymsPage({ params, searchParams }: Props) {
  const { city } = await params;
  const cityName = await resolveCityName(city);
  if (!cityName) notFound();

  const gyms = await getGymsByCity(cityName);
  if (gyms.length === 0) notFound();

  // Resolve initialCategory from ?kategorie= param (must be a known DB value)
  const { kategorie: katParam, lat: latStr, lng: lngStr } = await searchParams;
  const initialCategory = CATEGORIES.find(c => c.db === katParam)?.db ?? undefined;

  // Geolocation coords from ?lat=&lng= — passed through from homepage redirect
  const userLat = latStr ? parseFloat(latStr) : undefined;
  const userLng = lngStr ? parseFloat(lngStr) : undefined;

  const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.ironmap.cz';

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `Posilovny ${cityName}`,
            numberOfItems: gyms.length,
            itemListElement: gyms.slice(0, 20).map((g, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${BASE}${gymDetailUrl(g)}`,
              name: g.name,
            })),
          }),
        }}
      />

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
      <CityListing gyms={gyms} cityName={cityName} initialCategory={initialCategory} userLat={userLat} userLng={userLng} />
    </div>
  );
}

async function resolveCityName(citySlug: string): Promise<string | null> {
  const cities = await getCities();
  return cities.find((c) => cityToSlug(c.city) === citySlug)?.city ?? null;
}
