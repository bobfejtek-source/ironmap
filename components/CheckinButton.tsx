'use client';

import { useState, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000; // metres
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Props {
  gymSlug: string;
  gymLat: number | null;
  gymLng: number | null;
}

type Phase = 'idle' | 'locating' | 'fallback' | 'submitting' | 'done' | 'error';

interface NewBadge {
  id: string;
  name: string;
  icon: string;
}

export default function CheckinButton({ gymSlug, gymLat, gymLng }: Props) {
  const { data: session, status } = useSession();
  const [phase, setPhase] = useState<Phase>('idle');
  const [fallbackMsg, setFallbackMsg] = useState('');
  const [newBadges, setNewBadges] = useState<NewBadge[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const pendingCoords = useRef<{ lat: number; lng: number } | null>(null);

  async function submitCheckin(lat: number | null, lng: number | null) {
    setPhase('submitting');
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gymSlug, lat, lng }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewBadges(data.newBadges ?? []);
        setPhase('done');
      } else {
        setErrorMsg(data.error ?? 'Chyba serveru');
        setPhase('error');
      }
    } catch {
      setErrorMsg('Nepodařilo se připojit k serveru.');
      setPhase('error');
    }
  }

  async function handleCheckinClick() {
    if (status === 'loading') return;
    if (!session) {
      signIn(undefined, { callbackUrl: `/posilovny/${gymSlug}` });
      return;
    }
    if (phase === 'done') return;

    setPhase('locating');

    if (!navigator.geolocation) {
      pendingCoords.current = null;
      setFallbackMsg('Tvůj prohlížeč nepodporuje geolokaci. Přesto zaznamenat návštěvu?');
      setPhase('fallback');
      return;
    }

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10_000,
          maximumAge: 60_000,
          enableHighAccuracy: true,
        }),
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      pendingCoords.current = { lat, lng };

      if (gymLat !== null && gymLng !== null) {
        const dist = haversineDistance(lat, lng, gymLat, gymLng);
        if (dist > 300) {
          setFallbackMsg(
            `Zdá se, že nejsi v této posilovně (${Math.round(dist)} m daleko). Přesto zaznamenat návštěvu?`,
          );
          setPhase('fallback');
          return;
        }
      }

      await submitCheckin(lat, lng);
    } catch {
      pendingCoords.current = null;
      setFallbackMsg('Nepodařilo se zjistit tvou polohu. Přesto zaznamenat návštěvu?');
      setPhase('fallback');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === 'done') {
    return (
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--lime)',
        padding: '1.5rem 2rem',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: '1.1rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--lime)',
          marginBottom: newBadges.length ? '1rem' : 0,
        }}>
          ✓ Check-in zaznamenán!
        </div>

        {newBadges.length > 0 && (
          <div>
            <div style={{
              fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700,
              marginBottom: '0.75rem',
            }}>
              Nové odznaky
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {newBadges.map((b) => (
                <div key={b.id} style={{
                  border: '1px solid var(--lime)',
                  padding: '0.5rem 0.75rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  animation: 'slideUp 0.3s ease',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{b.icon}</span>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--lime)',
                  }}>
                    {b.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'fallback') {
    return (
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-mid)',
        padding: '1.5rem 2rem',
      }}>
        <p style={{
          color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 300,
          lineHeight: 1.6, marginBottom: '1.25rem',
        }}>
          {fallbackMsg}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => submitCheckin(pendingCoords.current?.lat ?? null, pendingCoords.current?.lng ?? null)}
            className="iron-btn iron-btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem' }}
          >
            Ano, zaznamenat →
          </button>
          <button
            onClick={() => { setPhase('idle'); pendingCoords.current = null; }}
            className="iron-btn iron-btn-outline"
            style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem' }}
          >
            Zrušit
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={{
        border: '1px solid #ef4444', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
      }}>
        <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 300 }}>{errorMsg}</span>
        <button
          onClick={() => setPhase('idle')}
          className="iron-btn iron-btn-outline"
          style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}
        >
          Zkusit znovu
        </button>
      </div>
    );
  }

  const isLocating = phase === 'locating' || phase === 'submitting';
  const label = !session
    ? 'Přihlásit se a zaznamenat návštěvu'
    : isLocating
      ? phase === 'locating' ? 'Zjišťuji polohu...' : 'Ukládám...'
      : 'Byl jsem tady';

  return (
    <button
      onClick={handleCheckinClick}
      disabled={isLocating}
      className="iron-btn iron-btn-primary"
      style={{
        fontSize: '0.95rem',
        padding: '0.85rem 2rem',
        opacity: isLocating ? 0.7 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {isLocating ? (
        <>
          <span style={{
            width: 14, height: 14, border: '2px solid var(--black)',
            borderTopColor: 'transparent', borderRadius: '50%',
            display: 'inline-block', animation: 'spin 0.7s linear infinite',
          }} />
          {label}
        </>
      ) : (
        <>◉ {label}</>
      )}
    </button>
  );
}
