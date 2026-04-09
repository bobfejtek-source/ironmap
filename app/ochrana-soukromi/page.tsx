import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Ochrana soukromí',
  robots: { index: false, follow: false },
};

export default function OchranaPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 2rem 6rem' }}>
      <div className="iron-label" style={{ marginBottom: '1.5rem' }}>Ochrana soukromí</div>

      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3.5rem)', textTransform: 'uppercase', marginBottom: '2rem' }}>
        Zásady ochrany osobních údajů
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.7 }}>

        <Section title="Správce údajů">
          Správcem osobních údajů je provozovatel platformy IRON. Kontakt: bob.fejtek@gmail.com
        </Section>

        <Section title="Jaké údaje zpracováváme">
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
            <li><strong style={{ color: 'var(--text)' }}>Přihlašovací údaje</strong> — e-mail, jméno a profilový obrázek z Google OAuth nebo e-mailový odkaz pro přihlášení.</li>
            <li><strong style={{ color: 'var(--text)' }}>Check-iny</strong> — záznamy o návštěvách posiloven (datum, čas, volitelně GPS souřadnice).</li>
            <li><strong style={{ color: 'var(--text)' }}>Odznaky</strong> — dosažené herní odznaky vázané na váš účet.</li>
          </ul>
        </Section>

        <Section title="Cookies">
          Používáme výhradně <strong style={{ color: 'var(--text)' }}>nezbytné cookies</strong> pro správu přihlášené relace (session token). Tyto cookies jsou httpOnly a nezpřístupňujeme je skriptům třetích stran. Nepoužíváme analytické, reklamní ani sledovací cookies.
        </Section>

        <Section title="Účel a právní základ">
          Údaje zpracováváme na základě <strong style={{ color: 'var(--text)' }}>plnění smlouvy</strong> (přihlášení a funkce aplikace) dle čl. 6 odst. 1 písm. b) GDPR. GPS souřadnice zpracováváme pouze na základě vašeho výslovného souhlasu při check-inu.
        </Section>

        <Section title="Sdílení s třetími stranami">
          Vaše údaje neprodáváme ani neposkytujeme třetím stranám za účelem marketingu. Přihlášení přes Google OAuth probíhá v souladu s podmínkami Google LLC.
        </Section>

        <Section title="Vaše práva (GDPR)">
          Máte právo na přístup, opravu, výmaz (právo být zapomenut), přenositelnost a omezení zpracování. Pro výmaz účtu použijte tlačítko <strong style={{ color: 'var(--text)' }}>&bdquo;Smazat účet&ldquo;</strong> v nastavení profilu — tím se trvale odstraní veškerá data spojená s vaším účtem.
        </Section>

        <Section title="Doba uchování">
          Data uchovávame po dobu aktivity účtu. Po smazání účtu jsou všechna data trvale odstraněna do 24 hodin.
        </Section>

      </div>

      <div style={{ marginTop: '3rem' }}>
        <Link href="/" className="iron-btn iron-btn-ghost" style={{ fontSize: '0.85rem' }}>
          ← Zpět na hlavní stránku
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
