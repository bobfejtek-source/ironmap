'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

interface Props {
  labelCs: string;
  labelEn: string;
  gymCount: number;
  cityCount: number;
}

export default function CategoryHeader({ labelCs, labelEn, gymCount, cityCount }: Props) {
  const { t, lang } = useT();
  const label = lang === 'en' ? labelEn : labelCs;

  const placeLabel = gymCount === 1 ? t.kategorie.place1
    : gymCount < 5 ? t.kategorie.placeFew
    : t.kategorie.placeMany;

  const countStr = `${gymCount} ${placeLabel} ${t.kategorie.inCities.replace('{count}', String(cityCount))}`;

  return (
    <>
      <nav style={{
        marginBottom: '1.25rem',
        fontSize: '0.72rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>IRON</Link>
        <span style={{ color: 'var(--border-mid)' }}>—</span>
        <Link href="/posilovny" style={{ color: 'var(--muted)' }}>{t.kategorie.breadcrumb}</Link>
        <span style={{ color: 'var(--border-mid)' }}>—</span>
        <span style={{ color: 'var(--text)' }}>{label}</span>
      </nav>

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          lineHeight: 0.9,
        }}>
          <span style={{ color: 'var(--lime)' }}>{label}</span>
        </h1>
        <div style={{
          fontSize: '0.72rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
        }}>
          {countStr}
        </div>
      </div>
    </>
  );
}

export function CategorySortLabel() {
  const { t } = useT();
  return (
    <div style={{
      fontSize: '0.72rem',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: 'var(--muted)',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      paddingBottom: '1rem',
      borderBottom: '1px solid var(--border)',
      marginBottom: '1rem',
    }}>
      {t.kategorie.sortedBy}
    </div>
  );
}
