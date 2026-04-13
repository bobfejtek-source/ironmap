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

        <Section title="1. Uvodní ustanovení">
          Tyto obchodní podmínky (dále jen "podmínky") upravují vzájemná práva a povinnosti mezi
          provozovatelem platformy IRONMAP a fyzickými nebo právnickými osobami, které využívají
          služby platformy (dále jen "uživatel" nebo "majitel gymu"). Podmínky jsou vydány v souladu
          s ustanovením § 1751 odst. 1 zákona c. 89/2012 Sb., obcanský zákoník (dále jen "NOZ").
          Uzavřením smlouvy o využívání placených služeb uživatel potvrzuje, že se s těmito
          podmínkami seznámil a souhlasí s nimi.
        </Section>

        <Section title="2. Provozovatel">
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
            <li><strong style={{ color: 'var(--text)' }}>Obchodní firma:</strong> Agile House s.r.o.</li>
            <li><strong style={{ color: 'var(--text)' }}>ICO:</strong> 06913903</li>
            <li><strong style={{ color: 'var(--text)' }}>Sídlo:</strong> Jicínská 226/17, Žižkov, 130 00 Praha 3</li>
            <li><strong style={{ color: 'var(--text)' }}>Zápis:</strong> Mestský soud v Praze</li>
            <li><strong style={{ color: 'var(--text)' }}>Web:</strong> ironmap.cz</li>
            <li><strong style={{ color: 'var(--text)' }}>Kontaktní e-mail:</strong> bob.fejtek@gmail.com</li>
          </ul>
        </Section>

        <Section title="3. Popis služby a predmet smlouvy">
          Platforma IRONMAP je online adresár fitness center a posiloven v České republice.
          Provozovatel poskytuje následující úrovne služeb:
          <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem' }}>
            <li>
              <strong style={{ color: 'var(--text)' }}>Free</strong> - bezplatný základní profil
              zahrnující zobrazení v adresári, adresu, otevírací dobu a kontaktní údaje.
            </li>
            <li>
              <strong style={{ color: 'var(--text)' }}>Pro - 499 Kc/mesíc</strong> - rozšírený profil
              s prioritní pozicí ve vyhledávání, fotogalerií, statistikami zobrazení, oveřeným
              odznakem a 15 % slevou na reklamní sloty.
            </li>
            <li>
              <strong style={{ color: 'var(--text)' }}>Elite - 1 290 Kc/mesíc</strong> - prémiový profil
              zahrnující vše z plánu Pro, pokrocilé statistiky, Featured odznak, 25 % slevu na reklamní
              sloty, 3 dny Gold Mestský slot zdarma mesícne a dedikovaného account managera.
            </li>
          </ul>
          Dále jsou dostupné <strong style={{ color: 'var(--text)' }}>reklamní sloty</strong> pro
          zvýraznení gymu ve výsledcích vyhledávání v kategorii Gold, Silver a Bronze, a to jak na
          národní úrovni (7 dní; Gold 7 999 Kc, Silver 5 999 Kc, Bronze 4 999 Kc), tak na mestské
          úrovni (7 dní; Gold 2 999 Kc, Silver 1 999 Kc, Bronze 1 499 Kc). Ceny jsou uvedeny bez
          DPH. Uživatelé s plány Pro a Elite mají nárok na automatickou slevu 15 %, resp. 25 %.
          Reklamní sloty jsou exkluzivní - po obsazení není možné zakoupit stejnou pozici do uplynutí
          doby kampane.
        </Section>

        <Section title="4. Registrace a uživatelský úcet">
          Přidání gymu do adresáre a využívání placených služeb vyžaduje registraci. Uživatel je
          povinen uvést pravdivé, úplné a aktuální údaje. Přístupové údaje jsou nepřenosné - uživatel
          nesmí umožnit třetím osobám přístup ke svému úctu. V prípade ztráty nebo zneužití přístupových
          údaju je uživatel povinen tuto skutecnost neprodlene oznámit provozovateli. Provozovatel si
          vyhrazuje právo zrušit úcet, který porušuje tyto podmínky nebo obsahuje nepravdivé informace.
        </Section>

        <Section title="5. Platební podmínky">
          Platby za placené plány (Pro, Elite) a reklamní sloty jsou splatné předem. Předplatné Pro
          a Elite se automaticky obnovuje každý mesíc, pokud uživatel predplatné nezmení nebo nezruší
          pred datem obnovy. Platba je zpracovávána prostrednictvím platební brány. Provozovatel
          vystaví daňový doklad do 15 dnu od prijatí platby. Ceny jsou platné ke dni objednávky;
          provozovatel si vyhrazuje právo ceny menit s oznámením alespon 30 dnu predem.
        </Section>

        <Section title="6. Odstoupení od smlouvy">
          V souladu s § 1829 odst. 1 NOZ má spotrebitel právo odstoupit od smlouvy uzavrené
          distancním zpusobem bez udání duvodu ve lhuте 14 dnu od uzavrení smlouvy. Uplatnění práva
          na odstoupení od smlouvy je nutné provozovateli sdelit písemne na adresu bob.fejtek@gmail.com.
          V prípade odstoupení bude platba vrácena do 14 dnu od dorucení oznámení o odstoupení, a to
          stejným zpusobem, jakým byla platba prijata, pokud se strany nedohodnou jinak.
          Upozornujeme, že v prípade digitálního obsahu, který byl se souhlasem spotrebitele poskytnut
          pred uplynutím lhuty pro odstoupení, právo na odstoupení zaniká (§ 1837 písm. l) NOZ).
        </Section>

        <Section title="7. Práva a povinnosti majitelu gymu">
          Majitel gymu (uživatel s registrovaným profilem) se zavazuje:
          <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem' }}>
            <li>uvádét pouze pravdivé, aktuální a úplné informace o svém zarízení,</li>
            <li>neprodlene aktualizovat informace pri jejich zmene,</li>
            <li>nesdílet přístupové údaje s tretími osobami,</li>
            <li>
              nepoužívat platformu k šírení nezákonného, klamavého nebo závadného obsahu,
            </li>
            <li>
              nezasahovat do provozu platformy ani do práv jiných uživatelu.
            </li>
          </ul>
          Majitel gymu bere na vedomí, že provozovatel muže na platforme zobrazovat verejne dostupné
          informace o gymech i bez uzavrení smlouvy, a to za úcelem úplnosti adresáre.
        </Section>

        <Section title="8. Odpovédnost za obsah">
          Provozovatel nenese odpovédnost za pravdivost, úplnost ani aktuálnost informací uvedených
          uživateli v profilech gymcu. Informace na platforme slouží pouze pro orientacní úcely.
          Provozovatel si vyhrazuje právo bez predchozího upozornení odstraнit obsah, který je v
          rozporu s platnými právními predpisy, dobrými mravy nebo temito podmínkami. Celková
          odpovédnost provozovatele za škodu vzniklou uživateli v souvislosti s užíváním platformy
          je omezena na výši plateb skutecne uhrazených uživatelem za posledních 12 mesícu.
        </Section>

        <Section title="9. Zmeny podmínek">
          Provozovatel si vyhrazuje právo tyto podmínky kdykoli zmenit. O podstatných zmenách bude
          uživatel informován e-mailem na adresu uvedenou pri registraci, a to nejpozdeji 30 dnu
          pred nabytím úcinnosti zmen. Pokud uživatel se zmenami nesouhlasí, je oprávnen smlouvu
          vypovédet. Pokracování v užívání placených služeb po nabytí úcinnosti zmen se považuje za
          souhlas s novými podmínkami.
        </Section>

        <Section title="10. Rozhodné právo a rešení sporu">
          Tyto podmínky a veškeré smlouvy uzavrené na jejich základe se rídí ceský právem, zejména
          zákonem c. 89/2012 Sb., obcanský zákoník. Veškeré spory vzniklé v souvislosti s užíváním
          platformy budou rešeny pred príslušnými ceský soudy.
          <br /><br />
          Spotrebitel má právo na mimosoudní rešení spotrebitelských sporu. Príslušným subjektem
          pro mimosoudní rešení sporu je <strong style={{ color: 'var(--text)' }}>Ceská obchodní
          inspekce (COI)</strong>, Štepánská 796/44, 110 00 Praha 1, webové stránky:{' '}
          <a href="https://www.coi.cz" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--lime)', textDecoration: 'underline' }}>www.coi.cz</a>.
          Platformu pro online rešení sporu (ODR) spravuje Evropská komise na adrese:{' '}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--lime)', textDecoration: 'underline' }}>ec.europa.eu/consumers/odr</a>.
        </Section>

      </div>

      <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/" className="iron-btn iron-btn-ghost" style={{ fontSize: '0.85rem' }}>
          Zpet na hlavní stránku
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
