import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Podmínky použití',
  robots: { index: true, follow: true },
  alternates: { canonical: '/podminky-pouziti' },
};

export default function PodminkyPouzitiPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 2rem 6rem' }}>
      <div className="iron-label" style={{ marginBottom: '1.5rem' }}>Právní dokumenty</div>

      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 900,
        fontSize: 'clamp(2rem, 5vw, 3.5rem)', textTransform: 'uppercase',
        marginBottom: '0.75rem',
      }}>
        Podmínky použití
      </h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '2.5rem', fontWeight: 300 }}>
        Platné od 1. dubna 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.7 }}>

        <Section title="1. Úvodní ustanovení">
          Tyto podmínky použití upravují pravidla přístupu a užívání webové platformy IRONMAP dostupné
          na adrese <strong style={{ color: 'var(--text)' }}>ironmap.cz</strong> (dále jen &bdquo;platforma&ldquo;).
          Platformu provozuje společnost Agile House s.r.o., IČO: 06913903, se sídlem Jičínská 226/17,
          Žižkov, 130 00 Praha 3 (dále jen &bdquo;provozovatel&ldquo;). Přístupem na platformu vyjadřujete souhlas
          s těmito podmínkami. Pokud s podmínkami nesouhlasíte, platformu prosím nepoužívejte.
        </Section>

        <Section title="2. Účel platformy">
          IRONMAP je veřejně přístupný online adresář fitness center, posiloven a sportovišť v České
          republice. Cílem platformy je usnadnit uživatelům vyhledávání sportovišť, porovnávání
          jejich parametrů (otevírací doby, ceny, vybavení, kontakty) a orientaci v nabídce fitness
          v jejich okolí. Platforma je určena fyzickým osobám starším 16 let a majitelům či provozovatelům
          fitness center.
        </Section>

        <Section title="3. Bezplatný přístup a registrace">
          Prohlížení veřejné části platformy (adresáře gymů, detailů profilů, vyhledávání) je zcela
          bezplatné a nevyžaduje registraci. Registrace je vyžadována pro funkce jako check-in,
          sbírání odznaků, správa vlastního profilu a přístup k placeným službám pro majitele gymů.
          Registrací uživatel potvrzuje, že je starší 16 let a že jím uvedené údaje jsou pravdivé
          a aktuální.
        </Section>

        <Section title="4. Pravidla chování uživatelů">
          Při používání platformy jste povinni:
          <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem' }}>
            <li>dodržovat platné právní předpisy České republiky a EU,</li>
            <li>nepoužívat platformu k šíření nepravdivých, klamavých nebo urážlivých informací,</li>
            <li>nenarušovat provoz platformy, serverů ani sítí s ní spojených,</li>
            <li>nezpracovávat obsah platformy automatizovaně (scraping, crawling) bez písemného souhlasu provozovatele,</li>
            <li>nevydávat se za jiné osoby nebo instituce,</li>
            <li>nepoužívat platformu k šíření spamu, malwaru nebo jiného škodlivého obsahu.</li>
          </ul>
          Porušení těchto pravidel může vést k okamžitému zrušení vašeho účtu bez nároku na náhradu.
        </Section>

        <Section title="5. Obsah platformy">
          Provozovatel vyvíjí přiměřené úsilí k zajištění správnosti a aktuálnosti informací v adresáři.
          Část dat pochází z veřejně dostupných zdrojů nebo od samotných provozovatelů gymů. Provozovatel
          nenese odpovědnost za případné nepřesnosti, neúplnost nebo zastaralost zobrazených informací.
          Před návštěvou gymu doporučujeme ověřit aktuální otevírací dobu a ceny přímo u provozovatele
          daného sportoviště.
        </Section>

        <Section title="6. Duševní vlastnictví">
          Veškerý obsah platformy — včetně textů, grafiky, loga, kódu, databázové struktury a designu —
          je chráněn autorským právem a náleží provozovateli nebo jeho poskytovatelům licencí. Je zakázáno
          kopírovat, šířit, upravovat nebo jinak užívat tento obsah bez předchozího písemného souhlasu
          provozovatele. Profily gymů zobrazené na platformě mohou obsahovat obsah třetích stran (fotografie,
          popisy), za jehož pravdivost a oprávněnost zveřejnění odpovídá příslušný provozovatel gymu.
        </Section>

        <Section title="7. Dostupnost služby">
          Provozovatel usiluje o nepřetržitou dostupnost platformy, avšak nezaručuje dostupnost bez
          výpadků. Platforma může být dočasně nedostupná z důvodu údržby, aktualizací nebo technických
          problémů. O plánovaných výpadcích budeme informovat, kdykoli to bude možné. Provozovatel
          nenese odpovědnost za škody vzniklé v důsledku dočasné nedostupnosti platformy.
        </Section>

        <Section title="8. Ochrana osobních údajů">
          Zpracování osobních údajů uživatelů se řídí samostatným dokumentem —{' '}
          <Link href="/ochrana-soukromi" style={{ color: 'var(--lime)', textDecoration: 'underline' }}>
            Zásady ochrany osobních údajů
          </Link>. Používáním platformy berete na vědomí způsoby zpracování popsané v tomto dokumentu.
          Pokud jste provozovatelem gymu a uzavíráte s námi smluvní vztah, vztahují se na vás rovněž{' '}
          <Link href="/obchodni-podminky" style={{ color: 'var(--lime)', textDecoration: 'underline' }}>
            Obchodní podmínky
          </Link>.
        </Section>

        <Section title="9. Cookies">
          Platforma používá cookies nezbytné pro správnou funkci (session management) a volitelně
          analytické cookies (Google Analytics GA4) pro anonymní měření návštěvnosti. Podrobnosti
          naleznete v{' '}
          <Link href="/cookies" style={{ color: 'var(--lime)', textDecoration: 'underline' }}>
            Zásadách používání cookies
          </Link>.
        </Section>

        <Section title="10. Omezení odpovědnosti">
          Platforma je poskytována &bdquo;tak jak je&ldquo; bez jakýchkoli záruk. Provozovatel neodpovídá za
          přímé ani nepřímé škody vzniklé v souvislosti s použitím nebo nemožností použití platformy,
          včetně ušlého zisku, ztráty dat nebo poškození zařízení. Toto omezení se neuplatní v případech,
          kdy tak stanoví kogentní ustanovení právních předpisů (např. v případě úmyslného jednání nebo
          hrubé nedbalosti provozovatele).
        </Section>

        <Section title="11. Změny podmínek">
          Provozovatel si vyhrazuje právo tyto podmínky kdykoli upravit. Aktuální verze je vždy
          dostupná na této stránce. O podstatných změnách budeme registrované uživatele informovat
          e-mailem nejméně 14 dní předem. Pokračováním v užívání platformy po nabytí účinnosti změn
          vyjadřujete s novými podmínkami souhlas.
        </Section>

        <Section title="12. Rozhodné právo">
          Tyto podmínky se řídí právním řádem České republiky. Veškeré spory vzniklé v souvislosti
          s užíváním platformy budou řešeny před příslušnými českými soudy. Spotřebitelé mají právo
          na mimosoudní řešení sporů prostřednictvím České obchodní inspekce (ČOI) —{' '}
          <a href="https://www.coi.cz" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--lime)', textDecoration: 'underline' }}>www.coi.cz</a>.
        </Section>

        <Section title="13. Kontakt">
          Dotazy k těmto podmínkám zasílejte na:{' '}
          <a href="mailto:bob.fejtek@gmail.com" style={{ color: 'var(--lime)', textDecoration: 'underline' }}>
            bob.fejtek@gmail.com
          </a>
        </Section>

      </div>

      <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/" className="iron-btn iron-btn-ghost" style={{ fontSize: '0.85rem' }}>
          Zpět na hlavní stránku
        </Link>
        <Link href="/obchodni-podminky" className="iron-btn iron-btn-outline" style={{ fontSize: '0.85rem' }}>
          Obchodní podmínky
        </Link>
        <Link href="/cookies" className="iron-btn iron-btn-outline" style={{ fontSize: '0.85rem' }}>
          Cookies
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
