'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ── Icons (rect/line/polyline only - safe under global border-radius: 0 reset) ──
const IconCard = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="1" y="5" width="26" height="18" stroke="var(--lime)" strokeWidth="2"/>
    <rect x="5" y="9" width="6" height="6" fill="var(--lime)"/>
    <rect x="14" y="10" width="8" height="2" fill="var(--muted)"/>
    <rect x="14" y="14" width="5" height="2" fill="var(--muted)"/>
  </svg>
);
const IconLink = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="1" y="9" width="10" height="10" stroke="var(--lime)" strokeWidth="2"/>
    <rect x="17" y="9" width="10" height="10" stroke="var(--lime)" strokeWidth="2"/>
    <line x1="11" y1="14" x2="17" y2="14" stroke="var(--lime)" strokeWidth="2"/>
  </svg>
);
const IconEnvelope = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="1" y="5" width="26" height="18" stroke="var(--lime)" strokeWidth="2"/>
    <polyline points="1,5 14,17 27,5" stroke="var(--lime)" strokeWidth="2" fill="none"/>
  </svg>
);
const IconSearch = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="18" height="18" stroke="var(--lime)" strokeWidth="2"/>
    <rect x="7" y="7" width="6" height="6" fill="var(--lime)"/>
    <line x1="19" y1="19" x2="27" y2="27" stroke="var(--lime)" strokeWidth="2.5"/>
  </svg>
);
const IconFilter = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="0" y="4" width="28" height="2" fill="var(--muted)"/>
    <rect x="0" y="13" width="28" height="2" fill="var(--muted)"/>
    <rect x="0" y="22" width="28" height="2" fill="var(--muted)"/>
    <rect x="18" y="1" width="4" height="8" fill="var(--lime)"/>
    <rect x="8" y="10" width="4" height="8" fill="var(--lime)"/>
    <rect x="20" y="19" width="4" height="8" fill="var(--lime)"/>
  </svg>
);
const IconCal = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="1" y="5" width="26" height="22" stroke="var(--border-mid)" strokeWidth="2"/>
    <rect x="1" y="5" width="26" height="7" fill="var(--border-mid)" opacity="0.4"/>
    <rect x="6" y="1" width="3" height="8" fill="var(--muted)"/>
    <rect x="19" y="1" width="3" height="8" fill="var(--muted)"/>
  </svg>
);

// ── Feature card data ──────────────────────────────────────────────────────
type Feature = { icon: React.ReactNode; title: string; body: string; dim?: true };

const FEATURES: Feature[] = [
  {
    icon: <IconCard />,
    title: 'Vlastní profil trenéra',
    body: 'Fotka, bio, specializace, certifikace. Vše co klient potřebuje vědět, než tě kontaktuje.',
  },
  {
    icon: <IconLink />,
    title: 'Propojení s gymy',
    body: 'Ukaž kde tréninuješ. Klienti tě najdou přímo u jejich oblíbeného gymu.',
  },
  {
    icon: <IconEnvelope />,
    title: 'Poptávky přímo od klientů',
    body: 'Kontaktní formulář na tvém profilu. Žádný prostředník, žádná provize.',
  },
  {
    icon: <IconSearch />,
    title: 'Viditelnost při hledání',
    body: 'Zobrazíš se když někdo klikne "Najít trenéra" - v momentě rozhodnutí.',
  },
  {
    icon: <IconFilter />,
    title: 'Specializace a filtry',
    body: 'Silový trénink, CrossFit, jóga, box, výživa, rehabilitace - klient najde přesně tebe.',
  },
  {
    icon: <IconCal />,
    title: 'Brzy: online rezervace',
    body: 'Přímá rezervace a platba bez externích nástrojů. Jako první se dozvíš kdy spustíme.',
    dim: true,
  },
];

// ── Form state ─────────────────────────────────────────────────────────────
interface FormState {
  name: string;
  email: string;
  phone: string;
  spec: string;
  city: string;
  message: string;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function TreneriClient() {
  // Scroll reveal refs
  const featRef = useRef<HTMLElement>(null);
  const vipRef  = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const [featVis, setFeatVis] = useState(false);
  const [vipVis,  setVipVis]  = useState(false);
  const [formVis, setFormVis] = useState(false);

  // Form
  const [form, setForm]           = useState<FormState>({ name: '', email: '', phone: '', spec: '', city: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  // Scroll reveal observers
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setFeatVis(true); setVipVis(true); setFormVis(true); return; }

    const pairs: [React.RefObject<HTMLElement | null>, React.Dispatch<React.SetStateAction<boolean>>][] = [
      [featRef, setFeatVis],
      [vipRef,  setVipVis],
      [formRef, setFormVis],
    ];
    const observers = pairs.map(([ref, setter]) => {
      const el = ref.current;
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { setter(true); obs.disconnect(); } },
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
          'Jméno':        form.name,
          'Email':        form.email,
          'Telefon':      form.phone,
          'Specializace': form.spec,
          'Město':        form.city,
          'Zpráva':       form.message,
          source:         'treneri',
        }),
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 1. HERO                                                      */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section className="tr-hero" aria-label="Hlavní sekce">
        <div className="tr-hero-grid" aria-hidden="true" />
        <div className="tr-hero-inner">
          <p className="iron-label tr-anim-1">Pro trenéry</p>
          <h1 className="tr-hero-h1 tr-anim-2">Získej klienty.</h1>
          <p className="tr-hero-lime tr-anim-3">Kde tě hledají.</p>
          <p className="tr-hero-body tr-anim-4">
            Tisíce lidí každý měsíc hledá na IRONMAP posilovnu. Nově hledají i tebe.
            Vytvoř si profil trenéra a buď tam v momentě, kdy se klient rozhoduje.
          </p>
          <div className="tr-anim-5">
            <a href="#registrace" className="iron-btn iron-btn-primary tr-pulse">
              Chci být mezi prvními
            </a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 2. CO DOSTANES                                               */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section
        ref={featRef}
        className={`tr-reveal tr-section${featVis ? ' is-visible' : ''}`}
        aria-label="Co dostaneš"
      >
        <div className="tr-inner">
          <p className="iron-label">Pro trenéry</p>
          <h2 className="tr-h2" style={{ marginTop: '1.5rem' }}>
            Tvůj profil.<br />Tvoji klienti.
          </h2>
          <p className="tr-sub" style={{ marginTop: '1rem' }}>
            Vše co potřebuješ pro to, aby tě noví klienti našli - bez provize, bez zbytečných mezičlánků.
          </p>

          <div className="tr-feat-grid">
            {FEATURES.map((feat, i) => (
              <article
                key={feat.title}
                className={`tr-feat-card${feat.dim ? ' tr-feat-dim' : ''}`}
                style={{
                  opacity:          featVis ? 1 : 0,
                  transform:        featVis ? 'none' : 'translateY(20px)',
                  transition:       'opacity 0.5s ease, transform 0.5s ease',
                  transitionDelay:  featVis ? `${0.05 + i * 0.07}s` : '0s',
                }}
                aria-label={feat.title}
              >
                <div className="tr-feat-icon">{feat.icon}</div>
                <div className="tr-feat-title">{feat.title}</div>
                <p className="tr-feat-body">{feat.body}</p>
                {feat.dim && <span className="tr-feat-soon">Brzy</span>}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 3. PRVNICH 10                                                */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section
        ref={vipRef}
        className={`tr-reveal tr-vip-section${vipVis ? ' is-visible' : ''}`}
        aria-label="VIP pre-registrace"
      >
        <div className="tr-inner">
          <div className="tr-vip-grid">

            {/* Counter */}
            <div className="tr-vip-counter" aria-label="Dostupná místa: 10">
              <div className="tr-vip-box">
                <span className="tr-vip-num" aria-hidden="true">10</span>
              </div>
              <div className="tr-vip-box-label">míst celkem</div>
            </div>

            {/* Text */}
            <div className="tr-vip-text">
              <p className="iron-label" style={{ marginBottom: '1.5rem' }}>Exkluzivní nabídka</p>
              <h2 className="tr-h2">Prvních 10 trenérů</h2>
              <p className="tr-vip-lime">Získá VIP pozici zdarma na 7 dní.</p>
              <ul className="tr-vip-list" aria-label="Výhody VIP pozice">
                {[
                  'Top pozice ve výsledcích hledání trenérů na celém IRONMAPu',
                  'Featured badge na profilu po celou dobu kampaně',
                  'Kdo dřív přijde - ten dřív mele',
                ].map(item => (
                  <li key={item}>
                    <span className="tr-vip-bullet" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="tr-vip-note">
                Pre-registrace nezavazuje. Ozveme se ti osobně jakmile spustíme.
              </p>
              <a
                href="#registrace"
                className="iron-btn iron-btn-ghost"
                style={{ marginTop: '2rem', display: 'inline-flex' }}
              >
                Zaregistrovat se
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 4. PRE-REGISTRATION FORM                                     */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section
        id="registrace"
        ref={formRef}
        className={`tr-reveal tr-section${formVis ? ' is-visible' : ''}`}
        aria-label="Registrační formulář"
        style={{ scrollMarginTop: '80px' }}
      >
        <div className="tr-inner" style={{ maxWidth: 760 }}>
          <p className="iron-label">Pre-registrace</p>
          <h2 className="tr-h2" style={{ marginTop: '1.5rem' }}>
            Zaregistruj se jako první
          </h2>
          <p className="tr-sub" style={{ marginTop: '1rem' }}>
            Spouštíme brzy. Dej nám vědět kdo jsi.
          </p>

          <div className="tr-form-card">
            {submitted ? (
              <div className="tr-success" role="status" aria-live="polite">
                <div className="tr-success-icon" aria-hidden="true">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <rect x="1" y="1" width="34" height="34" stroke="var(--lime)" strokeWidth="2"/>
                    <polyline points="9,18 15,25 27,11" stroke="var(--lime)" strokeWidth="2.5" fill="none"/>
                  </svg>
                </div>
                <p className="tr-success-msg">Perfektní. Jsi na seznamu.</p>
                <p className="tr-success-sub">Ozveme se ti osobně.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>

                <div className="tr-form-row">
                  <div className="tr-field">
                    <label htmlFor="tr-name" className="tr-label">Jméno a příjmení</label>
                    <input
                      id="tr-name" type="text" required
                      className="iron-input"
                      placeholder="Jan Novák"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      aria-required="true"
                    />
                  </div>
                  <div className="tr-field">
                    <label htmlFor="tr-email" className="tr-label">Email</label>
                    <input
                      id="tr-email" type="email" required
                      className="iron-input"
                      placeholder="ty@email.cz"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      aria-required="true"
                    />
                  </div>
                </div>

                <div className="tr-form-row">
                  <div className="tr-field">
                    <label htmlFor="tr-phone" className="tr-label">
                      Telefon{' '}
                      <span className="tr-optional">(nepovinné)</span>
                    </label>
                    <input
                      id="tr-phone" type="tel"
                      className="iron-input"
                      placeholder="+420 ..."
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="tr-field">
                    <label htmlFor="tr-city" className="tr-label">Město kde působíš</label>
                    <input
                      id="tr-city" type="text" required
                      className="iron-input"
                      placeholder="Praha, Brno, ..."
                      value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      aria-required="true"
                    />
                  </div>
                </div>

                <div className="tr-field" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="tr-spec" className="tr-label">Specializace</label>
                  <div className="tr-select-wrap">
                    <select
                      id="tr-spec" required
                      className="iron-select"
                      value={form.spec}
                      onChange={e => setForm(f => ({ ...f, spec: e.target.value }))}
                      aria-required="true"
                    >
                      <option value="" disabled>Vyber specializaci</option>
                      <option value="Osobní trenér (obecný)">Osobní trenér (obecný)</option>
                      <option value="Silový trénink / Powerlifting">Silový trénink / Powerlifting</option>
                      <option value="CrossFit">CrossFit</option>
                      <option value="Bojové sporty / Box">Bojové sporty / Box</option>
                      <option value="Jóga / Pilates">Jóga / Pilates</option>
                      <option value="Výživa a životní styl">Výživa a životní styl</option>
                      <option value="Rehabilitace a fyzioterapie">Rehabilitace a fyzioterapie</option>
                      <option value="Jiné">Jiné</option>
                    </select>
                    <span className="tr-select-arr" aria-hidden="true" />
                  </div>
                </div>

                <div className="tr-field" style={{ marginBottom: '0.5rem' }}>
                  <label htmlFor="tr-message" className="tr-label">
                    Řekni nám něco o sobě{' '}
                    <span className="tr-optional">(nepovinné)</span>
                  </label>
                  <textarea
                    id="tr-message"
                    className="iron-input"
                    placeholder="Kolik let zkušeností, s kým nejraději pracuješ, co tě odlišuje..."
                    rows={4}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    style={{ resize: 'vertical', minHeight: 100 }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="tr-submit tr-pulse"
                  aria-label="Odeslat pre-registraci"
                >
                  {submitting ? 'Odesílám...' : 'Chci být mezi prvními'}
                </button>

              </form>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 5. FOOTER CTA                                                */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="tr-footer-bar" role="complementary" aria-label="Doplňující nabídka">
        <p className="tr-footer-text">
          Jsi trenér v gymu který ještě není na IRONMAPu?
        </p>
        <Link href="/pro-majitele" className="iron-btn iron-btn-primary">
          Přidej gym
        </Link>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* STYLES                                                       */}
      {/* ════════════════════════════════════════════════════════════ */}
      <style>{`

        /* ── Hero ───────────────────────────────────────────────── */
        .tr-hero {
          position: relative;
          min-height: calc(100vh - 64px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          background: var(--black);
        }
        .tr-hero-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(200,255,0,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,255,0,0.035) 1px, transparent 1px);
          background-size: 80px 80px;
          pointer-events: none;
        }
        .tr-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 8rem 3rem 6rem;
        }
        .tr-hero-h1 {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: clamp(3.5rem, 11vw, 10rem);
          text-transform: uppercase;
          letter-spacing: -0.025em;
          line-height: 0.88;
          color: var(--text);
          margin: 1.5rem 0 0;
        }
        .tr-hero-lime {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: clamp(3.5rem, 11vw, 10rem);
          text-transform: uppercase;
          letter-spacing: -0.025em;
          line-height: 0.88;
          color: var(--lime);
          margin: 0 0 2.5rem;
        }
        .tr-hero-body {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: clamp(0.95rem, 2vw, 1.15rem);
          color: var(--muted);
          line-height: 1.75;
          max-width: 520px;
          margin: 0 0 3rem;
        }

        /* Hero load animations */
        .tr-anim-1, .tr-anim-2, .tr-anim-3, .tr-anim-4, .tr-anim-5 {
          animation: trFadeUp 0.7s ease both;
        }
        .tr-anim-1 { animation-delay: 0.05s; }
        .tr-anim-2 { animation-delay: 0.18s; }
        .tr-anim-3 { animation-delay: 0.32s; }
        .tr-anim-4 { animation-delay: 0.44s; }
        .tr-anim-5 { animation-delay: 0.58s; }
        @keyframes trFadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: none; }
        }

        /* Neon pulse */
        .tr-pulse {
          animation: trNeon 3s ease-in-out infinite;
        }
        @keyframes trNeon {
          0%, 100% { box-shadow: 0 0 6px rgba(200,255,0,0.35), 0 0 18px rgba(200,255,0,0.12); }
          50%       { box-shadow: 0 0 14px rgba(200,255,0,0.65), 0 0 40px rgba(200,255,0,0.25); }
        }

        /* ── Scroll reveal ──────────────────────────────────────── */
        .tr-reveal {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .tr-reveal.is-visible {
          opacity: 1;
          transform: none;
        }

        /* ── Section layout ─────────────────────────────────────── */
        .tr-section {
          padding: 8rem 3rem;
        }
        .tr-inner {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ── Typography ─────────────────────────────────────────── */
        .tr-h2 {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: clamp(2.2rem, 5vw, 4rem);
          text-transform: uppercase;
          letter-spacing: -0.02em;
          line-height: 0.9;
          color: var(--text);
        }
        .tr-sub {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: clamp(0.9rem, 1.8vw, 1.05rem);
          color: var(--muted);
          line-height: 1.7;
          max-width: 520px;
        }

        /* ── Feature grid ───────────────────────────────────────── */
        .tr-feat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          margin-top: 4rem;
        }
        .tr-feat-card {
          background: var(--card-bg);
          padding: 2.5rem 2rem;
          transition: background 0.2s;
        }
        .tr-feat-card:hover { background: #191919; }
        .tr-feat-dim .tr-feat-title { color: var(--muted); }
        .tr-feat-dim .tr-feat-body  { color: #555; }
        .tr-feat-icon { margin-bottom: 1.5rem; }
        .tr-feat-title {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 0.92rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text);
          margin-bottom: 0.75rem;
        }
        .tr-feat-body {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: 0.875rem;
          color: var(--muted);
          line-height: 1.6;
        }
        .tr-feat-soon {
          display: inline-block;
          margin-top: 0.75rem;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.62rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--border-mid);
          border: 1px solid var(--border);
          padding: 0.25rem 0.6rem;
        }

        /* ── VIP section ────────────────────────────────────────── */
        .tr-vip-section {
          padding: 8rem 3rem;
          background: var(--off-black);
          border-top: 1px solid rgba(200,255,0,0.25);
          border-bottom: 1px solid var(--border);
        }
        .tr-vip-grid {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 7rem;
          align-items: center;
          max-width: 1000px;
          margin: 0 auto;
        }
        .tr-vip-counter {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }
        .tr-vip-box {
          width: 160px;
          height: 160px;
          border: 2px solid var(--lime);
          box-shadow:
            0 0 28px rgba(200,255,0,0.18),
            inset 0 0 28px rgba(200,255,0,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tr-vip-num {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 5.5rem;
          color: var(--lime);
          line-height: 1;
          letter-spacing: -0.04em;
        }
        .tr-vip-box-label {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.65rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--muted);
          text-align: center;
        }
        .tr-vip-lime {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: clamp(1.3rem, 3vw, 2rem);
          text-transform: uppercase;
          letter-spacing: -0.01em;
          line-height: 1;
          color: var(--lime);
          margin: 0.75rem 0 2rem;
        }
        .tr-vip-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .tr-vip-list li {
          display: flex;
          gap: 0.8rem;
          align-items: flex-start;
          font-family: var(--font-body);
          font-weight: 300;
          font-size: 0.93rem;
          color: var(--muted);
          line-height: 1.5;
        }
        .tr-vip-bullet {
          flex-shrink: 0;
          width: 6px;
          height: 6px;
          background: var(--lime);
          margin-top: 0.45em;
          display: inline-block;
        }
        .tr-vip-note {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: 0.78rem;
          color: var(--muted);
          opacity: 0.65;
          line-height: 1.6;
        }

        /* ── Form ───────────────────────────────────────────────── */
        .tr-form-card {
          background: var(--off-black);
          border: 1px solid var(--border);
          padding: 3rem;
          margin-top: 3rem;
        }
        .tr-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .tr-field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .tr-label {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.7rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .tr-optional {
          color: #555;
          font-family: var(--font-body);
          font-weight: 300;
          font-size: 0.7rem;
          text-transform: none;
          letter-spacing: 0;
        }
        .tr-select-wrap { position: relative; }
        .tr-select-arr {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 6px solid var(--muted);
        }
        .tr-submit {
          width: 100%;
          padding: 1.1rem;
          background: var(--lime);
          color: var(--black);
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 1rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          border: none;
          cursor: crosshair;
          margin-top: 1.25rem;
          transition: background 0.15s, transform 0.15s;
        }
        .tr-submit:hover:not(:disabled) { background: #d8ff20; transform: translateY(-1px); }
        .tr-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Success ────────────────────────────────────────────── */
        .tr-success {
          text-align: center;
          padding: 3rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .tr-success-msg {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 1.6rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--lime);
        }
        .tr-success-sub {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: 0.9rem;
          color: var(--muted);
        }

        /* ── Footer bar ─────────────────────────────────────────── */
        .tr-footer-bar {
          background: var(--off-black);
          border-top: 2px solid var(--lime);
          padding: 4rem 3rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .tr-footer-text {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(1rem, 2.5vw, 1.5rem);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text);
          max-width: 600px;
          line-height: 1.2;
        }

        /* ── Responsive ─────────────────────────────────────────── */
        @media (max-width: 900px) {
          .tr-feat-grid { grid-template-columns: repeat(2, 1fr); }
          .tr-vip-grid  { grid-template-columns: 1fr; gap: 3rem; }
          .tr-vip-counter { flex-direction: row; justify-content: flex-start; gap: 2rem; }
        }
        @media (max-width: 640px) {
          .tr-hero-inner  { padding: 6rem 1.25rem 4rem; }
          .tr-section     { padding: 4rem 1.25rem; }
          .tr-vip-section { padding: 4rem 1.25rem; }
          .tr-feat-grid   { grid-template-columns: 1fr; }
          .tr-form-card   { padding: 2rem 1.25rem; }
          .tr-form-row    { grid-template-columns: 1fr; }
          .tr-footer-bar  { padding: 3rem 1.25rem; flex-direction: column; align-items: flex-start; }
        }

        /* ── Reduced motion ─────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .tr-anim-1, .tr-anim-2, .tr-anim-3, .tr-anim-4, .tr-anim-5 { animation: none; }
          .tr-pulse  { animation: none; }
          .tr-reveal { opacity: 1; transform: none; transition: none; }
        }

      `}</style>
    </main>
  );
}
