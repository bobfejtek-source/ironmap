'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PrihlaseniClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/profil';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailLoading(true);
    await signIn('email', { email: email.trim(), callbackUrl, redirect: false });
    setEmailSent(true);
    setEmailLoading(false);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl });
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '2rem',
            letterSpacing: '0.14em',
            color: 'var(--lime)',
          }}>
            IRON
          </Link>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '2.5rem',
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            marginTop: '1rem',
            marginBottom: '0.5rem',
          }}>
            Přihlášení
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 300 }}>
            Check-in, odznaky, profil — vše na jednom místě.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            border: '1px solid #ef4444',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            color: '#ef4444',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}>
            Chyba přihlášení. Zkus to znovu.
          </div>
        )}

        {/* Email sent confirmation */}
        {emailSent ? (
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--lime)',
            padding: '2rem',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '2rem',
              marginBottom: '1rem',
              color: 'var(--lime)',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              letterSpacing: '0.05em',
            }}>
              ✓ ODESLÁNO
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 300, lineHeight: 1.7 }}>
              Zkontroluj email <strong style={{ color: 'var(--text)' }}>{email}</strong>.
              Klikni na odkaz a budeš přihlášen.
            </p>
          </div>
        ) : (
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
          }}>

            {/* Google */}
            <div style={{ padding: '2rem 2rem 1.5rem' }}>
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="iron-btn iron-btn-outline"
                style={{ width: '100%', fontSize: '0.85rem', justifyContent: 'center', gap: '0.75rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                {googleLoading ? 'Přihlašuji...' : 'Pokračovat přes Google'}
              </button>
            </div>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '0 2rem', marginBottom: '1.5rem',
            }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{
                fontSize: '0.65rem', letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'var(--muted)',
                fontFamily: 'var(--font-display)', fontWeight: 700,
              }}>
                nebo
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Email */}
            <form onSubmit={handleEmailSubmit} style={{ padding: '0 2rem 2rem' }}>
              <label style={{
                fontSize: '0.65rem', letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'var(--muted)',
                fontFamily: 'var(--font-display)', fontWeight: 700,
                display: 'block', marginBottom: '0.5rem',
              }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tvuj@email.cz"
                className="iron-input"
                style={{ marginBottom: '1rem' }}
              />
              <button
                type="submit"
                disabled={emailLoading}
                className="iron-btn iron-btn-ghost"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {emailLoading ? 'Odesílám...' : 'Poslat přihlašovací odkaz →'}
              </button>
            </form>
          </div>
        )}

        <p style={{
          textAlign: 'center', marginTop: '1.5rem',
          fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 300,
        }}>
          Přihlášením souhlasíš s{' '}
          <Link href="/ochrana-dat" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>
            podmínkami ochrany dat
          </Link>.
        </p>
      </div>
    </div>
  );
}
