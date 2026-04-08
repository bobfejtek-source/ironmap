import { Suspense } from 'react';
import type { Metadata } from 'next';
import PrihlaseniClient from './PrihlaseniClient';

export const metadata: Metadata = {
  title: 'Přihlášení',
  robots: { index: false, follow: false },
};

export default function PrihlaseniPage() {
  return (
    <Suspense fallback={null}>
      <PrihlaseniClient />
    </Suspense>
  );
}
