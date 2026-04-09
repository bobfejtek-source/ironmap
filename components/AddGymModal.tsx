'use client';

import { useState, useEffect } from 'react';
import { useModal } from './ModalContext';
import { useT } from '@/lib/i18n';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xgopqqvz';

export default function AddGymModal() {
  const { isAddGymOpen, closeAddGym } = useModal();
  const { t } = useT();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAddGym(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeAddGym]);

  // Reset on close
  useEffect(() => {
    if (!isAddGymOpen) {
      setTimeout(() => { setSuccess(false); setError(false); }, 300);
    }
  }, [isAddGymOpen]);

  if (!isAddGymOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const data = new FormData(e.currentTarget);
      data.set('source', 'add-gym');
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="iron-modal-overlay" onClick={closeAddGym}>
      <div className="iron-modal" onClick={e => e.stopPropagation()}>
        <div className="iron-modal-header">
          <div className="iron-modal-title">{t.addGym.title}</div>
          <button className="iron-modal-close" onClick={closeAddGym} aria-label="Zavřít">×</button>
        </div>

        <div className="iron-modal-body">
          {success ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{
                width: 48, height: 48,
                border: '2px solid var(--lime)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '1.5rem',
                color: 'var(--lime)',
              }}>✓</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '1.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '0.75rem',
              }}>
                {t.addGym.success}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 300 }}>
                {t.addGym.successSub}
              </p>
              <button
                onClick={closeAddGym}
                className="iron-btn iron-btn-primary"
                style={{ marginTop: '2rem' }}
              >
                {t.common.close}
              </button>
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 300, marginBottom: '1.75rem' }}>
                {t.addGym.subtitle}
              </p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>{t.addGym.name} *</label>
                  <input name="name" required className="iron-input" placeholder={t.addGym.namePlaceholder} />
                </div>
                <div>
                  <label style={labelStyle}>{t.addGym.category}</label>
                  <div style={{ position: 'relative' }}>
                    <select name="category" className="iron-select">
                      <option value="">{t.addGym.categoryPlaceholder}</option>
                      {t.addGym.categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div style={{
                      position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--muted)', pointerEvents: 'none', fontSize: '0.7rem',
                    }}>▼</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>{t.addGym.city} *</label>
                    <input name="city" required className="iron-input" placeholder="Praha" />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.addGym.phone}</label>
                    <input name="phone" type="tel" className="iron-input" placeholder="+420 xxx xxx xxx" />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t.addGym.address}</label>
                  <input name="address" className="iron-input" placeholder={t.addGym.addressPlaceholder} />
                </div>
                <div>
                  <label style={labelStyle}>{t.addGym.website}</label>
                  <input name="website" type="url" className="iron-input" placeholder="https://mujgym.cz" />
                </div>
                <div>
                  <label style={labelStyle}>{t.addGym.ownerEmail} *</label>
                  <input name="email" type="email" required className="iron-input" placeholder="info@gym.cz" />
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
                  style={{ marginTop: '0.5rem', width: '100%', opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? t.addGym.submitting : t.addGym.submit}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
