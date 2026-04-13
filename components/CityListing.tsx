'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Gym } from '@/lib/db';
import GymCard from './GymCard';
import { useT } from '@/lib/i18n';
import type { MapPin } from './MapView';

function CityMapLoader() {
  const { t } = useT();
  return (
    <div style={{
      width: '100%', height: '100%', background: '#111',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--muted)', fontSize: '0.75rem', letterSpacing: '0.15em',
      textTransform: 'uppercase', fontFamily: 'var(--font-display)', fontWeight: 700,
    }}>
      {t.detail.loadingMap}
    </div>
  );
}

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: CityMapLoader,
});

// Czech DB values used for filtering — display labels come from t.categories
const CATEGORY_VALUES = ['Vše', 'Posilovna', 'CrossFit', 'Jóga', 'Pilates', 'Outdoor', 'Bojové sporty', 'Spinning', 'Bazén'];

const AMENITY_FILTERS: { key: string; label: string; field: keyof import('@/lib/db').Gym }[] = [
  { key: 'multisport', label: 'MultiSport', field: 'multisport' },
  { key: '247',        label: '24/7',       field: 'is_24_7' },
  { key: 'sprchy',     label: 'Sprchy',     field: 'has_showers' },
  { key: 'parking',    label: 'Parking',    field: 'has_parking' },
  { key: 'sauna',      label: 'Sauna',      field: 'has_sauna' },
  { key: 'bazen',      label: 'Bazén',      field: 'has_pool' },
  { key: 'lekce',      label: 'Skupin. lekce', field: 'has_classes' },
];

function isOpenNow(raw: string | null): boolean | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    const h = parsed[today];
    if (!h) return false;
    const m = h.match(/(\d{1,2})[:.h](\d{2})[–\-](\d{1,2})[:.h](\d{2})/);
    if (!m) return null;
    const now = new Date().getHours() * 60 + new Date().getMinutes();
    const open = parseInt(m[1]) * 60 + parseInt(m[2]);
    const close = parseInt(m[3]) * 60 + parseInt(m[4]);
    return now >= open && now <= close;
  } catch { return null; }
}

interface Props {
  gyms: Gym[];
  cityName: string;
  initialCategory?: string;
  userLat?: number;
  userLng?: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, r = (x: number) => x * Math.PI / 180;
  const dl = r(lat2 - lat1), dn = r(lng2 - lng1);
  const a = Math.sin(dl / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dn / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CityListing({ gyms, cityName, initialCategory, userLat, userLng }: Props) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [category, setCategory] = useState(initialCategory ?? 'Vše');
  const [openNow, setOpenNow] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [amenities, setAmenities] = useState<Set<string>>(new Set());

  function buildParams(cat: string, amenSet: Set<string>): string {
    const params = new URLSearchParams();
    if (cat !== 'Vše') params.set('kategorie', cat);
    if (amenSet.size > 0) params.set('vybaveni', [...amenSet].join(','));
    return params.toString();
  }

  function selectCategory(cat: string) {
    setCategory(cat);
    const qs = buildParams(cat, amenities);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggleAmenity(key: string) {
    setAmenities(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      const qs = buildParams(category, next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      return next;
    });
  }
  const [activeId, setActiveId] = useState<string | null>(null);
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

  const geoActive = userLat != null && userLng != null;

  const filtered = useMemo(() => {
    let result = gyms.filter(g => {
      if (category !== 'Vše' && (g.category ?? 'Posilovna') !== category) return false;
      if (openNow) {
        const open = isOpenNow(g.opening_hours);
        if (open === false) return false;
      }
      for (const key of amenities) {
        const def = AMENITY_FILTERS.find(a => a.key === key);
        if (def && g[def.field] !== true) return false;
      }
      return true;
    });

    if (geoActive) {
      result = result.slice().sort((a, b) => {
        const distA = (() => { try { const c = JSON.parse(a.coordinates!); return haversineKm(userLat!, userLng!, c.lat, c.lng); } catch { return Infinity; } })();
        const distB = (() => { try { const c = JSON.parse(b.coordinates!); return haversineKm(userLat!, userLng!, c.lat, c.lng); } catch { return Infinity; } })();
        return distA - distB;
      });
    }
    return result;
  }, [gyms, category, openNow, geoActive, userLat, userLng]);

  const pins: MapPin[] = useMemo(() =>
    filtered
      .filter(g => g.coordinates)
      .map(g => {
        try {
          const c = JSON.parse(g.coordinates!);
          return { lat: c.lat, lng: c.lng, name: g.name, id: String(g.id) };
        } catch { return null; }
      })
      .filter(Boolean) as MapPin[]
  , [filtered]);

  const hasFilters = category !== 'Vše' || openNow || amenities.size > 0;

  const handlePinClick = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(`gym-card-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Filters bar — single scrollable row, label hidden on mobile */}
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
        <span className="city-filter-label" style={{
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          flexShrink: 0,
          marginRight: '0.5rem',
        }}>
          {t.listing.filters.category}:
        </span>

        {CATEGORY_VALUES.map(cat => (
          <button
            key={cat}
            className={`chip${category === cat ? ' active' : ''}`}
            onClick={() => selectCategory(cat)}
            style={{ flexShrink: 0 }}
          >
            {categoryLabels[cat] ?? cat}
          </button>
        ))}

        <div style={{ width: '1px', height: '20px', background: 'var(--border)', flexShrink: 0, margin: '0 0.5rem' }} />

        <button
          className={`chip${openNow ? ' active' : ''}`}
          onClick={() => setOpenNow(v => !v)}
          style={{ flexShrink: 0 }}
        >
          {t.listing.filters.openNow}
        </button>

        <div style={{ width: '1px', height: '20px', background: 'var(--border)', flexShrink: 0, margin: '0 0.5rem' }} />

        {AMENITY_FILTERS.map(a => (
          <button
            key={a.key}
            className={`chip${amenities.has(a.key) ? ' active' : ''}`}
            onClick={() => toggleAmenity(a.key)}
            style={{ flexShrink: 0 }}
          >
            {a.label}
          </button>
        ))}

        {hasFilters && (
          <button
            onClick={() => { selectCategory('Vše'); setOpenNow(false); setAmenities(new Set()); }}
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              background: 'none',
              border: 'none',
              cursor: 'crosshair',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              flexShrink: 0,
              marginLeft: '0.5rem',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            × {t.listing.filters.reset}
          </button>
        )}
      </div>

      {/* Mobile map toggle — hidden on desktop */}
      <button
        className="mobile-map-toggle"
        onClick={() => setMapOpen(v => !v)}
        style={{ display: 'none' }}
      >
        <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>{mapOpen ? '↑' : '↓'}</span>
        {mapOpen ? t.nearby.hideMap : t.nearby.showMap}
      </button>

      {/* Map + List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '44% 1fr',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
        className={`city-listing-grid${mapOpen ? ' map-open' : ''}`}
      >
        {/* Map */}
        <div style={{
          position: 'sticky',
          top: 64,
          height: 'calc(100vh - 64px - 52px)',
          borderRight: '1px solid var(--border)',
        }}>
          <MapView
            pins={pins}
            zoom={12}
            onPinClick={handlePinClick}
            height="100%"
          />
        </div>

        {/* Gym list */}
        <div
          ref={listRef}
          style={{
            overflowY: 'auto',
            height: 'calc(100vh - 64px - 52px)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {/* Count */}
          <div style={{
            fontSize: '0.72rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border)',
          }}>
            {filtered.length} {t.listing.found} — {cityName}
          </div>

          {filtered.length === 0 ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: '0.85rem',
              fontWeight: 300,
            }}>
              {t.listing.noResults}
            </div>
          ) : (
            filtered.map(gym => {
              const distanceKm = geoActive && gym.coordinates
                ? (() => { try { const c = JSON.parse(gym.coordinates!); return haversineKm(userLat!, userLng!, c.lat, c.lng); } catch { return undefined; } })()
                : undefined;
              return (
                <div
                  key={gym.id}
                  id={`gym-card-${gym.id}`}
                  style={{
                    outline: activeId === String(gym.id) ? '1px solid var(--lime)' : 'none',
                    transition: 'outline 0.2s',
                  }}
                >
                  <GymCard gym={gym} hideCity distanceKm={distanceKm} />
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .city-filter-label { display: none !important; }

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
            overflow-y: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
