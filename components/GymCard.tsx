'use client';

import Link from 'next/link';
import type { Gym } from '@/lib/db';
import {
  gymDetailUrl, getInitials, getNeighborhood, getDisplayCity,
  parseOpeningHours, getTodayKey, getOpenStatus, formatHoursShort,
} from '@/lib/utils';
import { useT } from '@/lib/i18n';

const CATEGORY_KEY: Record<string, string> = {
  'Posilovna': 'gym',
  'CrossFit': 'crossfit',
  'Jóga': 'yoga',
  'Pilates': 'pilates',
  'Outdoor': 'outdoor',
  'Bojové sporty': 'martial',
  'Spinning': 'spinning',
  'Bazén': 'pool',
};

interface Props {
  gym: Gym;
  hideCity?: boolean;
  distanceKm?: number;
}

export default function GymCard({ gym, hideCity = false, distanceKm }: Props) {
  const { t } = useT();
  const category = gym.category ?? 'Posilovna';
  const key = CATEGORY_KEY[category];
  const categoryLabel = key ? (t.categories as Record<string, string>)[key] ?? category : category;
  const initials = getInitials(gym.name);

  // Neighborhood
  const displayCity = getDisplayCity(gym);
  const rawNeighborhood = getNeighborhood(gym.address, displayCity);
  const neighborhood = rawNeighborhood !== displayCity
    ? `${rawNeighborhood}, ${displayCity}`
    : displayCity;

  // Today's hours + open status
  const hours    = parseOpeningHours(gym.opening_hours);
  const todayKey = getTodayKey();
  const todayRaw = hours?.[todayKey] ?? null;
  const status   = getOpenStatus(todayRaw);
  const todayFmt = todayRaw ? formatHoursShort(todayRaw) : null;

  // Price display
  const hasPrice = gym.price_verified && (gym.daily_price || gym.monthly_price);
  const priceLabel = gym.price_verified && gym.daily_price && gym.monthly_price
    ? `${t.gymCard.dropInFrom} ${gym.daily_price} ${t.gymCard.currency} | ${t.gymCard.membershipFrom} ${gym.monthly_price} ${t.gymCard.currency}`
    : gym.price_verified && gym.daily_price
    ? `${t.gymCard.dropInFrom} ${gym.daily_price} ${t.gymCard.currency}`
    : gym.price_verified && gym.monthly_price
    ? `${t.gymCard.membershipFrom} ${gym.monthly_price} ${t.gymCard.currency}`
    : null;

  return (
    <Link
      href={gymDetailUrl(gym)}
      className="iron-card iron-card-lime"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '1.25rem',
        textDecoration: 'none',
        boxSizing: 'border-box',
        gap: '0.75rem',
      }}
    >
      {/* Row 1: Category tag + Distance + Rating */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
          <span style={{
            fontSize: '0.6rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            border: '1px solid var(--border)',
            padding: '0.15rem 0.5rem',
            color: 'var(--lime)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {categoryLabel}
          </span>
          {gym.multisport === true && (
            <span style={{
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              border: '1px solid #22c55e',
              padding: '0.15rem 0.5rem',
              color: '#22c55e',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              flexShrink: 0,
            }}>
              MultiSport ✓
            </span>
          )}
          {distanceKm != null && (
            <span style={{
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--muted)',
              flexShrink: 0,
            }}>
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
            </span>
          )}
        </div>

        {gym.rating != null ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
          }}>
            <span style={{ color: 'var(--lime)', fontSize: '0.85rem' }}>★</span>
            <span style={{ color: 'var(--text)', fontSize: '0.95rem' }}>
              {gym.rating.toFixed(1)}
            </span>
            {gym.rating_count != null && (
              <span style={{ color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 300 }}>
                · {gym.rating_count}
              </span>
            )}
          </div>
        ) : (
          <span style={{ color: 'var(--border-mid)', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            —
          </span>
        )}
      </div>

      {/* Row 2: Initials + Name + Neighborhood */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div style={{
          width: 36,
          height: 36,
          background: '#1e1e1e',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: '0.78rem',
          letterSpacing: '0.06em',
          color: 'var(--muted)',
          flexShrink: 0,
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
          }}>
            {gym.name}
          </div>
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--muted)',
            fontWeight: 300,
            marginTop: '0.15rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {neighborhood}
          </div>
        </div>
      </div>

      {/* Row 3: Open status + today's hours */}
      {todayFmt && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {status !== null ? (
            <>
              <span style={{
                width: 7, height: 7,
                borderRadius: '50%',
                background: status.open ? '#6ee96e' : 'var(--muted)',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: status.open ? '#6ee96e' : 'var(--muted)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                {status.open ? t.gymCard.open : t.gymCard.closed}
              </span>
              <span style={{ color: 'var(--border-mid)', fontSize: '0.72rem' }}>·</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 300 }}>
                {status.open
                  ? `${t.gymCard.until} ${status.closesAt}`
                  : status.opensAt ? `${t.gymCard.opens} ${status.opensAt}` : todayFmt}
              </span>
            </>
          ) : (
            <>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 300 }}>
                {todayFmt}
              </span>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border)',
      }}>
        {!hideCity && displayCity && (
          <span style={{
            fontSize: '0.68rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
          }}>
            {displayCity}
            {gym.verified === 1 && (
              <span style={{ color: 'var(--lime)', marginLeft: '0.4rem' }}>✓</span>
            )}
          </span>
        )}

        <span style={{
          fontSize: '0.68rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: hasPrice ? 'var(--text)' : 'var(--lime)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          marginLeft: hideCity ? 'auto' : undefined,
        }}>
          {priceLabel ?? t.gymCard.detail}
        </span>
      </div>
    </Link>
  );
}
