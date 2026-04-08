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
        padding: '1rem 2rem',
        display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
      }}
    >
      <p style={{ flex: 1, minWidth: 240, fontSize: '0.8rem', color: 'var(--muted)', margin: 0, fontWeight: 300 }}>
        Používáme nezbytné cookies pro přihlašování a zabezpečení relace.
        Žádné analytické ani reklamní cookies.{' '}
        <Link href="/ochrana-soukromi" style={{ color: 'var(--lime)', textDecoration: 'underline' }}>
          Ochrana soukromí
        </Link>
      </p>
      <button
        onClick={accept}
        className="iron-btn"
        style={{ fontSize: '0.78rem', padding: '0.5rem 1.25rem', flexShrink: 0 }}
      >
        Rozumím
      </button>
    </div>
  );
}
