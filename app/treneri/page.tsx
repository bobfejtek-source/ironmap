import type { Metadata } from 'next';
import TreneriClient from './TreneriClient';

export const metadata: Metadata = {
  title: 'Pro trenéry - Pre-registrace',
  description:
    'Vytvoř si profil osobního trenéra na IRONMAP. Tisíce sportovců hledá trenéra - buď tam v momentě rozhodnutí. Registrace je zdarma.',
  alternates: { canonical: '/treneri' },
};

export default function TreneriPage() {
  return <TreneriClient />;
}
