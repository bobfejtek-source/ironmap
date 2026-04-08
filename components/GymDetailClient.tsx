'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Gym } from '@/lib/db';
import { cityUrl, getDayLabel, parseOpeningHours, parseCoordinates } from '@/lib/utils';
import { useModal } from './ModalContext';
import { useT } from '@/lib/i18n';
import GymCard from './GymCard';
import CheckinButton from './CheckinButton';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: 320, background: '#111', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: 'var(--muted)', fontSize: '0.75rem',
      letterSpacing: '0.15em', textTransform: 'uppercase',
      fontFamily: 'var(--font-display)', fontWeight: 700,
    }}>
      Načítám mapu...
    </div>
  ),
});

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface Props {
  gym: Gym;
  similarGyms: Gym[];
}

export default function GymDetailClient({ gym, similarGyms }: Props) {
  const { openAddGym } = useModal();
  const { t } = useT();
  const hours = parseOpeningHours(gym.opening_hours);
  const coords = parseCoordinates(gym.coordinates);
  const category = gym.category ?? 'Posilovna';

  const mapPins = coords ? [{ lat: coords.lat, lng: coords.lng, name: gym.name }] : [];

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
        <Link href={cityUrl(gym.city)} onMouseEnter={e => e.currentTarget.style.color='var(--text)'} onMouseLeave={e => e.currentTarget.style.color='var(--muted)'}>{gym.city}</Link>
        <span style={{ color: 'var(--border-mid)' }}>—</span>
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
                📍 {gym.city}
              </span>
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

      {/* Grid: contact + hours */}
      {(gym.phone || gym.website || gym.email || gym.address || gym.price_level || gym.opening_hours) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem',
        }}>

          {/* Contact */}
          {(gym.phone || gym.website || gym.email || gym.address || gym.price_level) && (
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              padding: 'clamp(1rem, 3vw, 1.75rem) clamp(0.875rem, 3vw, 2rem)',
            }}>
              <SectionTitle>{t.detail.contact}</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {gym.phone && (
                  <ContactRow icon="◎" label={t.detail.phone}>
                    <a href={`tel:${gym.phone}`} style={{ color: 'var(--lime)', fontWeight: 400 }}>
                      {gym.phone}
                    </a>
                  </ContactRow>
                )}
                {gym.website && (
                  <ContactRow icon="↗" label={t.detail.web}>
                    <a
                      href={gym.website.startsWith('http') ? gym.website : `https://${gym.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--lime)', fontWeight: 400,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 200, display: 'block',
                      }}
                    >
                      {gym.website.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                  </ContactRow>
                )}
                {gym.email && (
                  <ContactRow icon="✉" label={t.detail.email}>
                    <a href={`mailto:${gym.email}`} style={{ color: 'var(--lime)', fontWeight: 400 }}>
                      {gym.email}
                    </a>
                  </ContactRow>
                )}
                {gym.address && (
                  <ContactRow icon="◈" label={t.detail.address}>
                    <span style={{ color: 'var(--muted)', fontWeight: 300 }}>{gym.address}</span>
                  </ContactRow>
                )}
                {gym.price_level && (
                  <ContactRow icon="◇" label={t.detail.price}>
                    <span style={{ color: 'var(--muted)', fontWeight: 300 }}>{gym.price_level}</span>
                  </ContactRow>
                )}
              </div>
            </div>
          )}

          {/* Opening hours */}
          {gym.opening_hours && (
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              padding: 'clamp(1rem, 3vw, 1.75rem) clamp(0.875rem, 3vw, 2rem)',
            }}>
              <SectionTitle>{t.detail.hours}</SectionTitle>
              {hours ? (
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <tbody>
                    {DAY_ORDER.filter(d => hours[d]).map(day => (
                      <tr key={day} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem 0', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', width: 90 }}>
                          {getDayLabel(day)}
                        </td>
                        <td style={{ padding: '0.5rem 0', textAlign: 'right', color: 'var(--text)', fontWeight: 300, fontVariantNumeric: 'tabular-nums' }}>
                          {hours[day]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 300 }}>
                  {(() => {
                    try { const p = JSON.parse(gym.opening_hours!); if (typeof p === 'string') return p; } catch {}
                    return gym.opening_hours;
                  })()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
          Check-in
        </div>
        <p style={{
          color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 300,
          lineHeight: 1.6, marginBottom: '1.25rem',
        }}>
          Byl jsi dnes v {gym.name}? Zaznamenej návštěvu, sbírej odznaky a sleduj svůj pokrok.
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
          onClick={openAddGym}
          className="iron-btn iron-btn-ghost"
          style={{ fontSize: '0.78rem', padding: '0.55rem 1.25rem' }}
        >
          Doplnit →
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

function ContactRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <span style={{ color: 'var(--muted)', fontSize: '0.9rem', flexShrink: 0, marginTop: '0.1rem' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.15rem' }}>
          {label}
        </div>
        {children}
      </div>
    </div>
  );
}
