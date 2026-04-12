import type { Metadata } from 'next';
import OProjektuClient from './OProjektuClient';

export const metadata: Metadata = {
  title: 'O projektu',
  description: 'IRONMAP vznikl z otočení ve dveřích. Příběh za největším adresářem posiloven v ČR.',
  alternates: { canonical: '/o-projektu' },
};

export default function OProjektuPage() {
  return <OProjektuClient />;
}
