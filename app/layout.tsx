import type { Metadata } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import { LangProvider } from '@/lib/i18n';
import { ModalProvider } from '@/components/ModalContext';
import IronNav from '@/components/IronNav';
import IronFooter from '@/components/IronFooter';
import AddGymModal from '@/components/AddGymModal';
import FeedbackModal from '@/components/FeedbackModal';
import CookieBanner from '@/components/CookieBanner';
import Providers from './providers';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-barlow',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'IRON — Největší adresář posiloven v České republice',
    template: '%s | IRON',
  },
  description:
    'Najděte nejlepší posilovnu ve vašem městě. 864 gymů, otevírací doby, kontakty a hodnocení po celé ČR.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://gymie.cz'),
  openGraph: {
    siteName: 'IRON',
    locale: 'cs_CZ',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="cs"
      className={`${barlow.variable} ${barlowCondensed.variable}`}
    >
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Providers>
          <LangProvider>
            <ModalProvider>
              <IronNav />
              <main style={{ flex: 1, paddingTop: 64 }}>
                {children}
              </main>
              <IronFooter />
              <AddGymModal />
              <FeedbackModal />
              <CookieBanner />
            </ModalProvider>
          </LangProvider>
        </Providers>
      </body>
    </html>
  );
}
