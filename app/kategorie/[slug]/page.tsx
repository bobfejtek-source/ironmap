import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getGymsByCategory, getCities } from '@/lib/db';
import { CATEGORIES, categoryBySlug } from '@/lib/categories';
import { cityUrl } from '@/lib/utils';
import GymCard from '@/components/GymCard';
import CategoryHeader, { CategorySortLabel } from './CategoryHeader';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CATEGORIES.map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = categoryBySlug(slug);
  if (!cat) return {};
  const gyms = await getGymsByCategory(cat.db);
  const title = `${cat.labelCs} v České republice — ${gyms.length} studií | IRON`;
  const description = `Najdi nejlepší ${cat.labelCs.toLowerCase()} v ČR. Kompletní seznam ${gyms.length} míst s hodnocením a kontakty.`;
  return {
    title,
    description,
    alternates: { canonical: `/kategorie/${slug}` },
    openGraph: { title, description, url: `https://www.ironmap.cz/kategorie/${slug}`, type: 'website' },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const cat = categoryBySlug(slug);
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
        <CategoryHeader
          labelCs={cat.labelCs}
          labelEn={cat.labelEn}
          gymCount={gyms.length}
          cityCount={citiesWithCat.length}
        />

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
        <CategorySortLabel />

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
