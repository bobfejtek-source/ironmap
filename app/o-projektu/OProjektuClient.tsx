'use client';

import { useT } from '@/lib/i18n';

interface Props {
  gymCountStr: string;
  cityCountStr: string;
}

export default function OProjektuClient({ gymCountStr, cityCountStr }: Props) {
  const { t } = useT();
  const ab = t.about;

  const paragraphs = [ab.p1, ab.p2, ab.p3, ab.p4, ab.p5, ab.p6, ab.p7, ab.p8];

  const p9 = ab.p9
    .replace('{gymCount}', gymCountStr)
    .replace('{cityCount}', cityCountStr);

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
        {ab.tag}
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
        {ab.headline.split('\n').map((line, i) => (
          <span key={i}>{line}{i < ab.headline.split('\n').length - 1 && <br />}</span>
        ))}
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
        {paragraphs.map((text, i) => (
          <p key={i}>{text}</p>
        ))}

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
          {ab.pullQuote}
        </div>

        <p>{ab.p9middle}</p>

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
            { num: gymCountStr, label: ab.statsGyms },
            { num: cityCountStr, label: ab.statsCities },
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

        <p>{p9}</p>

        <p>{ab.p10}</p>

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
            {ab.founder}
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
            {ab.founderRole}
          </div>
        </div>
      </div>
    </div>
  );
}
