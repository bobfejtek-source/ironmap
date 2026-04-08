'use client';

import { useState, useEffect, useRef } from 'react';
import { useModal } from './ModalContext';
import { useT } from '@/lib/i18n';

const STORAGE_KEY = 'pilot-banner-dismissed';

export default function PilotBanner() {
  const [visible, setVisible] = useState(false);
  const { openFeedback } = useModal();
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);

  // Check localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  // Keep --pilot-banner-h in sync with the actual rendered height
  useEffect(() => {
    if (!visible) {
      document.documentElement.style.setProperty('--pilot-banner-h', '0px');
      return;
    }
    const update = () => {
      const h = ref.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty('--pilot-banner-h', `${h}px`);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
  };

  if (!visible) return null;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 210,
        background: '#1a1a1a',
        borderLeft: '3px solid #C8FF00',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.55rem 1rem 0.55rem 1.25rem',
      }}
    >
      {/* Lime accent dot */}
      <span style={{
        width: 4,
        height: 4,
        background: '#C8FF00',
        flexShrink: 0,
        alignSelf: 'flex-start',
        marginTop: '0.35rem',
      }} />

      {/* Text */}
      <p style={{
        flex: 1,
        margin: 0,
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '0.68rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        lineHeight: 1.6,
      }}>
        {t.pilot.text}{' '}
        <button
          onClick={openFeedback}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '0.68rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#C8FF00',
            cursor: 'crosshair',
            textDecoration: 'underline',
            textDecorationColor: 'rgba(200,255,0,0.35)',
            textUnderlineOffset: '2px',
          }}
          onMouseEnter={e => (e.currentTarget.style.textDecorationColor = '#C8FF00')}
          onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'rgba(200,255,0,0.35)')}
        >
          {t.pilot.cta}
        </button>
        {t.pilot.suffix}
      </p>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Zavřít"
        style={{
          background: 'none',
          border: 'none',
          padding: '0.15rem 0.25rem',
          color: 'var(--muted)',
          fontSize: '1.1rem',
          lineHeight: 1,
          cursor: 'crosshair',
          flexShrink: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
      >
        ×
      </button>
    </div>
  );
}
