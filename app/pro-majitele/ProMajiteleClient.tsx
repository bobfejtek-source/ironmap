'use client';

import { useState, useEffect, useRef } from 'react';
import { useModal } from '@/components/ModalContext';

interface Props {
  gymCount: number;
}

function formatGymCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}\u00a0${String(n % 1000).padStart(3, '0')}`;
  return String(n);
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

const CHECK_OPTIONS = [
  { key: 'free', label: 'Free listing' },
  { key: 'pro', label: 'Pro' },
  { key: 'elite', label: 'Elite' },
  { key: 'gymWeek', label: 'Gym of the Week' },
  { key: 'poradit', label: 'Chci se poradit' },
] as const;

type CheckKey = typeof CHECK_OPTIONS[number]['key'];

const WHY = [
  {
    title: 'ZÁKAZNÍCI V MOMENTĚ ROZHODNUTÍ',
    body: 'Oslovujeme lidi kteří aktivně hledají posilovnu — ne náhodné scrollery.',
  },
  {
    title: 'AŽ 10% ZÁKAZNÍKŮ CHCE PLATIT ONLINE',
    body: 'Připravujeme online booking. Vaše fitko bude připraveno jako první.',
  },
  {
    title: 'VÍTE CO FUNGUJE',
    body: 'Statistiky prohlédnutí, kliknutí, konverzí. Data která dříve měly jen velké řetězce.',
  },
  {
    title: 'ROSTEME SPOLU',
    body: 'Fitness trh v ČR roste 12% ročně. Jsme tu abychom rostli s vámi.',
  },
];

export default function ProMajiteleClient({ gymCount }: Props) {
  const { openAddGym } = useModal();

  // ── Animated counters ──────────────────────────────────────────────
  const statsRef = useRef<HTMLDivElement>(null);
  const [animating, setAnimating] = useState(false);
  const [counts, setCounts] = useState({ gym: 0, cities: 0, pct: 0, members: 0, membership: 0 });

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setAnimating(true); obs.disconnect(); } },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!animating) return;
    const duration = 1600;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const e = easeOutQuart(t);
      setCounts({
        gym:        Math.floor(e * gymCount),
        cities:     Math.floor(e * 190),
        pct:        Math.floor(e * 12),
        members:    Math.floor(e * 450),
        membership: Math.floor(e * 1500),
      });
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [animating, gymCount]);

  // ── Contact form ───────────────────────────────────────────────────
  const [form, setForm] = useState({ gymName: '', city: '', name: '', email: '', phone: '' });
  const [interests, setInterests] = useState<Record<CheckKey, boolean>>({
    free: false, pro: false, elite: false, gymWeek: false, poradit: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleInterest = (k: CheckKey) =>
    setInterests(prev => ({ ...prev, [k]: !prev[k] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const selectedInterests = CHECK_OPTIONS
      .filter(o => interests[o.key])
      .map(o => o.label)
      .join(', ') || 'Neuvedeno';
    try {
      const res = await fetch('https://formspree.io/f/xgopqqvz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          'Název gymu': form.gymName,
          'Město': form.city,
          'Jméno': form.name,
          'Email': form.email,
          'Telefon': form.phone,
          'Zájem o': selectedInterests,
          source: 'pro-majitele',
        }),
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>

      {/* ── 1. HERO ─────────────────────────────────────────────────── */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '5rem 2rem 4rem',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.68rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--lime)',
          marginBottom: '2rem',
        }}>
          Pro majitele gymů
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 'clamp(2.2rem, 6vw, 5rem)',
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          lineHeight: 0.95,
          marginBottom: '2.5rem',
          color: 'var(--text)',
        }}>
          Vaši zákazníci<br />
          vás hledají.<br />
          <span style={{ color: 'var(--lime)' }}>Najdou vás?</span>
        </h1>

        <p style={{
          fontFamily: 'var(--font-barlow)',
          fontWeight: 300,
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: 'var(--muted)',
          lineHeight: 1.7,
          maxWidth: 560,
          marginBottom: '3rem',
        }}>
          Přes 450 000 aktivních sportovců v ČR. Fitness trh roste 12% ročně. Buďte tam kde hledají.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a
            href="#kontakt"
            className="iron-btn iron-btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.75rem 2rem', textDecoration: 'none' }}
          >
            Přidat gym →
          </a>
          <a
            href="#cenik"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              padding: '0.75rem 2rem',
              textDecoration: 'none',
              transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            Zobrazit ceník
          </a>
        </div>
      </section>

      {/* ── 2. STATS BAR ─────────────────────────────────────────────── */}
      <div
        ref={statsRef}
        style={{
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--off-black)',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          padding: '0',
        }}
        className="pm-stats-grid"
      >
        {[
          { value: `${formatGymCount(counts.gym)}+`, label: 'fitness center v databázi' },
          { value: `${counts.cities}+`,              label: 'měst pokryto' },
          { value: `${counts.pct}%`,                 label: 'roční růst fitness trhu v ČR' },
          { value: `${counts.members}\u00a0000+`,    label: 'aktivních členů v ČR' },
          { value: `${counts.membership.toLocaleString('cs-CZ')}\u00a0Kč`, label: 'průměrné měsíční členství v ČR' },
        ].map(({ value, label }, i) => (
          <div key={i} style={{
            padding: '2.5rem 1.5rem',
            borderRight: i < 4 ? '1px solid var(--border)' : 'none',
            textAlign: 'center',
          }}
            className="pm-stat-cell"
          >
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(1.8rem, 3.5vw, 3rem)',
              letterSpacing: '0.02em',
              color: 'var(--lime)',
              lineHeight: 1,
              marginBottom: '0.5rem',
            }}>{value}</div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.65rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── 3. PROBLEM ───────────────────────────────────────────────── */}
      <section style={{
        padding: '7rem 2rem',
        maxWidth: 760,
        margin: '0 auto',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 'clamp(1.6rem, 4vw, 3rem)',
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          lineHeight: 1,
          marginBottom: '2.5rem',
          color: 'var(--text)',
        }}>
          Váš gym je skvělý.<br />
          <span style={{ color: 'var(--lime)' }}>Ale ví o něm dost lidí?</span>
        </h2>
        <p style={{
          fontFamily: 'var(--font-barlow)',
          fontWeight: 300,
          fontSize: '1.15rem',
          lineHeight: 1.8,
          color: 'var(--muted)',
        }}>
          Každý měsíc tisíce lidí ve vašem městě hledá posilovnu. Část z nich najde konkurenci. Část vás nenajde vůbec.{' '}
          <span style={{ color: 'var(--text)', fontWeight: 400 }}>
            IRONMAP to mění — jsme tam kde lidé hledají, v momentě rozhodnutí.
          </span>
        </p>
      </section>

      {/* ── 4. PRICING ───────────────────────────────────────────────── */}
      <section id="cenik" style={{
        padding: '0 2rem 7rem',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.68rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--lime)',
          marginBottom: '1.5rem',
        }}>
          Ceník
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)',
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          marginBottom: '3rem',
          color: 'var(--text)',
        }}>
          Vyberte svůj plán
        </h2>

        <div className="pm-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', alignItems: 'stretch' }}>

          {/* FREE */}
          <div style={{
            border: '1px solid var(--border)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            background: 'var(--off-black)',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem' }}>Free</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.5rem', letterSpacing: '0.02em', color: 'var(--text)', lineHeight: 1 }}>Zdarma</div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
              {['Základní profil s adresou', 'Zobrazení na mapě', 'Otevírací doba'].map(f => (
                <li key={f} style={{ fontFamily: 'var(--font-barlow)', fontSize: '0.95rem', color: 'var(--muted)', fontWeight: 300, display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--lime)', flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={openAddGym}
              className="iron-btn"
              style={{ marginTop: 'auto', fontSize: '0.8rem', padding: '0.65rem 1.25rem', border: '1px solid var(--border)', background: 'none', color: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--lime)'; e.currentTarget.style.color = 'var(--lime)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              Přidat gym zdarma
            </button>
          </div>

          {/* PRO */}
          <div style={{
            border: '1px solid var(--lime)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            background: 'var(--off-black)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: '-1px', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--lime)',
              color: '#000',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '0.6rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              padding: '0.25rem 0.75rem',
              whiteSpace: 'nowrap',
            }}>
              Nejpopulárnější
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '0.75rem' }}>Pro</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.5rem', letterSpacing: '0.02em', color: 'var(--text)', lineHeight: 1 }}>499 Kč<span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 700 }}>/měs</span></div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
              {[
                'Prioritní pozice ve vaší kategorii — buďte první jóga studio, první CrossFit box, první posilovna ve vašem městě',
                'Vlastní fotogalerie',
                'Statistiky prohlédnutí',
                'Ověřený badge — zákazníci vám věří více',
                'Přímý odkaz na váš web',
              ].map(f => (
                <li key={f} style={{ fontFamily: 'var(--font-barlow)', fontSize: '0.95rem', color: 'var(--muted)', fontWeight: 300, display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--lime)', flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a
              href="#kontakt"
              className="iron-btn iron-btn-primary"
              style={{ marginTop: 'auto', fontSize: '0.8rem', padding: '0.65rem 1.25rem', textDecoration: 'none', textAlign: 'center' }}
            >
              Začít zdarma 14 dní
            </a>
            <div style={{ fontFamily: 'var(--font-barlow)', fontWeight: 300, fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              499 Kč/měsíc = méně než třetina průměrného měsíčního členství. Jeden nový zákazník měsíčně = nulové náklady.
            </div>
          </div>

          {/* ELITE */}
          <div style={{
            border: '1px solid var(--border)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            background: 'var(--off-black)',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem' }}>Elite</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.5rem', letterSpacing: '0.02em', color: 'var(--text)', lineHeight: 1 }}>1 290 Kč<span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 700 }}>/měs</span></div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
              {[
                'Vše z Pro',
                'TOP pozice nad všemi — absolutní viditelnost',
                'Gym of the Month: homepage banner + článek + sociální sítě',
                '0% provize z prodaných vstupů',
                'Dedikovaný account manager',
                'Měsíční report návštěvnosti',
              ].map(f => (
                <li key={f} style={{ fontFamily: 'var(--font-barlow)', fontSize: '0.95rem', color: 'var(--muted)', fontWeight: 300, display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--lime)', flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a
              href="#kontakt"
              style={{
                marginTop: 'auto',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '0.8rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                padding: '0.65rem 1.25rem',
                textDecoration: 'none',
                textAlign: 'center',
                transition: 'border-color 0.2s, color 0.2s',
                display: 'block',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--lime)'; e.currentTarget.style.color = 'var(--lime)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              Kontaktovat nás
            </a>
          </div>
        </div>
      </section>

      {/* ── 4b. PLACEHOLDER AD PRODUCTS ─────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem 4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[
          {
            title: 'Kategorie Spotlight — brzy',
            body: 'Prémiová pozice na stránce vaší kategorie. Buďte první co zákazník vidí když hledá jógu, CrossFit nebo posilovnu ve svém městě.',
            price: 'od 299 Kč/měsíc',
          },
          {
            title: 'Homepage Rotace — brzy',
            body: 'Týdenní rotace vašeho gymu na hlavní stránce IRONMAP. Tisíce návštěvníků, maximální viditelnost.',
            price: 'od 999 Kč/měsíc',
          },
          {
            title: 'City Spotlight — brzy',
            body: 'První pozice na stránce vašeho města. Zákazníci hledající posilovnu v Praze, Brně nebo Ostravě uvidí vás jako první.',
            price: 'od 499 Kč/měsíc',
          },
        ].map(({ title, body, price }) => (
          <div key={title} style={{
            position: 'relative',
            border: '1px dashed var(--border)',
            padding: '1.75rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '2rem',
            flexWrap: 'wrap',
            background: 'var(--off-black)',
          }}>
            {/* Badge */}
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.55rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--border-mid)',
              border: '1px dashed var(--border)',
              padding: '0.2rem 0.5rem',
            }}>
              Připravujeme
            </div>

            <div style={{ flex: 1, minWidth: 0, paddingRight: '5rem' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '0.78rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: '0.5rem',
              }}>
                {title}
              </div>
              <p style={{
                fontFamily: 'var(--font-barlow)',
                fontWeight: 300,
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: 'var(--border-mid)',
                margin: 0,
              }}>
                {body}
              </p>
            </div>

            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.08em',
              color: 'var(--border-mid)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>
              {price}
            </div>
          </div>
        ))}
      </div>

      {/* ── 5. COMING SOON BANNER ────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '4rem 2rem',
        background: 'var(--black)',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem' }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.65rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--border-mid)',
              marginBottom: '0.75rem',
            }}>
              Brzy
            </div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--muted)',
              marginBottom: '0.75rem',
            }}>
              Reklamní bannery — brzy
            </h3>
            <p style={{
              fontFamily: 'var(--font-barlow)',
              fontWeight: 300,
              fontSize: '0.95rem',
              lineHeight: 1.7,
              color: 'var(--border-mid)',
              maxWidth: 480,
              margin: 0,
            }}>
              Připravujeme prémiové reklamní pozice pro vaše fitko. Homepage banner, kategorie stránky, výsledky vyhledávání. Máte zájem? Napište nám.
            </p>
          </div>
          <a
            href="#kontakt"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              padding: '0.6rem 1.25rem',
              textDecoration: 'none',
              flexShrink: 0,
              transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--muted)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            Mám zájem →
          </a>
        </div>
      </section>

      {/* ── 6. WHY IRONMAP ───────────────────────────────────────────── */}
      <section style={{ padding: '7rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.68rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--lime)',
          marginBottom: '1.5rem',
        }}>
          Proč IRONMAP
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)',
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          marginBottom: '3rem',
          color: 'var(--text)',
        }}>
          Čísla jsou jasná
        </h2>
        <div className="pm-why-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: 'var(--border)' }}>
          {WHY.map(({ title, body }) => (
            <div key={title} style={{
              background: 'var(--off-black)',
              padding: '2.5rem',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '0.8rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--lime)',
                marginBottom: '1rem',
              }}>
                {title}
              </div>
              <p style={{
                fontFamily: 'var(--font-barlow)',
                fontWeight: 300,
                fontSize: '1rem',
                lineHeight: 1.7,
                color: 'var(--muted)',
                margin: 0,
              }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. CONTACT FORM ──────────────────────────────────────────── */}
      <section id="kontakt" style={{
        background: 'var(--off-black)',
        borderTop: '1px solid var(--border)',
        padding: '7rem 2rem',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '0.68rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--lime)',
            marginBottom: '1.5rem',
          }}>
            Kontakt
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(1.6rem, 4vw, 3rem)',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            lineHeight: 1,
            marginBottom: '0.75rem',
            color: 'var(--text)',
          }}>
            Začněme spolupráci
          </h2>
          <p style={{
            fontFamily: 'var(--font-barlow)',
            fontWeight: 300,
            fontSize: '1rem',
            color: 'var(--muted)',
            marginBottom: '3rem',
          }}>
            Vyplňte formulář a ozveme se do 24 hodin.
          </p>

          {submitted ? (
            <div style={{
              padding: '3rem',
              border: '1px solid var(--lime)',
              textAlign: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--lime)',
            }}>
              Díky! Ozveme se do 24 hodin.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="pm-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input required placeholder="Název gymu" value={form.gymName} onChange={handleField('gymName')} className="pm-input" />
                <input required placeholder="Město" value={form.city} onChange={handleField('city')} className="pm-input" />
              </div>
              <div className="pm-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input required placeholder="Jméno" value={form.name} onChange={handleField('name')} className="pm-input" />
                <input required type="email" placeholder="Email" value={form.email} onChange={handleField('email')} className="pm-input" />
              </div>
              <input placeholder="Telefon" value={form.phone} onChange={handleField('phone')} className="pm-input" />

              <div style={{ paddingTop: '0.5rem' }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: '0.75rem',
                }}>
                  Zájem o
                </div>
                <div className="pm-checkboxes" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {CHECK_OPTIONS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`chip${interests[key] ? ' active' : ''}`}
                      onClick={() => toggleInterest(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="iron-btn iron-btn-primary"
                style={{ marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.8rem 2rem', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? 'Odesílám…' : 'Odeslat →'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── 8. FOOTER CTA ────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--lime)',
        padding: '5rem 2rem',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 'clamp(1.8rem, 5vw, 3.5rem)',
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          lineHeight: 1,
          color: '#000',
          marginBottom: '2.5rem',
        }}>
          Váš gym si zaslouží být nahoře.
        </h2>
        <button
          onClick={openAddGym}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '0.9rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#000',
            background: 'transparent',
            border: '2px solid #000',
            padding: '0.8rem 2.5rem',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = 'var(--lime)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000'; }}
        >
          Přidat gym zdarma →
        </button>
      </div>

      <style>{`
        .pm-input {
          width: 100%;
          background: #111;
          border: 1px solid var(--border);
          padding: 0.75rem 1rem;
          color: var(--text);
          font-family: var(--font-barlow);
          font-size: 0.95rem;
          font-weight: 300;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .pm-input::placeholder { color: var(--muted); }
        .pm-input:focus { border-color: var(--lime); }

        @media (max-width: 860px) {
          .pm-pricing-grid { grid-template-columns: 1fr !important; }
          .pm-why-grid { grid-template-columns: 1fr !important; }
          .pm-stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .pm-stat-cell { border-right: none !important; border-bottom: 1px solid var(--border); }
          .pm-form-row { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .pm-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 380px) {
          .pm-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
