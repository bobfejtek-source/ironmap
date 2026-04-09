'use client';

import { useModal } from '@/components/ModalContext';
import { useT } from '@/lib/i18n';

export default function KontaktPage() {
  const { openAddGym, openFeedback } = useModal();
  const { t } = useT();

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
        {t.contact.tag}
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
        {t.contact.headline.split('\n').map((line, i) => (
          <span key={i}>{line}{i === 0 && <br />}</span>
        ))}
      </h1>

      <p style={{
        fontFamily: 'var(--font-barlow)',
        fontWeight: 300,
        fontSize: '1.15rem',
        lineHeight: 1.8,
        color: 'var(--muted)',
        marginBottom: '2.5rem',
      }}>
        {t.contact.body}
      </p>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={openAddGym}
          className="iron-btn iron-btn-primary"
        >
          {t.contact.addGymBtn}
        </button>
        <button
          onClick={openFeedback}
          className="iron-btn iron-btn-outline"
        >
          {t.contact.feedbackBtn}
        </button>
      </div>
    </div>
  );
}
