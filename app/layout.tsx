import type { Metadata } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { getGymCount } from '@/lib/stats';
import { LangProvider } from '@/lib/i18n';
import { ModalProvider } from '@/components/ModalContext';
import IronNav from '@/components/IronNav';
import PilotBanner from '@/components/PilotBanner';
import IronFooter from '@/components/IronFooter';
import AddGymModal from '@/components/AddGymModal';
import FeedbackModal from '@/components/FeedbackModal';
import DoplnitModal from '@/components/DoplnitModal';
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

export async function generateMetadata(): Promise<Metadata> {
  const gymCount = await getGymCount();
  return {
    title: {
      default: 'IRON — Největší adresář posiloven v České republice',
      template: '%s | IRON',
    },
    description:
      `Najděte nejlepší posilovnu ve vašem městě. ${gymCount} gymů, otevírací doby, kontakty a hodnocení po celé ČR.`,
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.ironmap.cz'),
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
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="cs"
      className={`${barlow.variable} ${barlowCondensed.variable}`}
    >
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'IRON',
              url: 'https://www.ironmap.cz',
              logo: 'https://www.ironmap.cz/opengraph-image',
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                availableLanguage: 'Czech',
              },
            }),
          }}
        />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`}
            </Script>
          </>
        )}
        <Providers>
          <LangProvider>
            <ModalProvider>
              <PilotBanner />
              <IronNav />
              <main style={{ flex: 1, paddingTop: 'calc(64px + var(--pilot-banner-h))' }}>
                {children}
              </main>
              <IronFooter />
              <AddGymModal />
              <FeedbackModal />
              <DoplnitModal />
              <CookieBanner />
            </ModalProvider>
          </LangProvider>
        </Providers>
      </body>
    </html>
  );
}
