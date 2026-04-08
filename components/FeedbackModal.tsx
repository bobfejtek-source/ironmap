'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { useModal } from './ModalContext';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xgopqqvz';

export default function FeedbackModal() {
  const { t } = useT();
  const { isFeedbackOpen, openFeedback, closeFeedback } = useModal();
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeFeedback(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeFeedback]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ source: 'feedback', type: 'feedback', option: selected, message: text }),
      });
      setSuccess(true);
    } catch {
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    closeFeedback();
    setTimeout(() => { setSuccess(false); setSelected(null); setText(''); }, 300);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={openFeedback}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 300,
          background: 'var(--off-black)',
          border: '1px solid var(--border-mid)',
          color: 'var(--muted)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.72rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          padding: '0.6rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'all 0.2s',
          cursor: 'crosshair',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--lime)'; e.currentTarget.style.color = 'var(--lime)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--muted)'; }}
      >
        <span style={{ fontSize: '0.9rem' }}>◎</span>
        {t.feedback.btn}
      </button>

      {/* Modal */}
      {isFeedbackOpen && (
        <div className="iron-modal-overlay" onClick={handleClose}>
          <div
            className="iron-modal"
            style={{ maxWidth: '440px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="iron-modal-header">
              <div className="iron-modal-title" style={{ fontSize: '1.15rem' }}>
                {t.feedback.title}
              </div>
              <button className="iron-modal-close" onClick={handleClose}>×</button>
            </div>

            <div className="iron-modal-body">
              {success ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ color: 'var(--lime)', fontSize: '2rem', marginBottom: '1rem' }}>✓</div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: '1.2rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    {t.feedback.success}
                  </div>
                  <button
                    onClick={handleClose}
                    className="iron-btn iron-btn-outline"
                    style={{ marginTop: '1.5rem' }}
                  >
                    {t.common.close}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Quick options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {t.feedback.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSelected(opt)}
                        style={{
                          textAlign: 'left',
                          background: selected === opt ? 'rgba(200,255,0,0.08)' : 'transparent',
                          border: `1px solid ${selected === opt ? 'var(--lime)' : 'var(--border)'}`,
                          color: selected === opt ? 'var(--lime)' : 'var(--muted)',
                          padding: '0.75rem 1rem',
                          fontSize: '0.85rem',
                          fontWeight: 300,
                          transition: 'all 0.15s',
                          cursor: 'crosshair',
                        }}
                      >
                        {selected === opt && <span style={{ marginRight: '0.5rem' }}>›</span>}
                        {opt}
                      </button>
                    ))}
                  </div>

                  {/* Free text */}
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={t.feedback.placeholder}
                    rows={3}
                    className="iron-input"
                    style={{ resize: 'vertical' }}
                  />

                  <button
                    onClick={handleSubmit}
                    disabled={loading || (!selected && !text.trim())}
                    className="iron-btn iron-btn-primary"
                    style={{
                      width: '100%',
                      opacity: loading || (!selected && !text.trim()) ? 0.5 : 1,
                    }}
                  >
                    {loading ? t.common.loading : t.feedback.submit}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
