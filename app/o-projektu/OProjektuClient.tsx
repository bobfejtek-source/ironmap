'use client';

interface Props {
  gymCountStr: string;
  cityCountStr: string;
}

const PARAGRAPHS = [
  'Bydlím v malém městě. Sotva deset tisíc lidí, jedno náměstí, pár hospod a tři fitka.',
  'Dlouho jsem chtěl začít cvičit.',
  'Ne proto že bych musel. Ale protože jsem věděl co mi to přinese. Lepší spánek. Více energie. Méně stresu. Jasnější hlava. Silnější tělo. Tohle všechno jsem chtěl a přesto jsem to odkládal měsíce.',
  'Proč? Ne kvůli lenosti. Kvůli maličkostem které se hromadily.',
  'Kde vůbec začít? Každé fitko jiný web, jiné ceny, jiné informace nebo žádné. Jedno číslo které nikdo nebral. Otevírací doba která platila nebo neplatila. A pak přišel den kdy jsem se odhodlal a přijel, zaplatit hotově, protože karty nebrali. Nikde to nepsali.',
  'Kolem mě chodili chlapi co tam cvičí deset let, znají se, smějí se. A já stál u dveří v tričku z H&M, bez tušení jak to tu funguje. Ptal jsem se na základní věci a cítil jsem se jako vetřelec. Všichni si tykají, já vykám, všichni vědí kde co je, já ne.',
  'Odešel jsem s červenými ušima. Týden jsem to odkládal. Pak jsem zkusil jiné fitko a zapomněl hotovost. Otočil jsem se ve dveřích, zajel na bankomat na druhý konec vesnice a když jsem se vrátil, bylo zavřeno.',
  'Začít cvičit je pro spoustu lidí jedno z nejtěžších rozhodnutí. A všechny tyhle maličkosti, nejasné info, hotovost, cizí prostředí, to rozhodnutí zbytečně komplikují.',
];

export default function OProjektuClient({ gymCountStr, cityCountStr }: Props) {
  return (
    <div style={{
      maxWidth: '680px',
      margin: '0 auto',
      padding: '5rem 2rem 6rem',
    }}>
      {/* Tag */}
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
        {PARAGRAPHS.map((text, i) => (
          <p key={i}>{text}</p>
        ))}

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
          IRONMAP vznikl proto, aby ty maličkosti zmizely.
        </div>

        <p>
          Najdi fitko. Zjisti kdy mají otevřeno, kolik stojí vstup, jestli berou kartu. Vyber si předem trenéra. Zaplať vstup klidně z mobilu. Srovnej recenze, prostředí, vybavení. Přijď připravený. Bez překvapení. Bez červených uší.
        </p>

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
            { num: gymCountStr, label: 'posiloven' },
            { num: cityCountStr, label: 'měst' },
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
          Dnes máme přes {gymCountStr} posiloven a fitness center ve více než {cityCountStr} městech po celé České republice. Přidáváme každý týden. A jednoho dne chceme být místem kde v ČR najdeš úplně každý sport, od posilovny přes jógu až po lezeckou stěnu.
        </p>

        <p>Aby ten první krok nezabolel. Pro nikoho.</p>

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
