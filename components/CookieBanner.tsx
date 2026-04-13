'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'iron_cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    window.dispatchEvent(new Event('cookieConsentGranted'));
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie souhlas"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9000,
        background: 'var(--card-bg)',
        borderTop: '1px solid var(--border)',
        padding: '1.25rem 2rem',
        display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--text)', marginBottom: '0.35rem',
        }}>
          Používáme cookies
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0, fontWeight: 300, lineHeight: 1.6 }}>
          Analytické cookies (Google Analytics) nám pomáhají pochopit jak web používáte.
          Žádné reklamní ani sledovací cookies třetích stran.{' '}
          <Link href="/ochrana-soukromi" style={{ color: 'var(--lime)', textDecoration: 'underline' }}>
            Ochrana soukromí
          </Link>
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
        <button
          onClick={decline}
          className="iron-btn iron-btn-outline"
          style={{ fontSize: '0.75rem', padding: '0.5rem 1.25rem' }}
        >
          Odmítnout
        </button>
        <button
          onClick={accept}
          className="iron-btn iron-btn-primary"
          style={{ fontSize: '0.75rem', padding: '0.5rem 1.25rem' }}
        >
          Přijmout analytics
        </button>
      </div>
    </div>
  );
}
