import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAllGyms } from '@/lib/db';
import NearbyListing from '@/components/NearbyListing';

export const metadata: Metadata = {
  title: 'Posilovny poblíž vás',
  description: 'Fitness centra a posilovny ve vašem okolí, seřazené podle vzdálenosti.',
  robots: { index: false }, // personal location page — don't index
};

type Props = { searchParams: Promise<{ lat?: string; lng?: string }> };

export default async function NearbyPage({ searchParams }: Props) {
  const { lat: latStr, lng: lngStr } = await searchParams;
  const lat = parseFloat(latStr ?? '');
  const lng = parseFloat(lngStr ?? '');

  if (isNaN(lat) || isNaN(lng) || lat < 48 || lat > 52 || lng < 12 || lng > 19) {
    redirect('/');
  }

  const gyms = await getAllGyms();

  return <NearbyListing gyms={gyms} userLat={lat} userLng={lng} />;
}
