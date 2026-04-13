import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllGyms, getGymBySlug, getSimilarGyms } from '@/lib/db';
import { cityToSlug, gymDetailUrl, formatRating } from '@/lib/utils';
import GymDetailClient from '@/components/GymDetailClient';

export const dynamicParams = true;
export const revalidate = 3600;

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

  const title = `${gym.name} — posilovna ${gym.city}`;
  const description =
    gym.description ??
    `${gym.name} – fitness centrum v ${gym.city}. ${gym.address ?? ''} Hodnocení: ${formatRating(gym.rating)}/5.`;

  return {
    title,
    description,
    alternates: { canonical: gymDetailUrl(gym) },
    openGraph: { title, description, type: 'website' },
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
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ExerciseGym',
            name: gym.name,
            address: gym.address ? {
              '@type': 'PostalAddress',
              streetAddress: gym.address,
              addressLocality: gym.city,
              addressCountry: 'CZ',
            } : undefined,
            telephone: gym.phone ?? undefined,
            url: gym.website ?? undefined,
            aggregateRating: gym.rating && gym.rating_count ? {
              '@type': 'AggregateRating',
              ratingValue: gym.rating,
              reviewCount: gym.rating_count,
              bestRating: 5,
              worstRating: 1,
            } : undefined,
            description: gym.description ?? undefined,
          }),
        }}
      />
    </>
  );
}
