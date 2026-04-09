'use client';

import { useState, useEffect } from 'react';
import { useModal } from './ModalContext';
import { useT } from '@/lib/i18n';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xgopqqvz';

export default function DoplnitModal() {
  const { doplnitGym, closeDoplnit } = useModal();
  const { t } = useT();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDoplnit(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeDoplnit]);

  useEffect(() => {
    if (!doplnitGym) setTimeout(() => { setSuccess(false); setError(false); }, 300);
  }, [doplnitGym]);

  if (!doplnitGym) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    // Honeypot check
    const honeypot = (form.elements.namedItem('website_url') as HTMLInputElement)?.value;
    if (honeypot) return;

    setLoading(true);
    setError(false);
    try {
      const data = new FormData(form);
      data.set('source', 'doplnit');
      data.set('gym_id', String(doplnitGym.id));
      data.set('gym_name', doplnitGym.name);
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) { setSuccess(true); }
      else { setError(true); }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.7rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: '0.4rem',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
  };

  return (
    <div className="iron-modal-overlay" onClick={closeDoplnit}>
      <div className="iron-modal" onClick={e => e.stopPropagation()}>
        <div className="iron-modal-header">
          <div className="iron-modal-title">{t.doplnit.title}</div>
          <button className="iron-modal-close" onClick={closeDoplnit} aria-label="Zavřít">×</button>
        </div>

        <div className="iron-modal-body">
          {success ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{
                width: 48, height: 48,
                border: '2px solid var(--lime)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem', fontSize: '1.5rem', color: 'var(--lime)',
              }}>✓</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 900,
                fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                marginBottom: '0.5rem',
              }}>
                {t.doplnit.success}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 300 }}>
                {t.doplnit.successSub}
              </p>
              <button onClick={closeDoplnit} className="iron-btn iron-btn-primary" style={{ marginTop: '1.5rem' }}>
                {t.common.close}
              </button>
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 300, marginBottom: '1.5rem' }}>
                {t.doplnit.subtitle} <strong style={{ color: 'var(--text)' }}>{doplnitGym.name}</strong>
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Honeypot — hidden from real users */}
                <input
                  name="website_url"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  style={{ display: 'none' }}
                />

                {/* Prices */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>{t.doplnit.dailyPrice}</label>
                    <input
                      name="daily_price"
                      type="number"
                      min={0}
                      max={9999}
                      className="iron-input"
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.doplnit.monthlyPrice}</label>
                    <input
                      name="monthly_price"
                      type="number"
                      min={0}
                      max={9999}
                      className="iron-input"
                      placeholder="800"
                    />
                  </div>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 300, margin: '-0.5rem 0 0' }}>
                  {t.doplnit.priceNote}
                </p>

                {/* Phone correction */}
                <div>
                  <label style={labelStyle}>{t.doplnit.phone}</label>
                  <input name="phone" type="tel" className="iron-input" placeholder="+420 xxx xxx xxx" />
                </div>

                {/* Opening hours correction */}
                <div>
                  <label style={labelStyle}>{t.doplnit.hours}</label>
                  <textarea
                    name="opening_hours"
                    rows={2}
                    className="iron-input"
                    placeholder={t.doplnit.hoursPlaceholder}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label style={labelStyle}>{t.doplnit.notes}</label>
                  <textarea
                    name="notes"
                    rows={2}
                    className="iron-input"
                    placeholder={t.doplnit.notesPlaceholder}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {error && (
                  <p style={{ color: '#ff4d4d', fontSize: '0.85rem', fontWeight: 300, margin: 0 }}>
                    {t.addGym.error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="iron-btn iron-btn-primary"
                  style={{ width: '100%', opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? t.common.loading : t.doplnit.submit}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
