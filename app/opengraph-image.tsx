import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'IRON — Největší adresář posiloven v České republice';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          background: '#0a0a0a',
          padding: '72px 80px',
        }}
      >
        {/* Accent bar */}
        <div style={{ display: 'flex', width: 64, height: 4, background: '#C8FF00', marginBottom: 32 }} />

        {/* Title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-2px',
            lineHeight: 1,
            marginBottom: 24,
            textTransform: 'uppercase',
          }}
        >
          IRON
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: '#888888',
            letterSpacing: '0.02em',
          }}
        >
          Největší adresář posiloven v České republice
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            top: 72,
            right: 80,
            fontSize: 18,
            fontWeight: 700,
            color: '#C8FF00',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          ironmap.cz
        </div>
      </div>
    ),
    { ...size },
  );
}
