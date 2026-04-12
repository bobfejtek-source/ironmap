import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getGymsByCategory, getCities } from '@/lib/db';
import { CATEGORIES, categoryBySlug } from '@/lib/categories';
import { cityUrl } from '@/lib/utils';
import GymCard from '@/components/GymCard';

export const revalidate = 3600;

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return CATEGORIES.map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = categoryBySlug(params.slug);
  if (!cat) return {};
  const gyms = await getGymsByCategory(cat.db);
  return {
    title: `${cat.labelCs} v České republice — ${gyms.length} studií`,
    description: `Najděte nejlepší ${cat.labelCs.toLowerCase()} v České republice. ${gyms.length} míst s hodnoceními a kontakty.`,
    alternates: { canonical: `/kategorie/${params.slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const cat = categoryBySlug(params.slug);
  if (!cat) notFound();

  const [gyms, allCities] = await Promise.all([
    getGymsByCategory(cat.db),
    getCities(),
  ]);

  if (gyms.length === 0) notFound();

  // Cities that have at least one gym in this category
  const citySet = new Set(gyms.map(g => g.city));
  const citiesWithCat = allCities.filter(c => citySet.has(c.city));

  // Group gyms by city for display
  const byCity: Record<string, typeof gyms> = {};
  for (const g of gyms) (byCity[g.city] ??= []).push(g);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        padding: '2rem 2rem 0',
        borderBottom: '1px solid var(--border)',
        background: 'var(--off-black)',
      }}>
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
          <Link href="/posilovny" style={{ color: 'var(--muted)' }}>Posilovny</Link>
          <span style={{ color: 'var(--border-mid)' }}>—</span>
          <span style={{ color: 'var(--text)' }}>{cat.labelCs}</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            lineHeight: 0.9,
          }}>
            <span style={{ color: 'var(--lime)' }}>{cat.labelCs}</span>
          </h1>
          <div style={{
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
          }}>
            {gyms.length} {gyms.length === 1 ? 'místo' : gyms.length < 5 ? 'místa' : 'míst'} v {citiesWithCat.length} městech
          </div>
        </div>

        {/* City sub-navigation */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          paddingBottom: '1rem',
        }}>
          {citiesWithCat.slice(0, 20).map(({ city }) => (
            <Link
              key={city}
              href={`${cityUrl(city)}?kategorie=${encodeURIComponent(cat.db)}`}
              style={{
                fontSize: '0.65rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--muted)',
                border: '1px solid var(--border)',
                padding: '0.3rem 0.6rem',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              className="city-chip"
            >
              {city} ({byCity[city]?.length ?? 0})
            </Link>
          ))}
        </div>
      </div>

      {/* Gym list */}
      <div style={{ padding: '1.5rem 2rem', maxWidth: 900 }}>
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
          Seřazeno podle hodnocení
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {gyms.map(gym => (
            <GymCard key={gym.id} gym={gym} />
          ))}
        </div>
      </div>

      <style>{`
        .city-chip:hover { color: var(--text) !important; border-color: var(--lime) !important; }
      `}</style>
    </div>
  );
}
