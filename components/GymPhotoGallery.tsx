'use client';

import { useState } from 'react';

interface Props {
  photos: string; // JSON array of Places API v1 photo refs
  gymName: string;
  gymId: number;
}

export default function GymPhotoGallery({ photos, gymName, gymId }: Props) {
  console.log('[GymPhotoGallery] gymId:', gymId, '| photos type:', typeof photos, '| photos length:', photos?.length);
  const [lightbox, setLightbox] = useState<number | null>(null);

  let refs: string[] = [];
  try { refs = (JSON.parse(photos) as string[]).slice(0, 5); } catch (e) { console.log('[GymPhotoGallery] JSON.parse FAILED:', e); return null; }
  console.log('[GymPhotoGallery] refs.length:', refs.length, '| first URL will be:', `https://pub-06c0095bbd6747039db9b7f302a13d2b.r2.dev/photos/${gymId}_1.jpg`);
  if (refs.length === 0) return null;

  const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? 'https://pub-06c0095bbd6747039db9b7f302a13d2b.r2.dev';
  const photoUrl = (_ref: string, idx: number) => `${R2_BASE}/photos/${gymId}_${idx + 1}.jpg`;

  const prev = () => setLightbox(i => i != null ? (i - 1 + refs.length) % refs.length : null);
  const next = () => setLightbox(i => i != null ? (i + 1) % refs.length : null);

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

          {/* Counter */}
          <div style={{
            position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.7rem',
            letterSpacing: '0.15em', color: 'var(--muted)',
          }}>
            {lightbox + 1} / {refs.length}
          </div>

          {/* Prev / Next */}
          {refs.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev(); }}
                style={navBtnStyle('left')}
                aria-label="Předchozí"
              >‹</button>
              <button
                onClick={e => { e.stopPropagation(); next(); }}
                style={navBtnStyle('right')}
                aria-label="Další"
              >›</button>
            </>
          )}

          {/* Close */}
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
