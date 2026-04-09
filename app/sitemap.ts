import type { MetadataRoute } from 'next';
import { getAllGyms, getCities } from '@/lib/db';
import { cityUrl, gymDetailUrl } from '@/lib/utils';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.ironmap.cz';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, gyms] = await Promise.all([getCities(), getAllGyms()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE}/posilovny`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE}/kontakt`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${BASE}/o-projektu`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ];

  const cityRoutes: MetadataRoute.Sitemap = cities.map(({ city }) => ({
    url: `${BASE}${cityUrl(city)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const gymRoutes: MetadataRoute.Sitemap = gyms.map((gym) => ({
    url: `${BASE}${gymDetailUrl(gym)}`,
    lastModified: new Date(gym.created_at),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...cityRoutes, ...gymRoutes];
}
