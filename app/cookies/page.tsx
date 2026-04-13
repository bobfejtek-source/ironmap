import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Zásady používání cookies',
  robots: { index: true, follow: true },
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 2rem 6rem' }}>
      <div className="iron-label" style={{ marginBottom: '1.5rem' }}>Právní dokumenty</div>

      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 900,
        fontSize: 'clamp(2rem, 5vw, 3.5rem)', textTransform: 'uppercase',
        marginBottom: '0.75rem',
      }}>
        Zásady používání cookies
      </h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '2.5rem', fontWeight: 300 }}>
        Platné od 1. dubna 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.7 }}>

        <Section title="Co jsou cookies">
          Cookies jsou malé textové soubory, které webová stránka ukládá do vašeho prohlížeče při
          návštěvě. Slouží k tomu, aby si stránka zapamatovala vaše preference a přihlášení, a aby
          provozovatel mohl sledovat, jak je stránka využívána. Cookies neobsahují viry ani škodlivý
          kód a nemohou samy o sobě přistupovat k souborům ve vašem zařízení.
        </Section>

        <Section title="Jaké cookies používáme">
          Na platformě IRONMAP používáme dva typy cookies:

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--off-black)', border: '1px solid var(--border)', borderRadius: 4, padding: '1rem 1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text)', marginBottom: '0.4rem' }}>
                Nezbytné funkční cookies
              </div>
              <div>
                Tyto cookies jsou nezbytné pro správnou funkci platformy. Umožňují přihlášení a
                udržení přihlášené relace (session token). Jsou nastaveny jako{' '}
                <strong style={{ color: 'var(--text)' }}>httpOnly</strong> — skripty třetích stran
                k nim nemají přístup. Bez těchto cookies by přihlašování a základní funkce aplikace
                nefungovaly. Jejich použití nevyžaduje váš souhlas (právní základ: oprávněný zájem
                a plnění smlouvy dle čl. 6 odst. 1 písm. b) GDPR).
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                <strong style={{ color: 'var(--text)' }}>Příklad:</strong> session cookie pro ověření přihlášení (platnost: po dobu relace nebo 30 dní při zapamatování).
              </div>
            </div>

            <div style={{ background: 'var(--off-black)', border: '1px solid var(--border)', borderRadius: 4, padding: '1rem 1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text)', marginBottom: '0.4rem' }}>
                Analytické cookies (volitelné)
              </div>
              <div>
                Pro anonymní měření návštěvnosti a chování uživatelů na platformě používáme{' '}
                <strong style={{ color: 'var(--text)' }}>Google Analytics 4</strong> (Measurement ID:{' '}
                <strong style={{ color: 'var(--text)' }}>G-Z718GP4WSH</strong>). Tyto cookies se
                načtou <strong style={{ color: 'var(--text)' }}>pouze pokud udělíte souhlas</strong>{' '}
                prostřednictvím lišty v dolní části stránky. Sbírají anonymizovaná data o počtu
                návštěv, zdrojích návštěvnosti a zobrazených stránkách. Žádné osobní identifikátory
                nejsou předávány třetím stranám za účelem reklamy.
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                <strong style={{ color: 'var(--text)' }}>Správce dat:</strong> Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA.
                Data mohou být přenesena do USA v rámci standardních smluvních doložek EU.{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--lime)', textDecoration: 'underline' }}>
                  Zásady ochrany soukromí Google
                </a>.
              </div>
            </div>
          </div>
        </Section>

        <Section title="Jak udělit nebo odvolat souhlas">
          Při první návštěvě platformy se zobrazí lišta s možností souhlasit nebo odmítnout
          analytické cookies. Vaše volba se uloží do lokálního úložiště prohlížeče (klíč{' '}
          <code style={{ background: 'var(--border)', borderRadius: 2, padding: '0 4px', fontSize: '0.8em' }}>iron_cookie_consent</code>).
          <br /><br />
          Souhlas s analytickými cookies můžete kdykoli <strong style={{ color: 'var(--text)' }}>odvolat</strong>{' '}
          vymazáním dat webu v nastavení prohlížeče:
          <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem' }}>
            <li><strong style={{ color: 'var(--text)' }}>Chrome:</strong> Nastavení → Soukromí a bezpečnost → Cookies a data stránek → Zobrazit všechna data stránek → ironmap.cz → Odstranit</li>
            <li><strong style={{ color: 'var(--text)' }}>Firefox:</strong> Nastavení → Soukromí a zabezpečení → Cookies a data stránek → Spravovat data → ironmap.cz → Odstranit</li>
            <li><strong style={{ color: 'var(--text)' }}>Safari:</strong> Nastavení → Soukromí → Spravovat data webových stránek → ironmap.cz → Odstranit</li>
          </ul>
          Po vymazání dat se lišta se souhlasem zobrazí znovu při příští návštěvě.
        </Section>

        <Section title="Správa cookies v prohlížeči">
          Přijímání cookies můžete zcela zakázat v nastavení svého prohlížeče. Upozorňujeme, že
          zablokování nezbytných cookies může narušit přihlašování a základní funkce platformy.
          Analytické cookies lze bezpečně zakázat bez vlivu na funkčnost webu.
        </Section>

        <Section title="Vaše práva dle GDPR">
          V souvislosti se zpracováním osobních údajů prostřednictvím analytických cookies máte
          následující práva:
          <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem' }}>
            <li><strong style={{ color: 'var(--text)' }}>Právo na přístup</strong> — zjistit, jaká data o vás zpracováváme</li>
            <li><strong style={{ color: 'var(--text)' }}>Právo na výmaz</strong> — požádat o smazání vašich dat</li>
            <li><strong style={{ color: 'var(--text)' }}>Právo odvolat souhlas</strong> — kdykoli bez udání důvodu (viz výše)</li>
            <li><strong style={{ color: 'var(--text)' }}>Právo podat stížnost</strong> — u dozorového orgánu, jímž je Úřad pro ochranu osobních údajů (ÚOOÚ), Pplk. Sochora 27, 170 00 Praha 7,{' '}
              <a href="https://www.uoou.cz" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--lime)', textDecoration: 'underline' }}>www.uoou.cz</a>
            </li>
          </ul>
        </Section>

        <Section title="Kontakt">
          Pro dotazy k cookies nebo zpracování osobních údajů nás kontaktujte na:{' '}
          <a href="mailto:bob.fejtek@gmail.com" style={{ color: 'var(--lime)', textDecoration: 'underline' }}>
            bob.fejtek@gmail.com
          </a>
        </Section>

      </div>

      <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/" className="iron-btn iron-btn-ghost" style={{ fontSize: '0.85rem' }}>
          Zpět na hlavní stránku
        </Link>
        <Link href="/ochrana-soukromi" className="iron-btn iron-btn-outline" style={{ fontSize: '0.85rem' }}>
          Ochrana soukromí
        </Link>
        <Link href="/podminky-pouziti" className="iron-btn iron-btn-outline" style={{ fontSize: '0.85rem' }}>
          Podmínky použití
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: '1.25rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.85rem',
        textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--lime)',
        marginBottom: '0.4rem',
      }}>
        {title}
      </h2>
      <div>{children}</div>
    </div>
  );
}
