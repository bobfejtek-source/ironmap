'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function GA4Loader() {
  const [load, setLoad] = useState(false);

  useEffect(() => {
    if (!GA_ID) return;

    if (localStorage.getItem('iron_cookie_consent') === 'accepted') {
      setLoad(true);
      return;
    }

    function onConsent() { setLoad(true); }
    window.addEventListener('cookieConsentGranted', onConsent);
    return () => window.removeEventListener('cookieConsentGranted', onConsent);
  }, []);

  if (!load || !GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
