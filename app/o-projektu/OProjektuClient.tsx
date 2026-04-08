'use client';

import { useT } from '@/lib/i18n';

export default function OProjektuClient() {
  const { t } = useT();
  const [headline1, headline2] = t.about.headline.split('\n');

  return (
    <div style={{
      maxWidth: '680px',
      margin: '0 auto',
      padding: '5rem 2rem 6rem',
    }}>
      {/* Tag line */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '0.68rem',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--lime)',
        marginBottom: '2.5rem',
      }}>
        {t.about.tag}
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: 'clamp(2.4rem, 6vw, 4rem)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight: 1,
        marginBottom: '3.5rem',
        color: 'var(--text)',
      }}>
        {headline1}<br />{headline2}
      </h1>

      {/* Prose */}
      <div style={{
        fontFamily: 'var(--font-barlow)',
        fontWeight: 300,
        fontSize: '1.15rem',
        lineHeight: 1.8,
        color: 'var(--muted)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.6rem',
      }}>
        <p>{t.about.p1}</p>
        <p>{t.about.p2}</p>
        <p>{t.about.p3}</p>
        <p>{t.about.p4}</p>
        <p>{t.about.p5}</p>
        <p>{t.about.p6}</p>
        <p>{t.about.p7}</p>
        <p>{t.about.p8}</p>

        {/* Pull quote */}
        <div style={{
          borderLeft: '3px solid var(--lime)',
          paddingLeft: '1.5rem',
          margin: '1rem 0',
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          lineHeight: 1.2,
          color: 'var(--text)',
        }}>
          {t.about.pullQuote}
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: '3rem',
          padding: '1.5rem 0',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}>
          {[
            { num: '780', label: t.about.statsGyms },
            { num: '190', label: t.about.statsCities },
          ].map(({ num, label }) => (
            <div key={label}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '2.5rem',
                letterSpacing: '0.04em',
                color: 'var(--lime)',
                lineHeight: 1,
              }}>{num}</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '0.68rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginTop: '0.3rem',
              }}>{label}</div>
            </div>
          ))}
        </div>

        <p>{t.about.p9}</p>
        <p>{t.about.p10}</p>

        {/* Signature */}
        <div style={{
          marginTop: '1rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '1rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text)',
          }}>
            Bohdan
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '0.68rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginTop: '0.25rem',
          }}>
            {t.about.founder}
          </div>
        </div>
      </div>
    </div>
  );
}
