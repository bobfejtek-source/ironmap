'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  photos: string | null;
  gymName: string;
  gymId: number;
}

const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? 'https://pub-06c0095bbd6747039db9b7f302a13d2b.r2.dev';

const CameraIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

export default function GymPhotoGallery({ photos, gymName, gymId }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  let refs: string[] = [];
  try {
    if (photos) refs = (JSON.parse(photos) as string[]).slice(0, 5);
  } catch { /* invalid JSON → treat as no photos */ }

  const photoUrl = (_ref: string, idx: number) => `${R2_BASE}/photos/${gymId}_${idx + 1}.jpg`;
  const prev = () => setLightbox(i => i != null ? (i - 1 + refs.length) % refs.length : null);
  const next = () => setLightbox(i => i != null ? (i + 1) % refs.length : null);

  // ── Case 1: No photos → full-width CTA placeholder ────────────────────────
  if (refs.length === 0) {
    return (
      <div style={{
        marginBottom: '1.5rem',
        height: 220,
        background: '#1a1a1a',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
      }}>
        <div style={{ color: 'var(--muted)', marginBottom: '0.25rem' }}>
          <CameraIcon />
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.65rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}>
          Jste majitel tohoto gymu?
        </div>
        <div style={{
          fontSize: '0.78rem',
          fontWeight: 300,
          color: 'var(--muted)',
          opacity: 0.7,
        }}>
          Přidejte fotky a přilákejte nové zákazníky
        </div>
        <Link
          href="/pro-majitele"
          className="iron-btn-ghost"
          style={{
            marginTop: '0.5rem',
            fontSize: '0.68rem',
            letterSpacing: '0.1em',
            padding: '0.4rem 1rem',
            textDecoration: 'none',
          }}
        >
          Přidat fotky →
        </Link>
      </div>
    );
  }

  // ── Case 2: Has photos ─────────────────────────────────────────────────────
  const showAddCard = refs.length < 5;

  return (
    <>
      {/* Gallery strip */}
      <div style={{
        marginBottom: '1.5rem',
        overflowX: 'auto',
        display: 'flex',
        gap: '0.5rem',
        paddingBottom: '0.25rem',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--border) transparent',
      }}>
        {refs.map((ref, i) => (
          <button
            key={ref}
            onClick={() => setLightbox(i)}
            style={{
              flexShrink: 0,
              width: 220,
              height: 148,
              border: '1px solid var(--border)',
              background: '#111',
              padding: 0,
              cursor: 'crosshair',
              overflow: 'hidden',
              display: 'block',
              position: 'relative',
            }}
            aria-label={`Foto ${i + 1} — ${gymName}`}
          >
            <img
              src={photoUrl(ref, i)}
              alt={`${gymName} foto ${i + 1}`}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            />
          </button>
        ))}

        {/* "+" add card for gyms with < 3 photos */}
        {showAddCard && (
          <Link
            href="/pro-majitele"
            style={{
              flexShrink: 0,
              width: 148,
              height: 148,
              border: '1px solid var(--border)',
              background: '#1a1a1a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              transition: 'border-color 0.15s, color 0.15s',
              cursor: 'crosshair',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--lime)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            }}
            aria-label="Přidat fotky — claimněte profil"
          >
            <span style={{
              fontSize: '1.5rem',
              lineHeight: 1,
              color: 'var(--muted)',
              fontFamily: 'var(--font-display)',
              fontWeight: 300,
            }}>+</span>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}>Další fotky?</span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 300,
              color: 'var(--muted)',
              opacity: 0.7,
            }}>Claimněte profil</span>
          </Link>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <img
            src={photoUrl(refs[lightbox], lightbox)}
            alt={`${gymName} foto ${lightbox + 1}`}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              objectFit: 'contain',
              border: '1px solid var(--border)',
              display: 'block',
            }}
          />

          <div style={{
            position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.7rem',
            letterSpacing: '0.15em', color: 'var(--muted)',
          }}>
            {lightbox + 1} / {refs.length}
          </div>

          {refs.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev(); }} style={navBtnStyle('left')} aria-label="Předchozí">‹</button>
              <button onClick={e => { e.stopPropagation(); next(); }} style={navBtnStyle('right')} aria-label="Další">›</button>
            </>
          )}

          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'fixed', top: '1.5rem', right: '1.5rem',
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--muted)', fontSize: '1.2rem', lineHeight: 1,
              padding: '0.35rem 0.6rem', cursor: 'crosshair',
              fontFamily: 'var(--font-display)', fontWeight: 700,
            }}
            aria-label="Zavřít"
          >×</button>
        </div>
      )}
    </>
  );
}

const navBtnStyle = (side: 'left' | 'right'): React.CSSProperties => ({
  position: 'fixed',
  top: '50%',
  [side]: '1.5rem',
  transform: 'translateY(-50%)',
  background: 'rgba(0,0,0,0.6)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontSize: '2rem',
  lineHeight: 1,
  padding: '0.5rem 0.9rem',
  cursor: 'crosshair',
  fontFamily: 'var(--font-display)',
  fontWeight: 300,
});
