'use client';

import { useState, useEffect, useRef } from 'react';

interface Props { gymCount: number; }

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// ── Inline SVG icons - no external assets ──────────────────────────────────
const IconTarget = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="26" height="26" stroke="var(--lime)" strokeWidth="2"/>
    <rect x="9" y="9" width="10" height="10" fill="var(--lime)"/>
  </svg>
);
const IconBars = () => (
  <svg width="26" height="24" viewBox="0 0 26 24" fill="none" aria-hidden="true">
    <rect x="0"  y="10" width="6" height="14" fill="var(--lime)"/>
    <rect x="10" y="4"  width="6" height="20" fill="var(--lime)"/>
    <rect x="20" y="0"  width="6" height="24" fill="var(--lime)"/>
  </svg>
);
const IconDiamond = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="8" y="8" width="12" height="12" stroke="var(--lime)" strokeWidth="2" transform="rotate(45 14 14)"/>
    <rect x="11" y="11" width="6" height="6" fill="var(--lime)" transform="rotate(45 14 14)"/>
  </svg>
);
const IconArrow = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <polyline points="4,22 14,6 24,22" stroke="var(--lime)" strokeWidth="2.5" strokeLinejoin="miter" fill="none"/>
    <rect x="11" y="14" width="6" height="14" fill="var(--lime)"/>
  </svg>
);

// ── Reusable feature list item ─────────────────────────────────────────────
function FeatItem({ children }: { children: React.ReactNode }) {
  return (
    <li style={{
      display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
      fontFamily: 'var(--font-body)', fontSize: '0.93rem',
      color: 'var(--muted)', fontWeight: 300, lineHeight: 1.5,
    }}>
      <span style={{ color: 'var(--lime)', flexShrink: 0, marginTop: '0.05em', fontWeight: 700 }}>+</span>
      {children}
    </li>
  );
}

// ── Metal slot card ────────────────────────────────────────────────────────
interface SlotCardProps {
  tier: 'gold' | 'silver' | 'bronze';
  name: string;
  price: string;
  proPrice: string;
  elitePrice: string;
  features: string[];
  last?: boolean;
}
function SlotCard({ tier, name, price, proPrice, elitePrice, features, last }: SlotCardProps) {
  const colors = {
    gold:   { text: '#FFD700', glow: 'rgba(255,215,0,0.12)',  border: 'rgba(255,215,0,0.4)',  medal: '#FFD700', mGlow: 'rgba(255,215,0,0.7)'  },
    silver: { text: '#C8C8C8', glow: 'rgba(192,192,192,0.09)',border: 'rgba(192,192,192,0.35)',medal: '#C0C0C0', mGlow: 'rgba(192,192,192,0.6)' },
    bronze: { text: '#D4894A', glow: 'rgba(205,127,50,0.09)', border: 'rgba(205,127,50,0.35)',medal: '#CD7F32', mGlow: 'rgba(205,127,50,0.6)'  },
  }[tier];
  return (
    <div
      className={`pm-slot-card pm-slot-card-${tier}${last ? ' pm-slot-last' : ''}`}
      style={{ ['--slot-border' as string]: colors.border, ['--slot-glow' as string]: colors.glow }}
    >
      <div className="pm-slot-top">
        <div
          className="pm-slot-medal"
          aria-hidden="true"
          style={{ background: colors.medal, boxShadow: `0 0 10px ${colors.mGlow}` }}
        />
        <div style={{ flex: 1 }}>
          <div className="pm-slot-name" style={{ color: colors.text }}>{name}</div>
          <div className="pm-slot-price">{price}</div>
          <div className="pm-slot-discounts">
            <span>Pro: {proPrice}</span>
            <span style={{ color: colors.text }}>Elite: {elitePrice}</span>
          </div>
        </div>
      </div>
      <ul className="pm-slot-features">
        {features.map(f => <FeatItem key={f}>{f}</FeatItem>)}
      </ul>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ProMajiteleClient({ gymCount }: Props) {

  // Count-up
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsActive, setStatsActive] = useState(false);
  const [counts, setCounts] = useState({ gym: 0, cities: 0, pct: 0, members: 0, membership: 0 });

  // Scroll reveals
  const pricingRef = useRef<HTMLElement>(null);
  const slotsRef   = useRef<HTMLElement>(null);
  const whyRef     = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const [pricingVis, setPricingVis] = useState(false);
  const [slotsVis,   setSlotsVis]   = useState(false);
  const [whyVis,     setWhyVis]     = useState(false);
  const [contactVis, setContactVis] = useState(false);

  // Form
  const [form, setForm] = useState({ gymName: '', name: '', email: '', phone: '', interest: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  // Stats entry observer
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStatsActive(true); obs.disconnect(); } },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Stats animation
  useEffect(() => {
    if (!statsActive) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCounts({ gym: gymCount, cities: 190, pct: 12, members: 450, membership: 850 });
      return;
    }
    const duration = 1800;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const e = easeOutQuart(t);
      setCounts({
        gym:        Math.floor(e * gymCount),
        cities:     Math.floor(e * 190),
        pct:        Math.floor(e * 12),
        members:    Math.floor(e * 450),
        membership: Math.floor(e * 850),
      });
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [statsActive, gymCount]);

  // Scroll reveals
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setPricingVis(true); setSlotsVis(true); setWhyVis(true); setContactVis(true); return; }
    const pairs: [React.RefObject<HTMLElement | null>, (v: boolean) => void][] = [
      [pricingRef, setPricingVis],
      [slotsRef,   setSlotsVis],
      [whyRef,     setWhyVis],
      [contactRef, setContactVis],
    ];
    const observers = pairs.map(([ref, setter]) => {
      const el = ref.current;
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { setter(true); obs.disconnect(); } },
        { threshold: 0.06 },
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('https://formspree.io/f/xgopqqvz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          'Název gymu': form.gymName,
          'Jméno':      form.name,
          'Email':      form.email,
          'Telefon':    form.phone,
          'Zájem o':    form.interest,
          'Zpráva':     form.message,
          source:       'pro-majitele',
        }),
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const fmtGym = (n: number) =>
    n >= 1000 ? `${Math.floor(n / 1000)}\u00a0${String(n % 1000).padStart(3, '0')}` : String(n);

  return (
    <main>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 1. HERO                                                      */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section className="pm-hero" aria-label="Hlavní sekce">
        <div className="pm-hero-grid" aria-hidden="true" />
        <div className="pm-hero-inner">
          <p className="iron-label pm-anim-1">Pro majitele</p>
          <h1 className="pm-hero-h1 pm-anim-2">
            Vaši zákazníci<br />
            vás hledají.
          </h1>
          <p className="pm-hero-lime pm-anim-3">Najdou vás?</p>
          <p className="pm-hero-body pm-anim-4">
            Přes 450&nbsp;000 aktivních sportovců v&nbsp;ČR. Fitness trh roste 12&nbsp;% ročně.<br className="pm-br-desktop" />
            Buďte tam kde hledají.
          </p>
          <div className="pm-hero-ctas pm-anim-5">
            <a href="/pridat-gym" className="iron-btn iron-btn-primary pm-pulse">
              Přidat gym zdarma
            </a>
            <a href="#cenik" className="iron-btn iron-btn-ghost">
              Zobrazit ceník
            </a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 2. STATS BAR                                                 */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div ref={statsRef} className="pm-stats" role="region" aria-label="Statistiky trhu">
        {[
          { val: `${fmtGym(counts.gym)}+`,             lbl: 'posiloven v ČR'                  },
          { val: `${counts.cities}+`,                   lbl: 'měst pokryto'                    },
          { val: `${counts.pct} %`,                     lbl: 'roční růst fitness trhu'          },
          { val: `${counts.members} 000+`,              lbl: 'aktivních členů'                 },
          { val: `${counts.membership} Kč`,             lbl: 'průměrné měsíční členství'       },
        ].map(({ val, lbl }, i) => (
          <div key={i} className="pm-stat-cell">
            <div className="pm-stat-val">{val}</div>
            <div className="pm-stat-lbl">{lbl}</div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 3. PRICING                                                   */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section
        id="cenik"
        ref={pricingRef}
        className={`pm-section pm-reveal${pricingVis ? ' is-visible' : ''}`}
        aria-label="Ceník"
      >
        <div className="pm-inner pm-wide">
          <p className="iron-label">Ceník</p>
          <h2 className="pm-h2" style={{ marginTop: '1.5rem' }}>Vyberte svůj základ</h2>
          <p className="pm-sub" style={{ marginTop: '1rem' }}>
            Profil, viditelnost, data. Plaťte jednou měsíčně, cancellujte kdykoliv.
          </p>

          <div className="pm-plans">

            {/* FREE */}
            <article className="pm-plan" aria-label="Free plan">
              <header className="pm-plan-head">
                <div className="pm-plan-tier">Free</div>
                <div className="pm-price-row">
                  <span className="pm-price">0 Kč</span>
                  <span className="pm-per">/měs</span>
                </div>
              </header>
              <ul className="pm-feat-list">
                {['Základní profil s adresou','Zobrazení na mapě','Otevírací doba','Kontaktní údaje']
                  .map(f => <FeatItem key={f}>{f}</FeatItem>)}
              </ul>
              <a href="/pridat-gym" className="pm-plan-btn pm-plan-btn-outline">
                Přidat gym zdarma
              </a>
            </article>

            {/* PRO - featured */}
            <article className="pm-plan pm-plan-pro" aria-label="Pro plan">
              <div className="pm-plan-badge pm-badge-lime">Nejpopulárnější</div>
              <header className="pm-plan-head">
                <div className="pm-plan-tier" style={{ color: 'var(--lime)' }}>Pro</div>
                <span className="pm-pilot-tag">Pilot cena</span>
                <div className="pm-price-row" style={{ marginTop: '0.5rem' }}>
                  <span className="pm-price-old">599 Kč</span>
                  <span className="pm-price">499 Kč</span>
                  <span className="pm-per">/měs</span>
                </div>
                <div className="pm-from">od</div>
              </header>
              <ul className="pm-feat-list">
                {[
                  'Vše z Free',
                  'Prioritní pozice v kategorii vašeho města',
                  'Vlastní fotogalerie',
                  'Statistiky zobrazení profilu',
                  'Ověřený badge - zákazníci věří více',
                  'Přímý odkaz na web',
                  '15 % sleva na reklamní sloty',
                ].map(f => <FeatItem key={f}>{f}</FeatItem>)}
              </ul>
              <a href="#kontakt" className="pm-plan-btn pm-plan-btn-primary pm-pulse">
                Začít 14 dní zdarma
              </a>
            </article>

            {/* ELITE */}
            <article className="pm-plan pm-plan-elite" aria-label="Elite plan">
              <div className="pm-plan-badge pm-badge-gold">Nejvyšší hodnota</div>
              <header className="pm-plan-head">
                <div className="pm-plan-tier" style={{ color: '#D4944A' }}>Elite</div>
                <span className="pm-pilot-tag" style={{ borderColor: '#D4944A', color: '#D4944A' }}>Pilot cena</span>
                <div className="pm-price-row" style={{ marginTop: '0.5rem' }}>
                  <span className="pm-price-old">1 590 Kč</span>
                  <span className="pm-price">1 290 Kč</span>
                  <span className="pm-per">/měs</span>
                </div>
                <div className="pm-from">od</div>
              </header>
              <ul className="pm-feat-list">
                {[
                  'Vše z Pro',
                  'Pokročilé statistiky a konverze',
                  'Featured badge - maximální důvěryhodnost',
                  '25 % sleva na reklamní sloty',
                  '3 dny Gold Město slot zdarma / měsíc (hodnota 1 499 Kč)',
                  'Dedikovaný account manager',
                  'Měsíční report návštěvnosti',
                ].map(f => <FeatItem key={f}>{f}</FeatItem>)}
              </ul>
              <a href="#kontakt" className="pm-plan-btn pm-plan-btn-gold">
                Kontaktovat nás
              </a>
            </article>

          </div>

          <p className="pm-plans-note">
            Reklamní sloty jsou dostupné pro všechny plány.
            Pro a Elite získávají automatickou slevu 15 % resp. 25 %.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 4. REKLAMNI SLOTY                                            */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section
        ref={slotsRef}
        className={`pm-section pm-section-alt pm-reveal${slotsVis ? ' is-visible' : ''}`}
        aria-label="Reklamní sloty"
      >
        <div className="pm-inner pm-wide">
          <h2 className="pm-display-xl">
            Buďte<br />
            <span style={{ color: 'var(--lime)' }}>první.</span>
          </h2>
          <p className="pm-accent-sub">Pouze 3 dostupné pozice na kategorii. Kdo dříve přijde.</p>
          <p className="pm-sub" style={{ marginBottom: '4rem', maxWidth: 640 }}>
            Exkluzivní zlaté, stříbrné a bronzové pozice ve vyhledávání - národní nebo městské.
            Jednou obsazeno, konkurence čeká.
          </p>

          <div className="pm-slots-cols">

            {/* NATIONAL */}
            <div>
              <div className="pm-col-hdr">
                <span className="iron-label">Národní sloty</span>
                <span className="pm-duration">7 dní</span>
              </div>
              <p className="pm-col-desc">Top 3 v celé ČR - viditelnost napříč všemi městy</p>
              <div className="pm-slots-stack">
                <SlotCard
                  tier="gold" name="Gold - Národní" price="7 999 Kč"
                  proPrice="6 799 Kč" elitePrice="5 999 Kč"
                  features={[
                    'Pozice #1 ve vyhledávání vaší kategorie v celé ČR',
                    'Gold badge na profilu po dobu kampaně',
                    'Zmínění v měsíčním newsletteru Iron',
                  ]}
                />
                <SlotCard
                  tier="silver" name="Silver - Národní" price="5 999 Kč"
                  proPrice="5 099 Kč" elitePrice="4 499 Kč"
                  features={[
                    'Pozice #2 ve vyhledávání vaší kategorie v celé ČR',
                    'Silver badge na profilu po dobu kampaně',
                  ]}
                />
                <SlotCard
                  tier="bronze" name="Bronze - Národní" price="4 999 Kč"
                  proPrice="4 249 Kč" elitePrice="3 749 Kč"
                  features={[
                    'Pozice #3 ve vyhledávání vaší kategorie v celé ČR',
                    'Bronze badge na profilu po dobu kampaně',
                  ]}
                  last
                />
              </div>
            </div>

            {/* CITY */}
            <div>
              <div className="pm-col-hdr">
                <span className="iron-label">Městské sloty</span>
                <span className="pm-duration">7 dní</span>
              </div>
              <p className="pm-col-desc">Top 3 ve vašem městě - dominance lokálních výsledků</p>
              <div className="pm-slots-stack">
                <SlotCard
                  tier="gold" name="Gold Město" price="2 999 Kč"
                  proPrice="2 549 Kč" elitePrice="2 249 Kč"
                  features={[
                    'Pozice #1 ve vašem městě ve vaší kategorii',
                    'Gold badge na profilu',
                  ]}
                />
                <SlotCard
                  tier="silver" name="Silver Město" price="1 999 Kč"
                  proPrice="1 699 Kč" elitePrice="1 499 Kč"
                  features={['Pozice #2 ve vašem městě ve vaší kategorii']}
                />
                <SlotCard
                  tier="bronze" name="Bronze Město" price="1 499 Kč"
                  proPrice="1 274 Kč" elitePrice="1 124 Kč"
                  features={['Pozice #3 ve vašem městě ve vaší kategorii']}
                  last
                />
              </div>
            </div>

          </div>

          <p className="pm-slots-note">
            Ceny jsou uvedeny bez DPH. Sloty jsou exkluzivní - po obsazení není možné zakoupit
            stejnou pozici do uplynutí kampaně.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 5. PROC IRONMAP                                              */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section
        ref={whyRef}
        className={`pm-section pm-reveal${whyVis ? ' is-visible' : ''}`}
        aria-label="Proč IRONMAP"
      >
        <div className="pm-inner pm-wide">
          <p className="iron-label">Čísla jsou jasná</p>
          <h2 className="pm-h2" style={{ marginTop: '1.5rem', marginBottom: '3rem' }}>Proč ironmap</h2>
          <div className="pm-why-grid">
            {[
              {
                Icon: IconTarget,
                title: 'Zákazníci v momentu rozhodnutí',
                body:  'Oslovujeme lidi kteří aktivně hledají posilovnu, ne náhodné scrollery.',
              },
              {
                Icon: IconBars,
                title: 'Až 10 % zákazníků chce platit online',
                body:  'Připravujeme online booking. Vaše fitko bude připraveno jako první.',
              },
              {
                Icon: IconDiamond,
                title: 'Víte co funguje',
                body:  'Statistiky prohlédnutí, kliknutí, konverzí. Data která dříve měly jen velké řetězce.',
              },
              {
                Icon: IconArrow,
                title: 'Rosteme spolu',
                body:  'Fitness trh v ČR roste 12 % ročně. Jsme tu abychom rostli s vámi.',
              },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="pm-why-card">
                <div className="pm-why-icon"><Icon /></div>
                <h3 className="pm-why-title">{title}</h3>
                <p className="pm-why-body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 6. CONTACT                                                   */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section
        id="kontakt"
        ref={contactRef}
        className={`pm-section pm-section-alt pm-reveal${contactVis ? ' is-visible' : ''}`}
        aria-label="Kontaktní formulář"
      >
        <div className="pm-inner pm-narrow">
          <p className="iron-label">Spolupráce</p>
          <h2 className="pm-h2" style={{ marginTop: '1.5rem' }}>Začneme spolupráci</h2>
          <p className="pm-sub" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
            Vyplňte formulář a ozveme se do 24 hodin.
          </p>

          {submitted ? (
            <div className="pm-success" role="alert">
              <div className="pm-success-icon" aria-hidden="true" />
              <div className="pm-success-title">Zpráva odeslána</div>
              <p className="pm-success-body">Ozveme se do 24 hodin.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              <div className="pm-form-2">
                <div className="pm-field">
                  <label htmlFor="pm-gymName" className="pm-label">Název gymu</label>
                  <input
                    id="pm-gymName" required type="text"
                    className="pm-input" placeholder="Např. Fitness Center Praha"
                    value={form.gymName}
                    onChange={e => setForm(f => ({ ...f, gymName: e.target.value }))}
                    aria-required="true"
                  />
                </div>
                <div className="pm-field">
                  <label htmlFor="pm-name" className="pm-label">Jméno</label>
                  <input
                    id="pm-name" required type="text"
                    className="pm-input" placeholder="Vaše jméno"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    aria-required="true"
                  />
                </div>
              </div>

              <div className="pm-form-2">
                <div className="pm-field">
                  <label htmlFor="pm-email" className="pm-label">Email</label>
                  <input
                    id="pm-email" required type="email"
                    className="pm-input" placeholder="vas@email.cz"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    aria-required="true"
                  />
                </div>
                <div className="pm-field">
                  <label htmlFor="pm-phone" className="pm-label">
                    Telefon <span className="pm-optional">(nepovinné)</span>
                  </label>
                  <input
                    id="pm-phone" type="tel"
                    className="pm-input" placeholder="+420 ..."
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="pm-field">
                <label htmlFor="pm-interest" className="pm-label">Zájem o</label>
                <div className="pm-select-wrap">
                  <select
                    id="pm-interest" required
                    className="pm-select"
                    value={form.interest}
                    onChange={e => setForm(f => ({ ...f, interest: e.target.value }))}
                    aria-required="true"
                  >
                    <option value="" disabled>Vyberte možnost</option>
                    <option value="Free listing">Free listing</option>
                    <option value="Pro">Pro</option>
                    <option value="Elite">Elite</option>
                    <option value="Gold národní">Gold národní</option>
                    <option value="Silver národní">Silver národní</option>
                    <option value="Bronze národní">Bronze národní</option>
                    <option value="Gold město">Gold město</option>
                    <option value="Silver město">Silver město</option>
                    <option value="Bronze město">Bronze město</option>
                    <option value="Chci se poradit">Chci se poradit</option>
                  </select>
                  <span className="pm-select-arr" aria-hidden="true" />
                </div>
              </div>

              <div className="pm-field">
                <label htmlFor="pm-message" className="pm-label">
                  Zpráva <span className="pm-optional">(nepovinné)</span>
                </label>
                <textarea
                  id="pm-message"
                  className="pm-input pm-textarea"
                  placeholder="Napište nám cokoliv..."
                  rows={4}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="pm-submit pm-pulse"
                aria-label="Odeslat formulář"
              >
                {submitting ? 'Odesílám...' : 'Odeslat'}
              </button>

            </form>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* STYLES                                                       */}
      {/* ════════════════════════════════════════════════════════════ */}
      <style>{`

        /* ── Hero ───────────────────────────────────────────────── */
        .pm-hero {
          position: relative;
          min-height: calc(100vh - 64px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          background: var(--black);
        }
        .pm-hero-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(200,255,0,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,255,0,0.035) 1px, transparent 1px);
          background-size: 80px 80px;
          pointer-events: none;
        }
        .pm-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 8rem 3rem 6rem;
        }
        .pm-hero-h1 {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: clamp(3.2rem, 10vw, 9rem);
          text-transform: uppercase;
          letter-spacing: -0.025em;
          line-height: 0.88;
          color: var(--text);
          margin: 1.5rem 0 0;
        }
        .pm-hero-lime {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: clamp(3.2rem, 10vw, 9rem);
          text-transform: uppercase;
          letter-spacing: -0.025em;
          line-height: 0.88;
          color: var(--lime);
          margin: 0 0 2.5rem;
        }
        .pm-hero-body {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: clamp(0.95rem, 2vw, 1.15rem);
          color: var(--muted);
          line-height: 1.75;
          max-width: 500px;
          margin: 0 0 3rem;
        }
        .pm-hero-ctas {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .pm-br-desktop { display: block; }

        /* Load animations */
        .pm-anim-1,.pm-anim-2,.pm-anim-3,.pm-anim-4,.pm-anim-5 {
          animation: pmFadeUp 0.7s ease both;
        }
        .pm-anim-1 { animation-delay: 0.05s; }
        .pm-anim-2 { animation-delay: 0.18s; }
        .pm-anim-3 { animation-delay: 0.32s; }
        .pm-anim-4 { animation-delay: 0.44s; }
        .pm-anim-5 { animation-delay: 0.58s; }
        @keyframes pmFadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: none; }
        }

        /* Neon pulse */
        .pm-pulse {
          animation: pmNeon 3s ease-in-out infinite;
        }
        @keyframes pmNeon {
          0%,100% { box-shadow: 0 0 6px rgba(200,255,0,0.35), 0 0 18px rgba(200,255,0,0.12); }
          50%      { box-shadow: 0 0 14px rgba(200,255,0,0.65), 0 0 40px rgba(200,255,0,0.25); }
        }

        /* ── Stats bar ─────────────────────────────────────────── */
        .pm-stats {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          background: var(--border);
          gap: 1px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .pm-stat-cell {
          background: var(--off-black);
          padding: 2.5rem 1.5rem;
          text-align: center;
        }
        .pm-stat-val {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: clamp(1.7rem, 3.5vw, 2.9rem);
          color: var(--lime);
          line-height: 1;
          letter-spacing: 0.02em;
          margin-bottom: 0.5rem;
        }
        .pm-stat-lbl {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.62rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--muted);
        }

        /* ── Section shell ─────────────────────────────────────── */
        .pm-section {
          padding: 8rem 3rem;
          background: var(--black);
          border-top: 1px solid var(--border);
        }
        .pm-section-alt { background: var(--off-black); }
        .pm-inner { margin: 0 auto; width: 100%; }
        .pm-wide   { max-width: 1200px; }
        .pm-narrow { max-width: 680px; }

        .pm-h2 {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: clamp(2.2rem, 5.5vw, 5rem);
          text-transform: uppercase;
          letter-spacing: -0.02em;
          line-height: 0.88;
          color: var(--text);
        }
        .pm-sub {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: 1.05rem;
          color: var(--muted);
          line-height: 1.7;
          max-width: 540px;
        }
        .pm-accent-sub {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(1rem, 2.5vw, 1.55rem);
          color: var(--lime);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin: 0.75rem 0 1.5rem;
        }

        /* Scroll reveal */
        .pm-reveal {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.75s ease, transform 0.75s ease;
        }
        .pm-reveal.is-visible {
          opacity: 1;
          transform: none;
        }

        /* ── Pricing ────────────────────────────────────────────── */
        .pm-plans {
          display: grid;
          grid-template-columns: 1fr 1.07fr 1fr;
          margin-top: 3.5rem;
          background: var(--border);
          gap: 1px;
          border: 1px solid var(--border);
        }
        .pm-plan {
          background: var(--off-black);
          padding: 2.5rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 0;
          position: relative;
          transition: transform 0.2s ease;
        }
        .pm-plan:hover { transform: translateY(-5px); }
        .pm-plan-pro {
          background: #0d0d0d;
          outline: 2px solid var(--lime);
          outline-offset: -1px;
          box-shadow: 0 0 50px rgba(200,255,0,0.07), inset 0 0 50px rgba(200,255,0,0.015);
          z-index: 1;
        }
        .pm-plan-badge {
          position: absolute;
          top: 0;
          right: 1.75rem;
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 0.56rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          padding: 0.28rem 0.7rem;
          white-space: nowrap;
        }
        .pm-badge-lime { background: var(--lime); color: #000; }
        .pm-badge-gold { background: #b8860b; color: #fff; }
        .pm-plan-head { margin-bottom: 1.5rem; padding-top: 0.5rem; }
        .pm-plan-tier {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 0.75rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 0.75rem;
        }
        .pm-pilot-tag {
          display: inline-block;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.53rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--lime);
          border: 1px solid var(--lime);
          padding: 0.15rem 0.5rem;
        }
        .pm-price-row {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .pm-price-old {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.1rem;
          color: var(--muted);
          text-decoration: line-through;
          opacity: 0.55;
        }
        .pm-price {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: clamp(1.9rem, 3.5vw, 2.8rem);
          letter-spacing: 0.02em;
          color: var(--text);
          line-height: 1;
        }
        .pm-per {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--muted);
        }
        .pm-from {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.6rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
          margin-top: 0.3rem;
        }
        .pm-feat-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          flex: 1;
        }
        .pm-plan-btn {
          display: block;
          text-align: center;
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 0.76rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.85rem 1.5rem;
          text-decoration: none;
          transition: all 0.15s;
          margin-top: auto;
        }
        .pm-plan-btn-primary {
          background: var(--lime);
          color: #000;
          border: none;
        }
        .pm-plan-btn-primary:hover { background: #d8ff20; transform: translateY(-2px); }
        .pm-plan-btn-outline {
          border: 1px solid var(--border);
          color: var(--text);
          background: transparent;
        }
        .pm-plan-btn-outline:hover { border-color: var(--lime); color: var(--lime); }
        .pm-plan-btn-gold {
          border: 1px solid #b8860b;
          color: #D4944A;
          background: transparent;
        }
        .pm-plan-btn-gold:hover { background: #b8860b; color: #000; }
        .pm-plans-note {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: 0.82rem;
          color: var(--muted);
          margin-top: 2rem;
          line-height: 1.6;
          opacity: 0.8;
        }

        /* ── Slots ─────────────────────────────────────────────── */
        .pm-display-xl {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: clamp(4rem, 13vw, 11rem);
          text-transform: uppercase;
          letter-spacing: -0.03em;
          line-height: 0.85;
          color: var(--text);
          margin-bottom: 1rem;
        }
        .pm-slots-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
        }
        .pm-col-hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .pm-col-desc {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: 0.87rem;
          color: var(--muted);
          margin: 0 0 1.5rem;
          line-height: 1.5;
        }
        .pm-duration {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.58rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--muted);
          border: 1px solid var(--border);
          padding: 0.2rem 0.5rem;
        }
        .pm-slots-stack { display: flex; flex-direction: column; }
        .pm-slot-card {
          padding: 1.5rem;
          border: 1px solid var(--slot-border, var(--border));
          border-bottom: none;
          background: var(--black);
          transition: box-shadow 0.25s;
          box-shadow: 0 0 20px var(--slot-glow, transparent);
        }
        .pm-slot-last { border-bottom: 1px solid var(--slot-border, var(--border)) !important; }
        .pm-slot-card:hover {
          box-shadow: 0 0 35px var(--slot-glow, transparent);
        }
        .pm-slot-top {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.9rem;
        }
        .pm-slot-medal {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          margin-top: 4px;
          transform: rotate(45deg);
        }
        .pm-slot-name {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 0.75rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 0.3rem;
        }
        .pm-slot-price {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 1.45rem;
          color: var(--text);
          letter-spacing: 0.02em;
          line-height: 1;
          margin-bottom: 0.3rem;
        }
        .pm-slot-discounts {
          display: flex;
          gap: 1rem;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.58rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .pm-slot-features {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .pm-slots-note {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: 0.8rem;
          color: var(--muted);
          margin-top: 2.5rem;
          line-height: 1.6;
          opacity: 0.65;
        }

        /* ── Why grid ──────────────────────────────────────────── */
        .pm-why-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          background: var(--border);
          gap: 1px;
        }
        .pm-why-card {
          background: var(--off-black);
          padding: 3rem;
          transition: background 0.2s;
        }
        .pm-why-card:hover { background: #141414; }
        .pm-why-icon { margin-bottom: 1.5rem; }
        .pm-why-title {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 0.8rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--lime);
          margin: 0 0 0.85rem;
          line-height: 1.3;
        }
        .pm-why-body {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: 0.98rem;
          color: var(--muted);
          line-height: 1.7;
          margin: 0;
        }

        /* ── Form ──────────────────────────────────────────────── */
        .pm-form-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .pm-field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .pm-label {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.62rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .pm-optional {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: 0.65rem;
          letter-spacing: 0;
          text-transform: none;
          color: var(--border-mid);
        }
        .pm-input {
          width: 100%;
          background: #111;
          border: 1px solid var(--border);
          color: var(--text);
          font-family: var(--font-body);
          font-size: 0.92rem;
          font-weight: 300;
          padding: 0.85rem 1rem;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .pm-input:focus { border-color: var(--lime); }
        .pm-input::placeholder { color: var(--muted); }
        .pm-textarea { resize: vertical; min-height: 110px; }
        .pm-select-wrap { position: relative; }
        .pm-select {
          width: 100%;
          background: #111;
          border: 1px solid var(--border);
          color: var(--text);
          font-family: var(--font-body);
          font-size: 0.92rem;
          font-weight: 300;
          padding: 0.85rem 2.5rem 0.85rem 1rem;
          outline: none;
          appearance: none;
          cursor: pointer;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .pm-select:focus { border-color: var(--lime); }
        .pm-select-arr {
          position: absolute;
          right: 0.9rem;
          top: 50%;
          width: 8px;
          height: 8px;
          border-right: 2px solid var(--muted);
          border-bottom: 2px solid var(--muted);
          transform: translateY(-65%) rotate(45deg);
          pointer-events: none;
        }
        .pm-submit {
          display: block;
          width: 100%;
          background: var(--lime);
          color: #000;
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 0.9rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          border: none;
          padding: 1.05rem 2rem;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
        }
        .pm-submit:hover:not(:disabled) { background: #d8ff20; transform: translateY(-2px); }
        .pm-submit:disabled { opacity: 0.45; cursor: not-allowed; animation: none; }

        /* Success */
        .pm-success {
          border: 1px solid var(--lime);
          padding: 3.5rem 2rem;
          text-align: center;
          background: rgba(200,255,0,0.025);
        }
        .pm-success-icon {
          width: 30px;
          height: 30px;
          border: 2px solid var(--lime);
          margin: 0 auto 1.5rem;
          transform: rotate(45deg);
          box-shadow: 0 0 20px rgba(200,255,0,0.25);
        }
        .pm-success-title {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 1.25rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--lime);
          margin-bottom: 0.5rem;
        }
        .pm-success-body {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: 0.95rem;
          color: var(--muted);
          margin: 0;
        }

        /* ── Responsive ────────────────────────────────────────── */
        @media (max-width: 1024px) {
          .pm-slots-cols { grid-template-columns: 1fr; gap: 3.5rem; }
        }
        @media (max-width: 860px) {
          .pm-plans { grid-template-columns: 1fr; }
          .pm-plan-pro { outline-offset: 0; }
          .pm-why-grid { grid-template-columns: 1fr; }
          .pm-stats { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 600px) {
          .pm-hero-inner { padding: 5rem 1.25rem 4rem; }
          .pm-section { padding: 5rem 1.25rem; }
          .pm-stats { grid-template-columns: repeat(2, 1fr); }
          .pm-form-2 { grid-template-columns: 1fr; }
          .pm-why-card { padding: 2rem 1.5rem; }
          .pm-br-desktop { display: none; }
        }
        @media (max-width: 380px) {
          .pm-stats { grid-template-columns: 1fr; }
        }

        /* ── Reduced motion ────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .pm-anim-1,.pm-anim-2,.pm-anim-3,.pm-anim-4,.pm-anim-5 { animation: none !important; }
          .pm-pulse { animation: none !important; }
          .pm-reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
          .pm-plan,.pm-why-card,.pm-plan-btn,.pm-submit,.pm-slot-card { transition: none !important; }
        }

      `}</style>
    </main>
  );
}
