'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

export default function IronFooter() {
  const { t } = useT();
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--off-black)',
      padding: '2.5rem 3rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1.5rem',
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: '1.5rem',
        letterSpacing: '0.14em',
        color: 'var(--lime)',
      }}>
        IRON
      </div>

      {/* Links */}
      <ul style={{
        display: 'flex',
        gap: '2rem',
        listStyle: 'none',
        fontSize: '0.72rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        flexWrap: 'wrap',
      }}>
        {[
          { label: t.footer.gyms, href: '/posilovny' },
          { label: t.footer.about, href: '/o-projektu' },
          { label: t.footer.forOwners, href: '/pro-majitele' },
          { label: t.footer.contact, href: '/kontakt' },
          { label: t.footer.privacy, href: '/ochrana-soukromi' },
        ].map(({ label, href }) => (
          <li key={label}>
            <Link
              href={href}
              style={{ color: 'var(--muted)', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Copy */}
      <div style={{
        fontSize: '0.72rem',
        color: 'var(--muted)',
        letterSpacing: '0.06em',
      }}>
        &copy; {new Date().getFullYear()} IRON. {t.footer.tagline}
      </div>
    </footer>
  );
}
