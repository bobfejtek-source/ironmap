'use client';

import Link from 'next/link';
import type { Gym } from '@/lib/db';
import { gymDetailUrl, getInitials } from '@/lib/utils';
import { useT } from '@/lib/i18n';

export default function GymCard({ gym }: { gym: Gym }) {
  const { t } = useT();
  const category = gym.category ?? 'Posilovna';
  const initials = getInitials(gym.name);

  return (
    <Link
      href={gymDetailUrl(gym)}
      className="iron-card iron-card-lime"
      style={{
        display: 'block',
        padding: '1.25rem',
        textDecoration: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {/* Initials box */}
        <div style={{
          width: 48,
          height: 48,
          background: '#1e1e1e',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: '0.95rem',
          letterSpacing: '0.06em',
          color: 'var(--lime)',
          flexShrink: 0,
        }}>
          {initials}
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.05rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: '0.25rem',
          }}>
            {gym.name}
          </div>

          {/* Category + address */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.62rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              border: '1px solid var(--border)',
              padding: '0.15rem 0.5rem',
              color: 'var(--lime)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              flexShrink: 0,
            }}>
              {category}
            </span>
            {gym.address && (
              <span style={{
                fontSize: '0.8rem',
                color: 'var(--muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 300,
              }}>
                {gym.address}
              </span>
            )}
          </div>

          {/* Opening hours snippet */}
          {gym.opening_hours && (
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--muted)',
              marginTop: '0.4rem',
              fontWeight: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {getHoursSnippet(gym.opening_hours)}
            </div>
          )}
        </div>

        {/* Rating */}
        {gym.rating != null && (
          <div style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '0.15rem',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: 'var(--lime)',
            }}>
              <span style={{
                width: 6, height: 6,
                background: 'var(--lime)',
                borderRadius: '50%',
                flexShrink: 0,
              }} />
              {gym.rating.toFixed(1)}
            </div>
          </div>
        )}
      </div>

      {/* Footer row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '1rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border)',
      }}>
        <span style={{
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
        }}>
          📍 {gym.city}
          {gym.verified === 1 && (
            <span style={{ color: 'var(--lime)', marginLeft: '0.5rem' }}>✓</span>
          )}
        </span>

        <span style={{
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--lime)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
        }}>
          {t.listing.dailyEntry} →
        </span>
      </div>
    </Link>
  );
}

function getHoursSnippet(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const weekday = days.find(d => parsed[d]);
      if (weekday) return `Po–Pá: ${parsed[weekday]}`;
    }
    if (typeof parsed === 'string') return parsed;
  } catch {
    // plain string
  }
  return raw.slice(0, 40);
}
