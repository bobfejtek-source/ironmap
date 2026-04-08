import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'O projektu',
  description: 'IRONMAP vznikl z otočení ve dveřích. Příběh za největším adresářem posiloven v ČR.',
};

export default function OProjektuPage() {
  return (
    <div style={{
      maxWidth: '680px',
      margin: '0 auto',
      padding: '5rem 2rem 6rem',
    }}>
      {/* Tag line */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '0.68rem',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--lime)',
        marginBottom: '2.5rem',
      }}>
        Česká republika / fitness directory
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: 'clamp(2.4rem, 6vw, 4rem)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight: 1,
        marginBottom: '3.5rem',
        color: 'var(--text)',
      }}>
        Proč<br />IRONMAP?
      </h1>

      {/* Prose */}
      <div style={{
        fontFamily: 'var(--font-barlow)',
        fontWeight: 300,
        fontSize: '1.15rem',
        lineHeight: 1.8,
        color: 'var(--muted)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.6rem',
      }}>
        <p>
          Bydlím v malém městě. Sotva deset tisíc lidí, jedno náměstí, pár hospod a tři fitka.
        </p>
        <p>
          Půl roku jsem váhal začít posilovat.
        </p>
        <p>
          Každé ráno jsem si říkal: dnes to zkusím. A pak jsem otevřel prohlížeč, našel tři fitka, žádné pořádné info, jedno číslo, které nikdo nebral a zavřel to. Zítra.
        </p>
        <p>
          Když jsem konečně přišel, zaplatil jsem hotově, protože karty nebrali. Nikde to nepsali. Kolem mě chodili chlapi co tam cvičí deset let, znají se, smějí se. A já stál u dveří v tričku z H&M, bez tušení, jak to tu funguje. Ptal jsem se na základní věci a cítil jsem se jako debil. Všichni si tykají, já vykám, všichni vědí, kde co je, já ne.
        </p>
        <p>
          Odešel jsem s červenými ušima. Měsíc jsem tam nešel.
        </p>
        <p>
          A víš, co bylo nejhorší? Druhý týden jsem zapomněl hotovost. Přijel jsem, otočil se ve dveřích, zajel na bankomat na druhý konec vesnice a když jsem se vrátil bylo zavřeno. Prostě zavřeno. Bez varování.
        </p>
        <p>
          Rozhodnout se poprvé v životě jít cvičit je jedno z nejtěžších rozhodnutí. A tehdy jsem si řekl: tohle nesmí být takhle složité.
        </p>
        <p>
          Chtěl jsem jediné. Koupit vstup předem z mobilu. Vědět, že mě pustí. Přijít připravený. Bez hotovosti, bez červených uší, bez otáčení ve dveřích.
        </p>

        {/* Pull quote */}
        <div style={{
          borderLeft: '3px solid var(--lime)',
          paddingLeft: '1.5rem',
          margin: '1rem 0',
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          lineHeight: 1.2,
          color: 'var(--text)',
        }}>
          IRONMAP vznikl z toho otočení ve dveřích.
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: '3rem',
          padding: '1.5rem 0',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}>
          {[
            { num: '780', label: 'posiloven' },
            { num: '190', label: 'měst' },
          ].map(({ num, label }) => (
            <div key={label}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '2.5rem',
                letterSpacing: '0.04em',
                color: 'var(--lime)',
                lineHeight: 1,
              }}>{num}</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '0.68rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginTop: '0.3rem',
              }}>{label}</div>
            </div>
          ))}
        </div>

        <p>
          Dnes máme 780 posiloven ve 190 městech. Přidáváme každý týden. A jednoho dne chceme být místem kde v ČR najdeš úplně každý sport, od posilovny přes jógu až po lezeckou stěnu. A kde si vstup koupíš dřív než nasedneš do auta.
        </p>
        <p>
          Aby ten první krok nezabolel. Pro nikoho.
        </p>

        {/* Signature */}
        <div style={{
          marginTop: '1rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '1rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text)',
          }}>
            Bohdan
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '0.68rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginTop: '0.25rem',
          }}>
            Zakladatel
          </div>
        </div>
      </div>
    </div>
  );
}
