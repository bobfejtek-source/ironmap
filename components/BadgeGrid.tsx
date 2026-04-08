'use client';

import { BADGE_DEFS, CATEGORY_LABELS, type BadgeCategory, type BadgeDef, type BadgeProgressMap } from '@/lib/badges';

interface Props {
  earnedIds: string[];
  progress?: BadgeProgressMap;
}

export default function BadgeGrid({ earnedIds, progress = {} }: Props) {
  const earnedSet = new Set(earnedIds);

  // Group badges by category, preserving order
  const byCategory = new Map<BadgeCategory, BadgeDef[]>();
  for (const badge of BADGE_DEFS) {
    if (!byCategory.has(badge.category)) byCategory.set(badge.category, []);
    byCategory.get(badge.category)!.push(badge);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {Array.from(byCategory.entries()).map(([category, badges]) => (
        <div key={category}>
          {/* Category header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            marginBottom: '0.75rem',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: '0.75rem', letterSpacing: '0.2em',
              textTransform: 'uppercase', color: 'var(--lime)',
            }}>
              {CATEGORY_LABELS[category]}
            </span>
            <span style={{
              fontSize: '0.65rem', letterSpacing: '0.1em',
              color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 700,
            }}>
              {badges.filter(b => earnedSet.has(b.id)).length}/{badges.length}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Badge cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
            gap: '1px',
            background: 'var(--border)',
          }}>
            {badges.map((badge) => {
              const earned = earnedSet.has(badge.id);
              const prog = progress[badge.id];
              const hasProgress = prog && !earned && prog.target > 0;
              const pct = hasProgress ? Math.round((prog.current / prog.target) * 100) : 0;

              return (
                <div
                  key={badge.id}
                  style={{
                    background: earned ? 'var(--card-bg)' : 'var(--off-black)',
                    padding: '1.1rem 0.9rem',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '0.4rem', textAlign: 'center',
                    opacity: earned ? 1 : badge.manual ? 0.3 : 0.5,
                    position: 'relative',
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* Earned dot */}
                  {earned && (
                    <div style={{
                      position: 'absolute', top: '0.45rem', right: '0.45rem',
                      width: 7, height: 7, background: 'var(--lime)',
                      borderRadius: '50%',
                    }} />
                  )}

                  {/* Icon */}
                  <div style={{
                    fontSize: '1.75rem',
                    filter: earned ? 'none' : 'grayscale(100%)',
                    transition: 'filter 0.2s',
                    lineHeight: 1,
                  }}>
                    {badge.icon}
                  </div>

                  {/* Name */}
                  <div style={{
                    fontFamily: 'var(--font-display)', fontWeight: 900,
                    fontSize: '0.72rem', letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: earned ? 'var(--lime)' : 'var(--muted)',
                    lineHeight: 1.2,
                  }}>
                    {badge.name}
                  </div>

                  {/* Description */}
                  <div style={{
                    fontSize: '0.65rem', color: 'var(--muted)',
                    fontWeight: 300, lineHeight: 1.35,
                  }}>
                    {badge.desc}
                  </div>

                  {/* Progress bar */}
                  {hasProgress && (
                    <div style={{ width: '100%', marginTop: '0.35rem' }}>
                      <div style={{
                        height: 3, background: 'var(--border)',
                        width: '100%', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: 'var(--lime)', transition: 'width 0.4s ease',
                        }} />
                      </div>
                      <div style={{
                        fontSize: '0.6rem', color: 'var(--muted)',
                        fontFamily: 'var(--font-display)', fontWeight: 700,
                        letterSpacing: '0.08em', marginTop: '0.25rem',
                      }}>
                        {prog!.current}/{prog!.target}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
