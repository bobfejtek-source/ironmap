import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Kontaktujte nás nebo přidejte svůj gym do největšího adresáře posiloven v ČR.',
  alternates: { canonical: '/kontakt' },
};

export default function KontaktLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
