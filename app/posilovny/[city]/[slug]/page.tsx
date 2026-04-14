import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllGyms, getGymBySlug, getSimilarGyms } from '@/lib/db';
import { cityToSlug, gymDetailUrl, formatRating } from '@/lib/utils';
import GymDetailClient from '@/components/GymDetailClient';

export const dynamicParams = true;
export const revalidate = 3600;

// Maps DB day keys to schema.org day abbreviations
const DAY_MAP: Record<string, string> = {
  monday: 'Mo', tuesday: 'Tu', wednesday: 'We', thursday: 'Th',
  friday: 'Fr', saturday: 'Sa', sunday: 'Su',
};

function buildGymJsonLd(gym: Awaited<ReturnType<typeof getGymBySlug>>) {
  if (!gym) return null;

  // Parse coordinates
  let geo: Record<string, unknown> | undefined;
  try {
    if (gym.coordinates) {
      const c = JSON.parse(gym.coordinates) as { lat?: number; lng?: number };
      if (c.lat && c.lng) geo = { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng };
    }
  } catch { /* ignore */ }

  // Parse opening hours → schema.org format e.g. "Mo-Fr 06:00-22:00"
  let openingHours: string[] | undefined;
  try {
    if (gym.opening_hours) {
      const parsed = JSON.parse(gym.opening_hours) as Record<string, string>;
      openingHours = Object.entries(parsed)
        .filter(([, v]) => v && v !== 'Closed' && v !== 'closed')
        .map(([day, hours]) => `${DAY_MAP[day] ?? day} ${hours}`);
      if (openingHours.length === 0) openingHours = undefined;
    }
  } catch { /* ignore */ }

  return {
    '@context': 'https://schema.org',
    '@type': 'ExerciseGym',
    name: gym.name,
    address: gym.address ? {
      '@type': 'PostalAddress',
      streetAddress: gym.address,
      addressLocality: gym.city,
      addressCountry: 'CZ',
    } : undefined,
    geo,
    telephone: gym.phone ?? undefined,
    url: gym.website ?? undefined,
    openingHours,
    aggregateRating: gym.rating && gym.rating_count ? {
      '@type': 'AggregateRating',
      ratingValue: gym.rating,
      reviewCount: gym.rating_count,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    description: gym.description ?? undefined,
  };
}

type Props = { params: Promise<{ city: string; slug: string }> };

export async function generateStaticParams() {
  const gyms = await getAllGyms();
  return gyms.map((g) => ({
    city: cityToSlug(g.city),
    slug: g.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const gym = await getGymBySlug(slug);
  if (!gym) return {};

  const category = gym.category ?? 'Posilovna';
  const title = `${gym.name} — ${category} ${gym.city} | IRON`;

  const amenities = [
    gym.multisport && 'MultiSport',
    gym.has_pool && 'bazén',
    gym.has_sauna && 'sauna',
    gym.is_24_7 && 'otevřeno 24/7',
    gym.has_parking && 'parkování',
    gym.has_classes && 'skupinové lekce',
  ].filter(Boolean) as string[];

  const description = gym.description
    ? gym.description.slice(0, 155)
    : `${gym.name} — ${category.toLowerCase()} v ${gym.city}. ${
        formatRating(gym.rating) ? `Hodnocení ${formatRating(gym.rating)}/5. ` : ''
      }${amenities.length ? amenities.join(', ') + '. ' : ''}Otevírací doba, kontakt, fotky.`;

  const url = `https://www.ironmap.cz${gymDetailUrl(gym)}`;
  return {
    title,
    description,
    alternates: { canonical: gymDetailUrl(gym) },
    openGraph: { title, description, url, type: 'website' },
  };
}

export default async function GymDetailPage({ params }: Props) {
  const { city, slug } = await params;
  const gym = await getGymBySlug(slug);
  if (!gym || cityToSlug(gym.city) !== city) notFound();

  const similar = await getSimilarGyms(gym.city, gym.slug, 4);

  return (
    <>
      <GymDetailClient gym={gym} similarGyms={similar} />

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildGymJsonLd(gym)),
        }}
      />
    </>
  );
}
