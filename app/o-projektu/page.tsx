import type { Metadata } from 'next';
import OProjektuClient from './OProjektuClient';

export const metadata: Metadata = {
  title: 'O projektu',
  description: 'IRONMAP vznikl z otočení ve dveřích. Příběh za největším adresářem posiloven v ČR.',
};

export default function OProjektuPage() {
  return <OProjektuClient />;
}
