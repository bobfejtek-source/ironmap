'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Phone, Globe, MapPin } from 'lucide-react';
import type { Gym } from '@/lib/db';
import { cityUrl, parseCoordinates, getDisplayCity } from '@/lib/utils';
import { parseOpeningHours } from '@/lib/parseOpeningHours';
import { useModal } from './ModalContext';
import { useT } from '@/lib/i18n';
import { trackEvent } from '@/lib/gtag';
import GymCard from './GymCard';
import CheckinButton from './CheckinButton';
import GymPhotoGallery from './GymPhotoGallery';

function MapLoader() {
  const { t } = useT();
  return (
    <div style={{
      height: 320, background: '#111', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: 'var(--muted)', fontSize: '0.75rem',
      letterSpacing: '0.15em', textTransform: 'uppercase',
      fontFamily: 'var(--font-display)', fontWeight: 700,
    }}>
      {t.detail.loadingMap}
    </div>
  );
}

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: MapLoader,
});


interface Props {
  gym: Gym;
  similarGyms: Gym[];
}

export default function GymDetailClient({ gym, similarGyms }: Props) {
  const { openDoplnit } = useModal();
  const { t } = useT();
  const hours = parseOpeningHours(gym.opening_hours);
  const coords = parseCoordinates(gym.coordinates);
  const category = gym.category ?? 'Posilovna';
  const displayCity = getDisplayCity(gym);

  const mapPins = coords ? [{ lat: coords.lat, lng: coords.lng, name: gym.name }] : [];

  const websiteHref = gym.website
    ? gym.website.startsWith('http') ? gym.website : `https://${gym.website}`
    : null;
  const websiteDomain = websiteHref
    ? websiteHref.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '')
    : null;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 2rem) 6rem' }}>

      {/* Breadcrumb */}
      <nav style={{
        marginBottom: '2.5rem',
        fontSize: '0.72rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <Link href="/" onMouseEnter={e => e.currentTarget.style.color='var(--text)'} onMouseLeave={e => e.currentTarget.style.color='var(--muted)'}>IRON</Link>
        <span style={{ color: 'var(--border-mid)' }}>—</span>
        <Link href="/posilovny" onMouseEnter={e => e.currentTarget.style.color='var(--text)'} onMouseLeave={e => e.currentTarget.style.color='var(--muted)'}>Posilovny</Link>
        <span style={{ color: 'var(--border-mid)' }}>—</span>
        {displayCity && <Link href={cityUrl(gym.city)} onMouseEnter={e => e.currentTarget.style.color='var(--text)'} onMouseLeave={e => e.currentTarget.style.color='var(--muted)'}>{displayCity}</Link>}
        {displayCity && <span style={{ color: 'var(--border-mid)' }}>—</span>}
        <span style={{ color: 'var(--text)' }}>{gym.name}</span>
      </nav>

      {/* Header */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        padding: 'clamp(1.25rem, 3vw, 2rem) clamp(1rem, 4vw, 2.5rem)',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              {displayCity && (
                <span style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  border: '1px solid var(--lime)',
                  padding: '0.2rem 0.6rem',
                  color: 'var(--lime)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                }}>
                  📍 {displayCity}
                </span>
              )}
              <span style={{
                fontSize: '0.62rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                border: '1px solid var(--border)',
                padding: '0.2rem 0.6rem',
                color: 'var(--muted)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
              }}>
                {category}
              </span>
              {gym.verified === 1 && (
                <span style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  border: '1px solid #22c55e',
                  padding: '0.2rem 0.6rem',
                  color: '#22c55e',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                }}>
                  ✓ {t.detail.verified}
                </span>
              )}
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              lineHeight: 0.9,
              color: 'var(--text)',
              marginBottom: '0.75rem',
            }}>
              {gym.name}
            </h1>

            {gym.address && (
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 300 }}>
                {gym.address}
              </p>
            )}
          </div>

          {/* Rating */}
          {gym.rating != null && (
            <div style={{
              flexShrink: 0,
              border: '1px solid var(--border)',
              padding: '1.25rem 1.5rem',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '3rem',
                letterSpacing: '-0.03em',
                color: 'var(--lime)',
                lineHeight: 1,
              }}>
                {gym.rating.toFixed(1)}
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
                / 5 {t.detail.rating}
              </div>
            </div>
          )}
        </div>

        {gym.description && (
          <p style={{
            marginTop: '1.5rem',
            color: 'var(--muted)',
            fontSize: '0.92rem',
            fontWeight: 300,
            lineHeight: 1.7,
            borderTop: '1px solid var(--border)',
            paddingTop: '1.5rem',
          }}>
            {gym.description}
          </p>
        )}
      </div>

      {/* Photo gallery / CTA placeholder */}
      <GymPhotoGallery photos={gym.photos} gymName={gym.name} gymId={gym.id} />

      {/* Amenities */}
      {(() => {
        const amenities = [
          { field: gym.has_weights,  emoji: '🏋️', label: 'Činky & stroje' },
          { field: gym.has_cardio,   emoji: '🚴', label: 'Kardio' },
          { field: gym.has_classes,  emoji: '👥', label: 'Skupinové lekce' },
          { field: gym.has_showers,  emoji: '🚿', label: 'Sprchy' },
          { field: gym.has_lockers,  emoji: '🔒', label: 'Šatny' },
          { field: gym.has_parking,  emoji: '🅿️', label: 'Parkování' },
          { field: gym.has_sauna,    emoji: '🧖', label: 'Sauna' },
          { field: gym.has_pool,     emoji: '🏊', label: 'Bazén' },
          { field: gym.is_24_7,      emoji: '🕐', label: 'Otevřeno 24/7' },
        ].filter(a => a.field === true);

        const showMultisport = gym.multisport === true;
        if (amenities.length === 0 && !showMultisport) return null;

        return (
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            padding: 'clamp(1rem, 3vw, 1.75rem) clamp(0.875rem, 3vw, 2rem)',
            marginBottom: '1.5rem',
          }}>
            <SectionTitle>Vybavení a služby</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {amenities.map(a => (
                <span key={a.label} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#1a1a1a',
                  border: '1px solid var(--border)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  color: 'var(--muted)',
                  fontWeight: 300,
                  lineHeight: 1,
                }}>
                  <span>{a.emoji}</span>
                  <span>{a.label}</span>
                </span>
              ))}
              {showMultisport && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#0d1f13',
                  border: '1px solid #22c55e',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  color: '#22c55e',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}>
                  MultiSport ✓
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Ceník */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        padding: 'clamp(1rem, 3vw, 1.75rem) clamp(0.875rem, 3vw, 2rem)',
        marginBottom: '1.5rem',
      }}>
        <SectionTitle>Ceník</SectionTitle>

        {gym.daily_price || gym.monthly_price ? (
          /* Case 1: Has prices */
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {gym.daily_price && (
              <div style={{
                border: '1px solid var(--border)',
                padding: '0.75rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
              }}>
                <div style={{ fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                  Jednorázový vstup
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', color: 'var(--lime)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {gym.daily_price} Kč
                </div>
              </div>
            )}
            {gym.monthly_price && (
              <div style={{
                border: '1px solid var(--border)',
                padding: '0.75rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
              }}>
                <div style={{ fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                  Měsíční členství
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', color: 'var(--lime)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {gym.monthly_price} Kč
                </div>
              </div>
            )}
          </div>
        ) : websiteHref ? (
          /* Case 2: No prices but has website */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 300 }}>
              Ceny najdete na webu fitka.
            </p>
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="iron-btn iron-btn-ghost"
              style={{ display: 'inline-flex', fontSize: '0.78rem', padding: '0.55rem 1.25rem', textDecoration: 'none' }}
              onClick={() => trackEvent('intent_click', { type: 'pricing_website' })}
            >
              Zobrazit ceník →
            </a>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 300, opacity: 0.7 }}>
              Jste majitel?{' '}
              <Link href="/pro-majitele" style={{ color: 'var(--lime)', textDecoration: 'none' }}>
                Doplňte ceny přímo na IRON.
              </Link>
            </p>
          </div>
        ) : (
          /* Case 3: No prices, no website */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 300 }}>
              Jste majitel tohoto gymu? Přidejte ceník a přilákejte zákazníky.
            </p>
            <Link
              href="/pro-majitele"
              className="iron-btn iron-btn-ghost"
              style={{ display: 'inline-flex', fontSize: '0.78rem', padding: '0.55rem 1.25rem', textDecoration: 'none' }}
            >
              Doplnit ceník →
            </Link>
          </div>
        )}
      </div>

      {/* Grid: contact + hours */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem',
      }}>

        {/* Contact — always show (at minimum the address row) */}
        {(gym.phone || gym.website || gym.email || gym.address || gym.price_level || !gym.address) && (
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            padding: 'clamp(1rem, 3vw, 1.75rem) clamp(0.875rem, 3vw, 2rem)',
          }}>
            <SectionTitle>{t.detail.contact}</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {gym.phone && (
                <ContactRow icon={<Phone size={14} />} label={t.detail.phone}>
                  <a href={`tel:${gym.phone}`} style={{ color: 'var(--lime)', fontWeight: 400 }} onClick={() => trackEvent('intent_click', { type: 'phone' })}>
                    {gym.phone}
                  </a>
                </ContactRow>
              )}
              {websiteHref && websiteDomain && (
                <ContactRow icon={<Globe size={14} />} label={t.detail.web}>
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--lime)', fontWeight: 400 }}
                    onClick={() => trackEvent('intent_click', { type: 'website' })}
                  >
                    {websiteDomain}
                  </a>
                </ContactRow>
              )}
              <ContactRow icon={<MapPin size={14} />} label={t.detail.address}>
                {gym.address ? (
                  <span style={{ color: 'var(--muted)', fontWeight: 300 }}>{gym.address}</span>
                ) : (
                  <span style={{ color: 'var(--muted)', fontWeight: 300 }}>
                    Adresu zatím neznáme{' '}
                    <button
                      onClick={() => openDoplnit({ id: gym.id, name: gym.name, note: 'Chybí adresa' })}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        color: 'var(--lime)', fontWeight: 700, cursor: 'pointer',
                        fontSize: 'inherit', fontFamily: 'inherit',
                      }}
                    >
                      Doplnit →
                    </button>
                  </span>
                )}
              </ContactRow>
              {gym.price_level && (
                <ContactRow icon={<span style={{ fontSize: '0.85rem' }}>◇</span>} label={t.detail.price}>
                  <span style={{ color: 'var(--muted)', fontWeight: 300 }}>{gym.price_level}</span>
                </ContactRow>
              )}
            </div>
          </div>
        )}

        {/* Opening hours — always shown, all 7 days */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          padding: 'clamp(1rem, 3vw, 1.75rem) clamp(0.875rem, 3vw, 2rem)',
        }}>
          <SectionTitle>{t.detail.hours}</SectionTitle>
          {hours ? (
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <tbody>
                {hours.map(({ day, hours: h }) => {
                  const isNonstop = h === 'Nonstop';
                  const isClosed = h === 'Zavřeno';
                  return (
                    <tr key={day} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{
                        padding: '0.5rem 0',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--muted)',
                        width: 90,
                      }}>
                        {day}
                      </td>
                      <td style={{
                        padding: '0.5rem 0',
                        textAlign: 'right',
                        color: isNonstop ? 'var(--lime)' : isClosed ? 'var(--muted)' : 'var(--text)',
                        fontWeight: isNonstop ? 700 : 300,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {h}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <tbody>
                  {['Pondělí','Úterý','Středa','Čtvrtek','Pátek','Sobota','Neděle'].map(day => (
                    <tr key={day} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{
                        padding: '0.5rem 0',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--muted)',
                        width: 90,
                      }}>
                        {day}
                      </td>
                      <td style={{
                        padding: '0.5rem 0',
                        textAlign: 'right',
                        color: 'var(--muted)',
                        fontWeight: 300,
                        fontStyle: 'italic',
                      }}>
                        Zatím neznáme
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={() => openDoplnit({ id: gym.id, name: gym.name, note: 'Chybí otevírací doba' })}
                style={{
                  marginTop: '1.25rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--lime)',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  padding: 0,
                  textAlign: 'left',
                }}
              >
                Znáte otevírací dobu? Pomozte nám doplnit databázi →
              </button>
            </>
          )}
        </div>
      </div>

      {/* Map */}
      {coords && (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          padding: '1.75rem 2rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <SectionTitle>{t.detail.map}</SectionTitle>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="iron-btn iron-btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.5rem 1.25rem' }}
            >
              {t.detail.openInMaps} ↗
            </a>
          </div>
          <MapView pins={mapPins} singlePin height="320px" />
        </div>
      )}

      {/* Check-in */}
      <div style={{
        border: '1px solid var(--border)',
        padding: '1.5rem 2rem',
        marginBottom: '1.5rem',
        background: 'var(--off-black)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: '0.85rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--lime)',
          marginBottom: '1rem',
        }}>
          {t.detail.checkinHeading}
        </div>
        <p style={{
          color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 300,
          lineHeight: 1.6, marginBottom: '1.25rem',
        }}>
          {t.detail.checkinDesc.replace('{name}', gym.name)}
        </p>
        <CheckinButton
          gymSlug={gym.slug}
          gymLat={coords?.lat ?? null}
          gymLng={coords?.lng ?? null}
        />
      </div>

      {/* Contribute button */}
      <div style={{
        border: '1px solid var(--border)',
        padding: '1.25rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--off-black)',
        marginBottom: '3rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 300 }}>
          {t.detail.contribute}
        </div>
        <button
          onClick={() => openDoplnit({ id: gym.id, name: gym.name })}
          className="iron-btn iron-btn-ghost"
          style={{ fontSize: '0.78rem', padding: '0.55rem 1.25rem' }}
        >
          {t.detail.contributeBtn}
        </button>
      </div>

      {/* Similar gyms */}
      {similarGyms.length > 0 && (
        <div>
          <div className="iron-label" style={{ marginBottom: '1.5rem' }}>
            {t.detail.similar}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1rem',
          }}>
            {similarGyms.map(g => <GymCard key={g.id} gym={g} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      fontSize: '0.85rem',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: 'var(--lime)',
      marginBottom: '1.25rem',
    }}>
      {children}
    </div>
  );
}

function ContactRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <span style={{ color: 'var(--muted)', flexShrink: 0, marginTop: '0.1rem', display: 'flex', alignItems: 'center' }}>
        {icon}
      </span>
      <div>
        <div style={{ fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.15rem' }}>
          {label}
        </div>
        {children}
      </div>
    </div>
  );
}
