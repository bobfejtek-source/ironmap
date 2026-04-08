'use client';

import { useModal } from '@/components/ModalContext';

export default function KontaktPage() {
  const { openAddGym, openFeedback } = useModal();

  return (
    <div style={{
      maxWidth: '680px',
      margin: '0 auto',
      padding: '5rem 2rem 6rem',
    }}>
      {/* Tag */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '0.68rem',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--lime)',
        marginBottom: '2.5rem',
      }}>
        Kontakt
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: 'clamp(2.4rem, 6vw, 4rem)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight: 1,
        marginBottom: '2.5rem',
        color: 'var(--text)',
      }}>
        Napiš<br />nám.
      </h1>

      <p style={{
        fontFamily: 'var(--font-barlow)',
        fontWeight: 300,
        fontSize: '1.15rem',
        lineHeight: 1.8,
        color: 'var(--muted)',
        marginBottom: '2.5rem',
      }}>
        Máš otázku, nápad nebo chceš přidat gym? Napiš nám.
      </p>

      {/* Email */}
      <div style={{
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '1.75rem 0',
        marginBottom: '2.5rem',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.68rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: '0.5rem',
        }}>
          Email
        </div>
        <a
          href="mailto:info@ironmap.cz"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '1.4rem',
            letterSpacing: '0.04em',
            color: 'var(--lime)',
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          info@ironmap.cz
        </a>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={openAddGym}
          className="iron-btn iron-btn-primary"
        >
          Přidat gym
        </button>
        <button
          onClick={openFeedback}
          className="iron-btn iron-btn-outline"
        >
          Zpětná vazba
        </button>
      </div>
    </div>
  );
}
