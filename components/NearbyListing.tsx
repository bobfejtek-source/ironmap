'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Gym } from '@/lib/db';
import GymCard from './GymCard';
import { useT } from '@/lib/i18n';
import { cityUrl } from '@/lib/utils';
import type { MapPin } from './MapView';

function MapLoader() {
  const { t } = useT();
  return (
    <div style={{
      width: '100%', height: '100%', background: '#111',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--muted)', fontSize: '0.75rem', letterSpacing: '0.15em',
      textTransform: 'uppercase', fontFamily: 'var(--font-display)', fontWeight: 700,
    }}>
      {t.nearby.loadingMap}
    </div>
  );
}

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <MapLoader />
  ),
});

const RADIUS_OPTIONS = [5, 10, 20, 50] as const;
type Radius = typeof RADIUS_OPTIONS[number];

const CATEGORY_VALUES = ['Vše', 'Posilovna', 'CrossFit', 'Jóga', 'Pilates', 'Outdoor', 'Bojové sporty', 'Spinning', 'Bazén'];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, r = (x: number) => x * Math.PI / 180;
  const dl = r(lat2 - lat1), dn = r(lng2 - lng1);
  const a = Math.sin(dl / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dn / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function gymDistance(gym: Gym, lat: number, lng: number): number | null {
  if (!gym.coordinates) return null;
  try {
    const c = JSON.parse(gym.coordinates);
    return haversineKm(lat, lng, c.lat, c.lng);
  } catch { return null; }
}

interface Props {
  gyms: Gym[];
  userLat: number;
  userLng: number;
}

export default function NearbyListing({ gyms, userLat, userLng }: Props) {
  const { t } = useT();
  const [radius, setRadius] = useState<Radius>(20);
  const [category, setCategory] = useState('Vše');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const categoryLabels: Record<string, string> = {
    'Vše': t.categories.all,
    'Posilovna': t.categories.gym,
    'CrossFit': t.categories.crossfit,
    'Jóga': t.categories.yoga,
    'Pilates': t.categories.pilates,
    'Outdoor': t.categories.outdoor,
    'Bojové sporty': t.categories.martial,
    'Spinning': t.categories.spinning,
    'Bazén': t.categories.pool,
  };

  const nearbyWithDist = useMemo(() => {
    return gyms
      .map(g => ({ gym: g, dist: gymDistance(g, userLat, userLng) }))
      .filter(({ dist }) => dist != null && dist <= radius)
      .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity)) as { gym: Gym; dist: number }[];
  }, [gyms, userLat, userLng, radius]);

  const filtered = useMemo(() => {
    if (category === 'Vše') return nearbyWithDist;
    return nearbyWithDist.filter(({ gym: g }) => (g.category ?? 'Posilovna') === category);
  }, [nearbyWithDist, category]);

  const nearestCity = useMemo(() => {
    const cities = new Map<string, number>();
    for (const g of gyms) {
      const d = gymDistance(g, userLat, userLng);
      if (d == null) continue;
      const prev = cities.get(g.city);
      if (prev == null || d < prev) cities.set(g.city, d);
    }
    let best: string | null = null, bestD = Infinity;
    cities.forEach((d, city) => { if (d < bestD) { best = city; bestD = d; } });
    return best;
  }, [gyms, userLat, userLng]);

  const pins: MapPin[] = useMemo(() =>
    filtered
      .filter(({ gym: g }) => g.coordinates)
      .map(({ gym: g }) => {
        try {
          const c = JSON.parse(g.coordinates!);
          return { lat: c.lat, lng: c.lng, name: g.name, id: String(g.id) };
        } catch { return null; }
      })
      .filter(Boolean) as MapPin[]
  , [filtered]);

  const handlePinClick = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(`nearby-card-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const noResults = nearbyWithDist.length === 0;
  const countLabel = `${noResults ? '0' : filtered.length} ${t.listing.found} · ${radius} km`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Mobile compact header — single line, hidden on desktop */}
      <div className="nearby-mobile-header" style={{
        display: 'none',
        alignItems: 'center',
        padding: '0 1rem',
        height: 52,
        borderBottom: '1px solid var(--border)',
        background: 'var(--off-black)',
        gap: '0.5rem',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        <Link href="/" style={{
          fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700,
          textDecoration: 'none', flexShrink: 0,
        }}>IRON</Link>
        <span style={{ color: 'var(--border-mid)', fontSize: '0.65rem', flexShrink: 0 }}>—</span>
        <Link href="/posilovny" style={{
          fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700,
          textDecoration: 'none', flexShrink: 0,
        }}>{t.cityPage.breadcrumb}</Link>
        <span style={{ color: 'var(--border-mid)', fontSize: '0.65rem', flexShrink: 0 }}>—</span>
        <span style={{
          fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 700,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{t.nearby.breadcrumb}</span>
        <span style={{
          marginLeft: 'auto', flexShrink: 0,
          fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          {countLabel}
        </span>
      </div>

      {/* Desktop header — hidden on mobile */}
      <div className="nearby-desktop-header" style={{
        padding: '2rem 2rem 0',
        borderBottom: '1px solid var(--border)',
        background: 'var(--off-black)',
      }}>
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
          <Link href="/" style={{ color: 'var(--muted)' }}>IRON</Link>
          <span style={{ color: 'var(--border-mid)' }}>—</span>
          <Link href="/posilovny" style={{ color: 'var(--muted)' }}>{t.cityPage.breadcrumb}</Link>
          <span style={{ color: 'var(--border-mid)' }}>—</span>
          <span style={{ color: 'var(--text)' }}>{t.nearby.breadcrumb}</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(1.6rem, 4vw, 3rem)',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            lineHeight: 0.9,
          }}>
            {t.nearby.title.split(' ').slice(0, -2).join(' ')}{' '}
            <span style={{ color: 'var(--lime)' }}>{t.nearby.title.split(' ').slice(-2).join(' ')}</span>
          </h1>
          <div style={{
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            textAlign: 'right',
          }}>
            {noResults ? '0' : filtered.length} {t.listing.found} do {radius} km
          </div>
        </div>
      </div>

      {/* Filter bar — single scrollable row on mobile, labels hidden */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--off-black)',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        overflowX: 'auto',
        flexShrink: 0,
        flexWrap: 'nowrap',
      }}>
        <span className="nearby-filter-label" style={{
          fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700,
          flexShrink: 0, marginRight: '0.25rem',
        }}>
          {t.nearby.radius}
        </span>
        {RADIUS_OPTIONS.map(r => (
          <button
            key={r}
            className={`chip${radius === r ? ' active' : ''}`}
            onClick={() => setRadius(r)}
            style={{ flexShrink: 0 }}
          >
            {r} km
          </button>
        ))}

        <div style={{ width: '1px', height: 20, background: 'var(--border)', flexShrink: 0, margin: '0 0.25rem' }} />

        <span className="nearby-filter-label" style={{
          fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700,
          flexShrink: 0, marginRight: '0.25rem',
        }}>
          {t.listing.filters.category}:
        </span>
        {CATEGORY_VALUES.map(cat => (
          <button
            key={cat}
            className={`chip${category === cat ? ' active' : ''}`}
            onClick={() => setCategory(cat)}
            style={{ flexShrink: 0 }}
          >
            {categoryLabels[cat] ?? cat}
          </button>
        ))}

        {category !== 'Vše' && (
          <button
            onClick={() => setCategory('Vše')}
            style={{
              fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--muted)', background: 'none', border: 'none', cursor: 'crosshair',
              fontFamily: 'var(--font-display)', fontWeight: 700, flexShrink: 0,
              marginLeft: '0.5rem', transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            × {t.listing.filters.reset}
          </button>
        )}
      </div>

      {/* No results fallback */}
      {noResults ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem',
            letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)',
            marginBottom: '1.5rem',
          }}>
            {t.nearby.noGymsTitle.replace('{radius}', String(radius))}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 300, marginBottom: '2rem' }}>
            {t.nearby.noGymsSub}
          </p>
          {nearestCity && (
            <Link
              href={cityUrl(nearestCity)}
              style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.72rem',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--lime)', border: '1px solid var(--lime)',
                padding: '0.6rem 1.2rem', textDecoration: 'none', transition: 'opacity 0.15s',
              }}
            >
              {t.nearby.viewCity.replace('{city}', nearestCity ?? '')}
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile map toggle button — hidden on desktop */}
          <button
            className="mobile-map-toggle"
            onClick={() => setMapOpen(v => !v)}
            style={{ display: 'none' }}
          >
            <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>{mapOpen ? '↑' : '↓'}</span>
            {mapOpen ? t.nearby.hideMap : t.nearby.showMap}
          </button>

          {/* Map + List */}
          <div
            style={{ display: 'grid', gridTemplateColumns: '44% 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}
            className={`city-listing-grid${mapOpen ? ' map-open' : ''}`}
          >
            {/* Map */}
            <div style={{
              position: 'sticky', top: 64,
              height: 'calc(100vh - 64px - 52px - 48px)',
              borderRight: '1px solid var(--border)',
            }}>
              <MapView
                pins={pins}
                center={[userLat, userLng]}
                zoom={radius <= 5 ? 13 : radius <= 10 ? 12 : radius <= 20 ? 11 : 10}
                onPinClick={handlePinClick}
                height="100%"
              />
            </div>

            {/* Gym list */}
            <div
              ref={listRef}
              style={{
                overflowY: 'auto',
                height: 'calc(100vh - 64px - 52px - 48px)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{
                fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700,
                paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)',
              }}>
                {filtered.length} {t.nearby.sorted}
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 300 }}>
                  {t.nearby.noCategory}
                </div>
              ) : (
                filtered.map(({ gym, dist }) => (
                  <div
                    key={gym.id}
                    id={`nearby-card-${gym.id}`}
                    style={{
                      outline: activeId === String(gym.id) ? '1px solid var(--lime)' : 'none',
                      transition: 'outline 0.2s',
                    }}
                  >
                    <GymCard gym={gym} distanceKm={dist} />
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 900px) {
          .nearby-mobile-header { display: flex !important; }
          .nearby-desktop-header { display: none !important; }
          .nearby-filter-label { display: none !important; }

          .mobile-map-toggle {
            display: flex !important;
            width: 100%;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            padding: 0.6rem 1rem;
            background: var(--off-black);
            border: none;
            border-bottom: 1px solid var(--border);
            cursor: pointer;
            font-family: var(--font-display);
            font-weight: 700;
            font-size: 0.65rem;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: var(--muted);
            flex-shrink: 0;
            transition: color 0.15s;
          }
          .mobile-map-toggle:hover { color: var(--text); }

          .city-listing-grid { grid-template-columns: 1fr !important; overflow: visible !important; }
          .city-listing-grid > div:first-child {
            position: relative !important;
            top: 0 !important;
            height: 220px !important;
            border-right: none !important;
            border-bottom: 1px solid var(--border);
            display: none !important;
          }
          .city-listing-grid.map-open > div:first-child {
            display: block !important;
          }
          .city-listing-grid > div:last-child {
            height: auto !important;
            max-height: none !important;
            overflow-y: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
