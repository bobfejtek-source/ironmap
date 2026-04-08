'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useT } from '@/lib/i18n';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, []);

  if (status === 'loading') {
    return (
      <div style={{
        width: 32, height: 32, border: '1px solid var(--border)',
        background: 'var(--card-bg)', flexShrink: 0,
      }} />
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="iron-btn iron-btn-outline"
        style={{ fontSize: '0.72rem', padding: '0.4rem 1rem' }}
      >
        {t.nav.signIn}
      </button>
    );
  }

  const initials = session.user?.name
    ? session.user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : session.user?.email?.[0].toUpperCase() ?? '?';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 34, height: 34,
          border: `1px solid ${open ? 'var(--lime)' : 'var(--border)'}`,
          background: 'var(--card-bg)',
          overflow: 'hidden',
          flexShrink: 0,
          transition: 'border-color 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--lime)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        {session.user?.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name ?? 'Avatar'}
            width={34}
            height={34}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '0.8rem',
            letterSpacing: '0.05em',
            color: 'var(--lime)',
          }}>
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 200,
          background: 'var(--off-black)',
          border: '1px solid var(--border-mid)',
          zIndex: 500,
          animation: 'slideUp 0.15s ease',
        }}>
          {/* User info */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {session.user?.name ?? t.common.user}
            </div>
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--muted)',
              fontWeight: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: '0.15rem',
            }}>
              {session.user?.email}
            </div>
          </div>

          {/* Links */}
          <div style={{ padding: '0.5rem 0' }}>
            <Link
              href="/profil"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 1rem',
                fontSize: '0.78rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--muted)',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              ◈ {t.common.myProfile}
            </Link>

            <button
              onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.6rem 1rem',
                fontSize: '0.78rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--muted)',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              ↩ {t.nav.signOut}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
