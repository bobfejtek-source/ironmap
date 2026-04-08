'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import type { CheckinRow, BadgeRow, UserStats } from '@/lib/db-users';
import type { BadgeProgressMap } from '@/lib/badges';
import { parseCoordinates } from '@/lib/utils';
import BadgeGrid from './BadgeGrid';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: 360, background: '#111', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: 'var(--muted)', fontSize: '0.75rem',
      letterSpacing: '0.15em', textTransform: 'uppercase',
      fontFamily: 'var(--font-display)', fontWeight: 700,
    }}>
      Načítám mapu...
    </div>
  ),
});

interface Props {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  checkins: CheckinRow[];
  badges: BadgeRow[];
  stats: UserStats;
  badgeProgress: BadgeProgressMap;
}

export default function ProfilClient({ user, checkins, badges, stats, badgeProgress }: Props) {
  const earnedBadgeIds = badges.map((b) => b.badge_type);

  // Build map pins from visited gyms (unique per gym)
  const seen = new Set<string>();
  const mapPins: { lat: number; lng: number; name: string }[] = [];
  for (const c of checkins) {
    if (!c.gym_id || seen.has(c.gym_id)) continue;
    seen.add(c.gym_id);
    if (c.gym_coordinates) {
      const coords = parseCoordinates(c.gym_coordinates);
      if (coords) mapPins.push({ lat: coords.lat, lng: coords.lng, name: c.gym_name ?? c.gym_id });
    }
  }

  const initials = user.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 2rem) 6rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <div className="iron-label" style={{ marginBottom: '1.5rem' }}>Profil</div>

        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          padding: 'clamp(1rem, 3vw, 2rem) clamp(1rem, 4vw, 2.5rem)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, flexShrink: 0,
            border: '1px solid var(--border-mid)',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--off-black)',
          }}>
            {user.image ? (
              <Image src={user.image} alt={user.name ?? 'Avatar'} width={72} height={72} style={{ objectFit: 'cover' }} />
            ) : (
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 900,
                fontSize: '1.75rem', letterSpacing: '0.05em', color: 'var(--lime)',
              }}>
                {initials}
              </span>
            )}
          </div>

          {/* Name / email */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(1.75rem, 4vw, 3rem)',
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              lineHeight: 0.95,
              marginBottom: '0.35rem',
            }}>
              {user.name ?? 'Uživatel'}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 300 }}>
              {user.email}
            </p>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', width: '100%' }}>
            <Stat value={stats.totalCheckins} label="check-inů" />
            <Stat value={stats.uniqueGyms} label="gymů" />
            <Stat value={stats.uniqueCities} label="měst" />
            <Stat value={badges.length} label="odznaků" />
          </div>
        </div>
      </div>

      {/* Map of visited gyms */}
      {mapPins.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <div className="iron-label" style={{ marginBottom: '1.25rem' }}>Navštívené posilovny</div>
          <div style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
            <MapView pins={mapPins} height="360px" />
          </div>
        </section>
      )}

      {/* Badges */}
      <section style={{ marginBottom: '3rem' }}>
        <div className="iron-label" style={{ marginBottom: '1.25rem' }}>Odznaky</div>
        <BadgeGrid earnedIds={earnedBadgeIds} progress={badgeProgress} />
      </section>

      {/* Recent check-ins */}
      {checkins.length > 0 && (
        <section>
          <div className="iron-label" style={{ marginBottom: '1.25rem' }}>Poslední check-iny</div>
          <div style={{
            display: 'flex', flexDirection: 'column',
            border: '1px solid var(--border)',
          }}>
            {checkins.slice(0, 20).map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--card-bg)',
                }}
              >
                {/* Dot */}
                <div style={{ width: 8, height: 8, background: 'var(--lime)', flexShrink: 0 }} />

                {/* Gym info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    fontSize: '0.9rem', letterSpacing: '0.04em',
                    textTransform: 'uppercase', color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {c.gym_name ?? c.gym_id}
                  </div>
                  {c.gym_city && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 300, marginTop: '0.1rem' }}>
                      {c.gym_city}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div style={{
                  fontSize: '0.72rem', letterSpacing: '0.08em',
                  color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {formatCheckinDate(c.checked_in_at)}
                </div>

                {/* Link */}
                <Link
                  href={`/posilovny/${c.gym_city ? encodeURIComponent(c.gym_city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) : '_'}/${c.gym_id}`}
                  style={{
                    fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0,
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--lime)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  ↗
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Danger zone */}
      <section style={{ marginTop: '4rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
        <div className="iron-label" style={{ marginBottom: '1rem', color: 'var(--muted)' }}>Správa účtu</div>
        <DeleteAccountButton />
      </section>

      {checkins.length === 0 && (
        <div style={{
          border: '1px solid var(--border)',
          padding: '3rem 2rem',
          textAlign: 'center',
          background: 'var(--card-bg)',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: '1.25rem', textTransform: 'uppercase', color: 'var(--muted)',
            marginBottom: '0.75rem',
          }}>
            Žádné check-iny
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 300 }}>
            Navštiv posilovnu a klikni na tlačítko &quot;Byl jsem tady&quot;.
          </p>
          <Link
            href="/posilovny"
            className="iron-btn iron-btn-ghost"
            style={{ display: 'inline-flex', marginTop: '1.5rem', fontSize: '0.85rem' }}
          >
            Najít posilovnu →
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: '2rem',
        letterSpacing: '-0.02em',
        color: 'var(--lime)',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '0.65rem', letterSpacing: '0.15em',
        textTransform: 'uppercase', color: 'var(--muted)',
        fontFamily: 'var(--font-display)', fontWeight: 700,
        marginTop: '0.2rem',
      }}>
        {label}
      </div>
    </div>
  );
}

function DeleteAccountButton() {
  const [step, setStep] = useState<'idle' | 'confirm' | 'loading'>('idle');

  async function handleDelete() {
    setStep('loading');
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      await signOut({ callbackUrl: '/' });
    } catch {
      setStep('confirm');
      alert('Nepodařilo se smazat účet. Zkus to znovu.');
    }
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('confirm')}
        style={{
          background: 'transparent', border: '1px solid #333',
          color: 'var(--muted)', padding: '0.5rem 1.25rem',
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.color = '#c0392b'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = 'var(--muted)'; }}
      >
        Smazat účet
      </button>
    );
  }

  if (step === 'confirm') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 300 }}>
          Opravdu smazat? Tato akce je nevratná.
        </span>
        <button
          onClick={handleDelete}
          style={{
            background: '#c0392b', border: 'none', color: '#fff',
            padding: '0.5rem 1.25rem',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Ano, smazat
        </button>
        <button
          onClick={() => setStep('idle')}
          style={{
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
            padding: '0.5rem 1rem',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Zrušit
        </button>
      </div>
    );
  }

  return (
    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Mazání…</span>
  );
}

function formatCheckinDate(raw: string): string {
  try {
    const d = new Date(raw);
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return raw;
  }
}
