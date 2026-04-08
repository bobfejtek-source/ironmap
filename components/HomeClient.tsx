'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { useModal } from './ModalContext';
import { cityUrl } from '@/lib/utils';

interface Props {
  topCities: { city: string; count: number }[];
  total: number;
  allCities: { city: string; count: number }[];
}

const CATEGORY_NAMES = [
  'Posilovna', 'CrossFit', 'Jóga', 'Pilates',
  'Outdoor', 'Bojové sporty', 'Spinning', 'Bazén',
];

function CatIcon({ category }: { category: string }) {
  const p = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    width: 28,
    height: 28,
  };
  switch (category) {
    case 'Posilovna':
      // Horizontal dumbbell
      return <svg {...p}><path d="M6.5 6v12M17.5 6v12"/><path d="M3 8.5h3.5M17.5 8.5H21M3 15.5h3.5M17.5 15.5H21"/><path d="M6.5 12h11"/></svg>;
    case 'CrossFit':
      // Kettlebell: round body + handle arc
      return <svg {...p}><circle cx="12" cy="16" r="5"/><path d="M9.5 11.5V8.5Q12 5.5 14.5 8.5v3"/><path d="M10.5 7.5Q12 5 13.5 7.5"/></svg>;
    case 'Jóga':
      // Seated lotus figure
      return <svg {...p}><circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none"/><path d="M12 6v4.5"/><path d="M6 18c.5-4 2.5-7 6-7s5.5 3 6 7"/><path d="M4 20h16"/><path d="M9.5 10l-3 3M14.5 10l3 3"/></svg>;
    case 'Pilates':
      // Horizontal stretch figure
      return <svg {...p}><circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none"/><path d="M12 5.5v5"/><path d="M3 9.5h18"/><path d="M12 10.5l-4 7.5M12 10.5l4 7.5"/></svg>;
    case 'Outdoor':
      // Sun with rays (Lucide sun)
      return <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M17.66 6.34l-1.41 1.41M4.93 19.07l1.41-1.41"/></svg>;
    case 'Bojové sporty':
      // Raised fist
      return <svg {...p}><path d="M7 12V8a1 1 0 0 1 2 0v4"/><path d="M9 9a1 1 0 0 1 2 0v3"/><path d="M11 10a1 1 0 0 1 2 0v2"/><path d="M13 11a1 1 0 0 1 2 0v3c0 2-1.5 4-4.5 4A4.5 4.5 0 0 1 6 13.5v-1.5a1 1 0 0 1 1-1z"/></svg>;
    case 'Spinning':
      // Bicycle (Lucide bike)
      return <svg {...p}><circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><circle cx="15" cy="5.5" r="1"/><path d="M12 17V14l-3-3 4-3.5 2 3h2.5"/><path d="M3.5 12L8.5 14"/></svg>;
    case 'Bazén':
      // Three wave lines (Lucide waves)
      return <svg {...p}><path d="M2 7c.6.5 1.2 1 2.5 1C7 8 7 6 9.5 6c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 13c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 19c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>;
    default:
      return null;
  }
}

const CITIES_MARQUEE = [
  'Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc',
  'Hradec Králové', 'České Budějovice', 'Zlín', 'Pardubice',
  'Vsetín', 'Havířov', 'Nový Jičín', 'Přerov', 'Opava',
];

type IntentModal = 'entry' | 'compare' | 'trainer' | null;

const FORMSPREE = 'https://formspree.io/f/FORMSPREE_ID';
const TRAINER_GOALS = ['Silový trénink', 'Hubnutí', 'Kondice', 'Rehabilitace', 'Výživa a strava', 'Jiné'];

export default function HomeClient({ topCities, total, allCities }: Props) {
  const { t } = useT();
  const { openAddGym } = useModal();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Intent modals
  const [intentModal, setIntentModal] = useState<IntentModal>(null);
  const closeIntent = () => setIntentModal(null);

  // "Jednorázový vstup" form
  const [entryEmail, setEntryEmail] = useState('');
  const [entryLoading, setEntryLoading] = useState(false);
  const [entrySent, setEntrySent] = useState(false);

  // "Najít trenéra" form
  const [trainerName, setTrainerName] = useState('');
  const [trainerEmail, setTrainerEmail] = useState('');
  const [trainerCity, setTrainerCity] = useState('');
  const [trainerGoal, setTrainerGoal] = useState('');
  const [trainerDesc, setTrainerDesc] = useState('');
  const [trainerLoading, setTrainerLoading] = useState(false);
  const [trainerSent, setTrainerSent] = useState(false);

  // Geolocation error
  const [geoError, setGeoError] = useState('');

  // Close modals on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setIntentModal(null); setGeoError(''); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntryLoading(true);
    try {
      await fetch(FORMSPREE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ type: 'jednorázový-vstup', email: entryEmail }),
      });
    } catch { /* show success anyway */ }
    setEntryLoading(false);
    setEntrySent(true);
  };

  const handleTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrainerLoading(true);
    try {
      await fetch(FORMSPREE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          type: 'najít-trenéra',
          name: trainerName,
          email: trainerEmail,
          city: trainerCity,
          goal: trainerGoal,
          description: trainerDesc,
        }),
      });
    } catch { /* show success anyway */ }
    setTrainerLoading(false);
    setTrainerSent(true);
  };

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allCities
      .filter(c => c.city.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, allCities]);

  const handleSelect = (city: string) => {
    setQuery('');
    setShowDropdown(false);
    router.push(cityUrl(city));
  };

  const handleLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Geolokace není dostupná ve vašem prohlížeči.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => { router.push('/posilovny'); },
      () => { setGeoError('Povol přístup k poloze v nastavení prohlížeče.'); }
    );
  };

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}>
        {/* Background text */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 'clamp(8rem, 30vw, 24rem)',
          letterSpacing: '-0.04em',
          color: 'rgba(200,255,0,0.03)',
          textTransform: 'uppercase',
          lineHeight: 1,
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}>
          IRON
        </div>

        {/* Tag */}
        <div className="iron-label animate-fade-up animate-delay-1" style={{ marginBottom: '1.5rem' }}>
          {t.hero.tag}
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up animate-delay-2" style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 'clamp(4rem, 12vw, 10rem)',
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          lineHeight: 0.88,
          marginBottom: '2rem',
          position: 'relative',
        }}>
          {t.hero.h1}<br />
          <span style={{ color: 'var(--lime)' }}>{t.hero.h2}</span><br />
          {t.hero.h3}
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-up animate-delay-3" style={{
          fontSize: '1rem',
          fontWeight: 300,
          color: 'var(--muted)',
          lineHeight: 1.7,
          maxWidth: '44ch',
          marginBottom: '2.5rem',
          position: 'relative',
        }}>
          {t.hero.sub}
        </p>

        {/* Search bar */}
        <div className="hero-search-wrap animate-fade-up animate-delay-4" style={{
          width: '100%',
          maxWidth: 600,
          position: 'relative',
        }}>
          <div style={{ display: 'flex' }}>
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder={t.hero.searchPlaceholder}
              className="iron-input"
              style={{
                flex: 1,
                fontSize: '1rem',
                padding: '1rem 1.5rem',
                border: '2px solid var(--border)',
                background: 'var(--off-black)',
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && suggestions.length > 0) handleSelect(suggestions[0].city);
              }}
            />
            <button
              onClick={handleLocation}
              className="iron-btn iron-btn-outline"
              style={{
                border: '2px solid var(--border)',
                borderLeft: 'none',
                padding: '1rem 1.5rem',
                fontSize: '0.75rem',
                flexShrink: 0,
              }}
            >
              ⊕ {t.hero.locationBtn}
            </button>
          </div>

          {/* Autocomplete dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="hero-search-dropdown">
              {suggestions.map(({ city, count }) => (
                <button
                  key={city}
                  className="hero-search-item"
                  onMouseDown={() => handleSelect(city)}
                  style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'crosshair' }}
                >
                  <span>{city}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{count} gymů</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Intent buttons */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginTop: '1.25rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <button className="chip" onClick={() => { setGeoError(''); setIntentModal('entry'); }}>
            ◇ Jednorázový vstup
          </button>
          <button className="chip" onClick={handleLocation}>
            ⊕ Najít poblíž
          </button>
          <button className="chip" onClick={() => { setGeoError(''); setIntentModal('compare'); }}>
            ≡ Porovnat posilovny
          </button>
          <button className="chip" onClick={() => { setGeoError(''); setIntentModal('trainer'); }}>
            <TrainerIcon /> Najít trenéra
          </button>
        </div>

        {/* Geolocation error */}
        {geoError && (
          <div style={{
            marginTop: '0.75rem',
            fontSize: '0.75rem',
            color: '#f87171',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            letterSpacing: '0.06em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span>⚠</span> {geoError}
            <button
              onClick={() => setGeoError('')}
              style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '1rem', cursor: 'crosshair', padding: 0, lineHeight: 1 }}
            >×</button>
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: '3rem',
          marginTop: '3.5rem',
          position: 'relative',
        }}>
          <Stat number={`${total}+`} label={t.hero.gymsCount} />
          <div style={{ width: '1px', background: 'var(--border)' }} />
          <Stat number="207+" label={t.hero.citiesCount} />
        </div>
      </section>

      {/* ── Marquee ───────────────────────────────────────────────── */}
      <div className="marquee-strip">
        <div className="marquee-inner">
          {[...CITIES_MARQUEE, ...CITIES_MARQUEE].map((city, i) => (
            <span key={i} className="marquee-item">
              {city} <span>—</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Categories ────────────────────────────────────────────── */}
      <section
        className="section-hpad"
        style={{
          paddingTop: '4rem',
          paddingBottom: '4rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--off-black)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="iron-label" style={{ marginBottom: '2rem' }}>{t.categories.title}</div>
          <div className="cat-grid">
            {CATEGORY_NAMES.map((cat) => (
              <button
                key={cat}
                onClick={() => router.push('/posilovny')}
                style={{
                  background: 'var(--off-black)',
                  padding: '1.5rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  border: 'none',
                  cursor: 'crosshair',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--off-black)')}
              >
                <span style={{ color: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CatIcon category={cat} />
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  textAlign: 'center',
                }}>
                  {cat}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cities grid ───────────────────────────────────────────── */}
      <section className="section-hpad" style={{ paddingTop: '5rem', paddingBottom: '5rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="iron-label" style={{ marginBottom: '0.75rem' }}>{t.cities.title}</div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                textTransform: 'uppercase',
                letterSpacing: '-0.01em',
                lineHeight: 0.9,
              }}>
                {t.cities.title}
              </h2>
            </div>
            <Link href="/posilovny" style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.78rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--lime)',
              borderBottom: '1px solid var(--lime)',
              paddingBottom: '0.1rem',
            }}>
              {t.cities.viewAll}
            </Link>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '1px',
            background: 'var(--border)',
            border: '1px solid var(--border)',
          }}>
            {topCities.map(({ city, count }) => (
              <Link
                key={city}
                href={cityUrl(city)}
                style={{
                  background: 'var(--black)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                  transition: 'background 0.2s',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--card-bg)';
                  (e.currentTarget.querySelector('.city-name') as HTMLElement)!.style.color = 'var(--lime)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--black)';
                  (e.currentTarget.querySelector('.city-name') as HTMLElement)!.style.color = 'var(--text)';
                }}
              >
                <span
                  className="city-name"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'var(--text)',
                    transition: 'color 0.2s',
                  }}
                >
                  {city}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  color: 'var(--muted)',
                  letterSpacing: '0.06em',
                }}>
                  {count} {t.cities.gymsLabel}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intent modals ────────────────────────────────────────── */}

      {intentModal === 'entry' && (
        <IntentModalShell onClose={closeIntent}>
          <div className="iron-modal-header">
            <div className="iron-modal-title" style={{ fontSize: '1.1rem' }}>Pracujeme na tom!</div>
            <button className="iron-modal-close" onClick={closeIntent}>×</button>
          </div>
          <div className="iron-modal-body">
            {entrySent ? (
              <SuccessBlock title="Díky!" sub="Dáme ti vědět jako prvnímu, až bude jednorázový vstup dostupný." onClose={() => { closeIntent(); setEntrySent(false); setEntryEmail(''); }} />
            ) : (
              <>
                <p style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 300, lineHeight: 1.7, marginBottom: '1.5rem' }}>
                  Domlouváme partnerství s posilovnami, aby ses mohl platit vstup přímo z mobilu.
                  Dej nám email a dáme ti vědět jako prvnímu.
                </p>
                <form onSubmit={handleEntrySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    type="email" required
                    value={entryEmail} onChange={e => setEntryEmail(e.target.value)}
                    placeholder="tvuj@email.cz"
                    className="iron-input"
                  />
                  <button type="submit" disabled={entryLoading} className="iron-btn iron-btn-primary"
                    style={{ width: '100%', opacity: entryLoading ? 0.6 : 1 }}>
                    {entryLoading ? 'Odesílám...' : 'Chci být první →'}
                  </button>
                </form>
              </>
            )}
          </div>
        </IntentModalShell>
      )}

      {intentModal === 'compare' && (
        <IntentModalShell onClose={closeIntent}>
          <div className="iron-modal-header">
            <div className="iron-modal-title" style={{ fontSize: '1.1rem' }}>Brzy!</div>
            <button className="iron-modal-close" onClick={closeIntent}>×</button>
          </div>
          <div className="iron-modal-body">
            <div style={{ padding: '1rem 0 0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1.25rem', color: 'var(--lime)', fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.02em' }}>≡≡</div>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.7, maxWidth: '30ch', margin: '0 auto 1.75rem' }}>
                Pracujeme na srovnávači posiloven — ceny, vybavení, hodnocení na jednom místě.
              </p>
              <button onClick={closeIntent} className="iron-btn iron-btn-outline">Zavřít</button>
            </div>
          </div>
        </IntentModalShell>
      )}

      {intentModal === 'trainer' && (
        <IntentModalShell onClose={closeIntent}>
          <div className="iron-modal-header">
            <div className="iron-modal-title" style={{ fontSize: '1.1rem' }}>Najdi svého trenéra</div>
            <button className="iron-modal-close" onClick={closeIntent}>×</button>
          </div>
          <div className="iron-modal-body">
            {trainerSent ? (
              <SuccessBlock
                title="Díky!"
                sub="Ozveme se ti do 48 hodin s doporučením."
                onClose={() => { closeIntent(); setTrainerSent(false); setTrainerName(''); setTrainerEmail(''); setTrainerCity(''); setTrainerGoal(''); setTrainerDesc(''); }}
              />
            ) : (
              <>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 300, lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Řekni nám co hledáš a my tě spojíme s trenérem ve tvém městě.
                </p>
                <form onSubmit={handleTrainerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                    <div>
                      <label style={intentLabelStyle}>Jméno</label>
                      <input className="iron-input" value={trainerName} onChange={e => setTrainerName(e.target.value)} placeholder="Jan Novák" />
                    </div>
                    <div>
                      <label style={intentLabelStyle}>Město</label>
                      <input className="iron-input" value={trainerCity} onChange={e => setTrainerCity(e.target.value)} placeholder="Praha" />
                    </div>
                  </div>
                  <div>
                    <label style={intentLabelStyle}>Email *</label>
                    <input type="email" required className="iron-input" value={trainerEmail} onChange={e => setTrainerEmail(e.target.value)} placeholder="tvuj@email.cz" />
                  </div>
                  <div>
                    <label style={intentLabelStyle}>Co hledáš?</label>
                    <div style={{ position: 'relative' }}>
                      <select className="iron-select" value={trainerGoal} onChange={e => setTrainerGoal(e.target.value)}>
                        <option value="">— Vyberte cíl —</option>
                        {TRAINER_GOALS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none', fontSize: '0.7rem' }}>▼</div>
                    </div>
                  </div>
                  <div>
                    <label style={intentLabelStyle}>Krátký popis</label>
                    <textarea
                      className="iron-input" rows={3}
                      value={trainerDesc} onChange={e => setTrainerDesc(e.target.value)}
                      placeholder="Např. hledám trenéra 2× týdně, jsem začátečník..."
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  <button type="submit" disabled={trainerLoading} className="iron-btn iron-btn-primary"
                    style={{ width: '100%', marginTop: '0.25rem', opacity: trainerLoading ? 0.6 : 1 }}>
                    {trainerLoading ? 'Odesílám...' : 'Najít trenéra →'}
                  </button>
                </form>
              </>
            )}
          </div>
        </IntentModalShell>
      )}

      {/* ── Add gym banner ────────────────────────────────────────── */}
      <section
        className="section-hpad"
        style={{
          paddingTop: '4rem',
          paddingBottom: '4rem',
          background: 'var(--off-black)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '2rem',
        flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(1.75rem, 4vw, 3rem)',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            lineHeight: 0.95,
            marginBottom: '0.75rem',
          }}>
            {t.banner.text}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 300 }}>
            {t.banner.sub}
          </p>
        </div>
        <button onClick={openAddGym} className="iron-btn iron-btn-primary" style={{ fontSize: '0.9rem', padding: '0.85rem 2.25rem' }}>
          {t.banner.btn} →
        </button>
      </section>
    </>
  );
}

const intentLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.68rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: '0.35rem',
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
};

function TrainerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round"
      width={13} height={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }}
    >
      <circle cx="12" cy="4.5" r="1.5" fill="currentColor" stroke="none"/>
      <path d="M12 6v4.5"/>
      <path d="M9.5 10.5l2.5-1.5 2.5 1.5"/>
      <path d="M5.5 9h3.5M15 9h3.5M6 8v2M19 8v2"/>
      <path d="M12 11l-2.5 5.5M12 11l2.5 5.5"/>
    </svg>
  );
}

function IntentModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="iron-modal-overlay" onClick={onClose}>
      <div className="iron-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function SuccessBlock({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
      <div style={{
        width: 44, height: 44, border: '2px solid var(--lime)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 1.25rem', fontSize: '1.3rem', color: 'var(--lime)',
      }}>✓</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem',
        textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.6rem',
      }}>{title}</div>
      {sub && <p style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 300 }}>{sub}</p>}
      <button onClick={onClose} className="iron-btn iron-btn-outline" style={{ marginTop: '1.5rem' }}>
        Zavřít
      </button>
    </div>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: '2.5rem',
        letterSpacing: '-0.03em',
        color: 'var(--lime)',
        lineHeight: 1,
      }}>
        {number}
      </div>
      <div style={{
        fontSize: '0.65rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        marginTop: '0.25rem',
      }}>
        {label}
      </div>
    </div>
  );
}
