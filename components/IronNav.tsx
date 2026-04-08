'use client';

import Link from 'next/link';
import { useModal } from './ModalContext';
import { useT } from '@/lib/i18n';
import UserMenu from './UserMenu';

export default function IronNav() {
  const { openAddGym } = useModal();
  const { t, lang, setLang } = useT();

  return (
    <header
      className="iron-nav-header"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        background: 'rgba(8,8,8,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <Link href="/" style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: '1.75rem',
        letterSpacing: '0.14em',
        color: 'var(--lime)',
        lineHeight: 1,
      }}>
        IRON
      </Link>

      {/* Links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/posilovny" className="iron-nav-hide-mobile" style={{
          fontSize: '0.72rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          transition: 'color 0.2s',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
        >
          {t.nav.gyms}
        </Link>

        {/* Lang toggle */}
        <button
          onClick={() => setLang(lang === 'cs' ? 'en' : 'cs')}
          className="iron-nav-hide-mobile"
          style={{
            fontSize: '0.72rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            background: 'none',
            border: '1px solid var(--border)',
            padding: '0.35rem 0.75rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--lime)'; e.currentTarget.style.borderColor = 'var(--lime)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          {t.nav.lang}
        </button>

        {/* Add gym CTA */}
        <button
          onClick={openAddGym}
          className="iron-btn iron-btn-primary"
          style={{ fontSize: '0.8rem', padding: '0.55rem 1.4rem' }}
        >
          {t.nav.addGym}
        </button>

        {/* Auth */}
        <UserMenu />
      </nav>
    </header>
  );
}
