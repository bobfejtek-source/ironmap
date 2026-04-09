'use client';

import { useState, useMemo, useRef } from 'react';
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
}

export default function CityListing({ gyms, cityName }: Props) {
  const { t } = useT();
  const [category, setCategory] = useState('Vše');
  const [openNow, setOpenNow] = useState(false);
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

  const filtered = useMemo(() => {
    return gyms.filter(g => {
      if (category !== 'Vše' && (g.category ?? 'Posilovna') !== category) return false;
      if (openNow) {
        const open = isOpenNow(g.opening_hours);
        if (open === false) return false;
      }
      return true;
    });
  }, [gyms, category, openNow]);

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

  const hasFilters = category !== 'Vše' || openNow;

  const handlePinClick = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(`gym-card-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Filters bar */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--off-black)',
        padding: '0.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        <span style={{
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
            onClick={() => setCategory(cat)}
          >
            {categoryLabels[cat] ?? cat}
          </button>
        ))}

        <div style={{ width: '1px', height: '20px', background: 'var(--border)', flexShrink: 0, margin: '0 0.5rem' }} />

        <button
          className={`chip${openNow ? ' active' : ''}`}
          onClick={() => setOpenNow(v => !v)}
        >
          {t.listing.filters.openNow}
        </button>

        {hasFilters && (
          <button
            onClick={() => { setCategory('Vše'); setOpenNow(false); }}
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

      {/* Map + List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '44% 1fr',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
        className="city-listing-grid"
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
            filtered.map(gym => (
              <div
                key={gym.id}
                id={`gym-card-${gym.id}`}
                style={{
                  outline: activeId === String(gym.id) ? '1px solid var(--lime)' : 'none',
                  transition: 'outline 0.2s',
                }}
              >
                <GymCard gym={gym} hideCity />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mobile: stack map on top */}
      <style>{`
        @media (max-width: 900px) {
          .city-listing-grid {
            grid-template-columns: 1fr !important;
          }
          .city-listing-grid > div:first-child {
            position: relative !important;
            top: 0 !important;
            height: 280px !important;
          }
          .city-listing-grid > div:last-child {
            height: auto !important;
            max-height: 60vh;
          }
        }
      `}</style>
    </div>
  );
}
