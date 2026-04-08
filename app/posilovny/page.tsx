import type { Metadata } from 'next';
import Link from 'next/link';
import GymCard from '@/components/GymCard';
import { getAllGyms, getCities } from '@/lib/db';
import { cityUrl } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Všechny posilovny v České republice',
  description:
    'Kompletní seznam posiloven a fitness center po celé České republice. Najděte gym ve vašem městě.',
  alternates: { canonical: '/posilovny' },
};

export default async function AllGymsPage() {
  const [gyms, cities] = await Promise.all([getAllGyms(), getCities()]);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 1.25rem 6rem' }}>

      {/* Breadcrumb */}
      <nav style={{
        marginBottom: '2.5rem',
        fontSize: '0.72rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
      }}>
        <Link href="/" className="sidebar-link" style={{ padding: 0, border: 'none' }}>IRON</Link>
        <span style={{ color: 'var(--border-mid)' }}>—</span>
        <span style={{ color: 'var(--text)' }}>Posilovny</span>
      </nav>

      <div className="gyms-layout">

        {/* Sidebar */}
        <aside className="gyms-sidebar">
          <div style={{
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--lime)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border)',
          }}>
            Města
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {cities.map(({ city, count }) => (
              <li key={city}>
                <Link href={cityUrl(city)} className="sidebar-link">
                  <span>{city}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--border-mid)', fontVariantNumeric: 'tabular-nums' }}>
                    {count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="iron-label" style={{ marginBottom: '0.75rem' }}>Adresář</div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              lineHeight: 0.9,
              marginBottom: '0.75rem',
            }}>
              Všechny posilovny v&nbsp;ČR
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 300 }}>
              Celkem{' '}
              <strong style={{ color: 'var(--text)' }}>{gyms.length}</strong>{' '}
              posiloven a fitness center.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            alignItems: 'stretch',
            gap: '1px',
            background: 'var(--border)',
            border: '1px solid var(--border)',
          }}>
            {gyms.map((gym) => (
              <div key={gym.id} style={{ background: 'var(--black)', height: '100%' }}>
                <GymCard gym={gym} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
