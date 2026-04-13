import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Obchodní podmínky',
  robots: { index: true, follow: true },
  alternates: { canonical: '/obchodni-podminky' },
};

export default function ObchodniPodminkyPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 2rem 6rem' }}>
      <div className="iron-label" style={{ marginBottom: '1.5rem' }}>Právní dokumenty</div>

      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 900,
        fontSize: 'clamp(2rem, 5vw, 3.5rem)', textTransform: 'uppercase',
        marginBottom: '0.75rem',
      }}>
        Obchodní podmínky
      </h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '2.5rem', fontWeight: 300 }}>
        Platné od 1. dubna 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.7 }}>

        <Section title="1. Úvodní ustanovení">
          Tyto obchodní podmínky (dále jen &ldquo;podmínky&rdquo;) upravují vzájemná práva a povinnosti mezi
          provozovatelem platformy IRONMAP a fyzickými nebo právnickými osobami, které využívají
          služby platformy (dále jen &ldquo;uživatel&rdquo; nebo &ldquo;majitel gymu&rdquo;). Podmínky jsou vydány v souladu
          s ustanovením § 1751 odst. 1 zákona č. 89/2012 Sb., občanský zákoník (dále jen &ldquo;NOZ&rdquo;).
          Uzavřením smlouvy o využívání placených služeb uživatel potvrzuje, že se s těmito
          podmínkami seznámil a souhlasí s nimi.
        </Section>

        <Section title="2. Provozovatel">
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
            <li><strong style={{ color: 'var(--text)' }}>Obchodní firma:</strong> Agile House s.r.o.</li>
            <li><strong style={{ color: 'var(--text)' }}>IČO:</strong> 06913903</li>
            <li><strong style={{ color: 'var(--text)' }}>Sídlo:</strong> Jičínská 226/17, Žižkov, 130 00 Praha 3</li>
            <li><strong style={{ color: 'var(--text)' }}>Zápis:</strong> Městský soud v Praze</li>
            <li><strong style={{ color: 'var(--text)' }}>Web:</strong> ironmap.cz</li>
            <li><strong style={{ color: 'var(--text)' }}>Kontaktní e-mail:</strong> bob.fejtek@gmail.com</li>
          </ul>
        </Section>

        <Section title="3. Popis služby a předmět smlouvy">
          Platforma IRONMAP je online adresář fitness center a posiloven v České republice.
          Provozovatel poskytuje následující úrovně služeb:
          <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem' }}>
            <li>
              <strong style={{ color: 'var(--text)' }}>Free</strong> - bezplatný základní profil
              zahrnující zobrazení v adresáři, adresu, otevírací dobu a kontaktní údaje.
            </li>
            <li>
              <strong style={{ color: 'var(--text)' }}>Pro - 499 Kč/měsíc</strong> - rozšířený profil
              s prioritní pozicí ve vyhledávání, fotogalerií, statistikami zobrazení, ověřeným
              odznakem a 15 % slevou na reklamní sloty.
            </li>
            <li>
              <strong style={{ color: 'var(--text)' }}>Elite - 1 290 Kč/měsíc</strong> - prémiový profil
              zahrnující vše z plánu Pro, pokročilé statistiky, Featured odznak, 25 % slevu na reklamní
              sloty, 3 dny Gold Městský slot zdarma měsíčně a dedikovaného account managera.
            </li>
          </ul>
          Dále jsou dostupné <strong style={{ color: 'var(--text)' }}>reklamní sloty</strong> pro
          zvýraznění gymu ve výsledcích vyhledávání v kategorii Gold, Silver a Bronze, a to jak na
          národní úrovni (7 dní; Gold 7 999 Kč, Silver 5 999 Kč, Bronze 4 999 Kč), tak na městské
          úrovni (7 dní; Gold 2 999 Kč, Silver 1 999 Kč, Bronze 1 499 Kč). Ceny jsou uvedeny bez
          DPH. Uživatelé s plány Pro a Elite mají nárok na automatickou slevu 15 %, resp. 25 %.
          Reklamní sloty jsou exkluzivní - po obsazení není možné zakoupit stejnou pozici do uplynutí
          doby kampaně.
        </Section>

        <Section title="4. Registrace a uživatelský účet">
          Přidání gymu do adresáře a využívání placených služeb vyžaduje registraci. Uživatel je
          povinen uvést pravdivé, úplné a aktuální údaje. Přístupové údaje jsou nepřenosné - uživatel
          nesmí umožnit třetím osobám přístup ke svému účtu. V případě ztráty nebo zneužití přístupových
          údajů je uživatel povinen tuto skutečnost neprodleně oznámit provozovateli. Provozovatel si
          vyhrazuje právo zrušit účet, který porušuje tyto podmínky nebo obsahuje nepravdivé informace.
        </Section>

        <Section title="5. Platební podmínky">
          Platby za placené plány (Pro, Elite) a reklamní sloty jsou splatné předem. Předplatné Pro
          a Elite se automaticky obnovuje každý měsíc, pokud uživatel předplatné nezmění nebo nezruší
          před datem obnovy. Platba je zpracovávána prostřednictvím platební brány. Provozovatel
          vystaví daňový doklad do 15 dnů od přijetí platby. Ceny jsou platné ke dni objednávky;
          provozovatel si vyhrazuje právo ceny měnit s oznámením alespoň 30 dnů předem.
        </Section>

        <Section title="6. Odstoupení od smlouvy">
          V souladu s § 1829 odst. 1 NOZ má spotřebitel právo odstoupit od smlouvy uzavřené
          distančním způsobem bez udání důvodu ve lhůtě 14 dnů od uzavření smlouvy. Uplatnění práva
          na odstoupení od smlouvy je nutné provozovateli sdělit písemně na adresu bob.fejtek@gmail.com.
          V případě odstoupení bude platba vrácena do 14 dnů od doručení oznámení o odstoupení, a to
          stejným způsobem, jakým byla platba přijata, pokud se strany nedohodnou jinak.
          Upozorňujeme, že v případě digitálního obsahu, který byl se souhlasem spotřebitele poskytnut
          před uplynutím lhůty pro odstoupení, právo na odstoupení zaniká (§ 1837 písm. l) NOZ).
        </Section>

        <Section title="7. Práva a povinnosti majitelů gymů">
          Majitel gymu (uživatel s registrovaným profilem) se zavazuje:
          <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem' }}>
            <li>uvádět pouze pravdivé, aktuální a úplné informace o svém zařízení,</li>
            <li>neprodleně aktualizovat informace při jejich změně,</li>
            <li>nesdílet přístupové údaje s třetími osobami,</li>
            <li>
              nepoužívat platformu k šíření nezákonného, klamavého nebo závadného obsahu,
            </li>
            <li>
              nezasahovat do provozu platformy ani do práv jiných uživatelů.
            </li>
          </ul>
          Majitel gymu bere na vědomí, že provozovatel může na platformě zobrazovat veřejně dostupné
          informace o gymech i bez uzavření smlouvy, a to za účelem úplnosti adresáře.
        </Section>

        <Section title="8. Odpovědnost za obsah">
          Provozovatel nenese odpovědnost za pravdivost, úplnost ani aktuálnost informací uvedených
          uživateli v profilech gymů. Informace na platformě slouží pouze pro orientační účely.
          Provozovatel si vyhrazuje právo bez předchozího upozornění odstranit obsah, který je v
          rozporu s platnými právními předpisy, dobrými mravy nebo těmito podmínkami. Celková
          odpovědnost provozovatele za škodu vzniklou uživateli v souvislosti s užíváním platformy
          je omezena na výši plateb skutečně uhrazených uživatelem za posledních 12 měsíců.
        </Section>

        <Section title="9. Změny podmínek">
          Provozovatel si vyhrazuje právo tyto podmínky kdykoli změnit. O podstatných změnách bude
          uživatel informován e-mailem na adresu uvedenou při registraci, a to nejpozději 30 dnů
          před nabytím účinnosti změn. Pokud uživatel se změnami nesouhlasí, je oprávněn smlouvu
          vypovědět. Pokračování v užívání placených služeb po nabytí účinnosti změn se považuje za
          souhlas s novými podmínkami.
        </Section>

        <Section title="10. Rozhodné právo a řešení sporů">
          Tyto podmínky a veškeré smlouvy uzavřené na jejich základě se řídí českým právem, zejména
          zákonem č. 89/2012 Sb., občanský zákoník. Veškeré spory vzniklé v souvislosti s užíváním
          platformy budou řešeny před příslušnými českými soudy.
          <br /><br />
          Spotřebitel má právo na mimosoudní řešení spotřebitelských sporů. Příslušným subjektem
          pro mimosoudní řešení sporů je <strong style={{ color: 'var(--text)' }}>Česká obchodní
          inspekce (ČOI)</strong>, Štěpánská 796/44, 110 00 Praha 1, webové stránky:{' '}
          <a href="https://www.coi.cz" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--lime)', textDecoration: 'underline' }}>www.coi.cz</a>.
          Platformu pro online řešení sporů (ODR) spravuje Evropská komise na adrese:{' '}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--lime)', textDecoration: 'underline' }}>ec.europa.eu/consumers/odr</a>.
        </Section>

      </div>

      <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/" className="iron-btn iron-btn-ghost" style={{ fontSize: '0.85rem' }}>
          Zpět na hlavní stránku
        </Link>
        <Link href="/ochrana-soukromi" className="iron-btn iron-btn-outline" style={{ fontSize: '0.85rem' }}>
          Ochrana soukromí
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
