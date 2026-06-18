import { useState, useMemo } from 'react';
import type { MatchEvent, MatchDetail } from '../../types';
import { SoccerBallIcon } from './SoccerBallIcon';

interface MatchesTabProps {
  matches: MatchEvent[];
  loading: boolean;
  favorites: string[];
  toggleFavorite: (id: string) => void;
}

export function MatchesTab({ matches, loading, favorites, toggleFavorite }: MatchesTabProps) {
  const [matchFilter, setMatchFilter] = useState<'anteriores' | 'envivo' | 'proximos'>('proximos');
  const [searchQuery, setSearchQuery] = useState('');

  const liveMatches = useMemo(() => matches.filter(m => m.status.type.state === 'in'), [matches]);
  const upcomingMatches = useMemo(() => matches.filter(m => m.status.type.state === 'pre'), [matches]);

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => {
        const c = m.competitions[0];
        if (!c) return false;
        const home = c.competitors.find(comp => comp.homeAway === 'home')?.team.displayName.toLowerCase() || '';
        const away = c.competitors.find(comp => comp.homeAway === 'away')?.team.displayName.toLowerCase() || '';
        return home.includes(q) || away.includes(q);
      });
    }

    if (matchFilter === 'anteriores') return filtered.filter(m => m.status.type.state === 'post');
    if (matchFilter === 'envivo') return filtered.filter(m => m.status.type.state === 'in');
    if (matchFilter === 'proximos') return filtered.filter(m => m.status.type.state === 'pre');
    
    return filtered;
  }, [matches, searchQuery, matchFilter]);

  const groupedUpcomingMatches = useMemo(() => {
    if (matchFilter !== 'proximos') return [];

    const groups: Record<string, MatchEvent[]> = {};
    filteredMatches.forEach(m => {
      const localDate = new Date(m.date);
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      const d = `${year}-${month}-${day}`;
      if (!groups[d]) groups[d] = [];
      groups[d].push(m);
    });

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredMatches, matchFilter]);

  const getMatchVenue = (comp: any): { name: string; state: string } | null => {
    if (!comp?.venue?.fullName) return null;
    const city = comp.venue.address?.city || '';
    const parts = city.split(',').map((s: string) => s.trim());
    return { name: comp.venue.fullName, state: parts.length > 1 ? parts[1] : '' };
  };

  const renderMatchDetails = (details?: MatchDetail[], homeId?: string, awayId?: string) => {
    if (!details || details.length === 0) return null;

    return (
      <div className="match-timeline-details">
        {details.map((d, i) => {
          let icon = '•';
          if (d.type.text.toLowerCase().includes('goal') || d.scoringPlay) icon = '⚽';
          if (d.type.text.toLowerCase().includes('yellow card')) icon = '🟨';
          if (d.type.text.toLowerCase().includes('red card')) icon = '🟥';

          const teamAlign = d.team.id === homeId ? 'left' : d.team.id === awayId ? 'right' : 'center';
          const player = d.athletesInvolved?.[0]?.shortName || d.type.text;

          return (
            <div key={i} className={`timeline-event align-${teamAlign}`}>
              <div className="timeline-clock">{d.clock.displayValue}</div>
              <div className="timeline-info">
                <span className="timeline-icon">{icon}</span>
                <span className="timeline-player">{player}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <section className="hero-section">
        {loading ? (
          <div className="loader">Cargando...</div>
        ) : liveMatches.length > 0 ? (
          <>
            <div className="hero-title">
              <span className="dot"></span> Partidos en Curso ({liveMatches.length})
            </div>
            {liveMatches.map(m => {
              const comp = m.competitions[0];
              const home = comp.competitors.find(c => c.homeAway === 'home');
              const away = comp.competitors.find(c => c.homeAway === 'away');
              return (
                <div key={m.id} className="live-match-huge">
                  <div className="live-match-huge-fav">
                    <SoccerBallIcon active={favorites.includes(m.id)} onClick={() => toggleFavorite(m.id)} size={22} />
                  </div>
                  <div className="live-match-huge-teams">
                    <div className="huge-team">
                      <img src={home?.team.logo || ''} alt="" className="huge-logo" />
                      <div className="huge-name">{home?.team.displayName}</div>
                    </div>
                    <div className="huge-score-container">
                      <div className="huge-score">{home?.score} - {away?.score}</div>
                      <div className="huge-clock">{m.status.displayClock}</div>
                    </div>
                    <div className="huge-team">
                      <img src={away?.team.logo || ''} alt="" className="huge-logo" />
                      <div className="huge-name">{away?.team.displayName}</div>
                    </div>
                  </div>

                  {(() => {
                    const v = getMatchVenue(comp);
                    return v ? (
                      <div className="hero-venue">
                        <span>{v.name}</span>
                        {v.state && <><span className="hero-venue-sep">·</span><span>{v.state}</span></>}
                      </div>
                    ) : null;
                  })()}

                  {comp.details && comp.details.length > 0 && (
                    <div className="live-match-extended-info">
                      <h4 className="extended-info-title">Jugadas Clave</h4>
                      {renderMatchDetails(comp.details, home?.team.id, away?.team.id)}
                    </div>
                  )}

                  <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <a href={(m as any).links?.[0]?.href || `https://www.google.com/search?q=ver+partido+${home?.team.displayName}+vs+${away?.team.displayName}+en+vivo`} target="_blank" rel="noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent-primary)', color: '#ffffff',
                      padding: '12px 32px', borderRadius: '99px', textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem',
                      boxShadow: 'var(--shadow-md)', transition: 'transform 0.2s ease, background 0.2s ease',
                    }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#0284c7'; }} 
                       onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'var(--accent-primary)'; }}>
                      📺 Opciones para Ver en Vivo
                    </a>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div className="hero-title" style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)' }}>
              Próximo Partido
            </div>
            {upcomingMatches.length > 0 ? (() => {
              const m = upcomingMatches[0];
              const comp = m.competitions[0];
              const home = comp.competitors.find(c => c.homeAway === 'home');
              const away = comp.competitors.find(c => c.homeAway === 'away');
              return (
                <div className="live-match-huge upcoming-hero">
                  <div className="live-match-huge-fav">
                    <SoccerBallIcon active={favorites.includes(m.id)} onClick={() => toggleFavorite(m.id)} size={22} />
                  </div>
                  <div className="live-match-huge-teams">
                    <div className="huge-team">
                      <img src={home?.team.logo || ''} alt="" className="huge-logo" />
                      <div className="huge-name">{home?.team.displayName}</div>
                    </div>
                    <div className="huge-score-container">
                      <div className="huge-score" style={{ color: 'var(--text-secondary)' }}>VS</div>
                      <div className="huge-clock">
                        {new Date(m.date).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="huge-team">
                      <img src={away?.team.logo || ''} alt="" className="huge-logo" />
                      <div className="huge-name">{away?.team.displayName}</div>
                    </div>
                  </div>

                  {(() => {
                    const v = getMatchVenue(comp);
                    return v ? (
                      <div className="hero-venue">
                        <span>{v.name}</span>
                        {v.state && <><span className="hero-venue-sep">·</span><span>{v.state}</span></>}
                      </div>
                    ) : null;
                  })()}

                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <a href={(m as any).links?.[0]?.href || `https://www.google.com/search?q=donde+ver+${home?.team.displayName}+vs+${away?.team.displayName}`} target="_blank" rel="noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-color)', color: 'var(--text-primary)',
                      border: '1px solid var(--border-light)', padding: '10px 28px', borderRadius: '99px', textDecoration: 'none', fontWeight: 600,
                      fontSize: '0.9rem', transition: 'all 0.2s ease',
                    }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }} 
                       onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                      📺 Dónde ver este partido
                    </a>
                  </div>
                </div>
              );
            })() : (
              <div className="no-live-matches">No hay partidos en curso ni próximos.</div>
            )}
          </>
        )}
      </section>

      <div className="controls-bar">
        <div className="sub-filters">
          <button className={`sub-filter-btn ${matchFilter === 'anteriores' ? 'active' : ''}`} onClick={() => setMatchFilter('anteriores')}>
            Anteriores
          </button>
          <button className={`sub-filter-btn ${matchFilter === 'envivo' ? 'active' : ''}`} onClick={() => setMatchFilter('envivo')}>
            En Vivo
          </button>
          <button className={`sub-filter-btn ${matchFilter === 'proximos' ? 'active' : ''}`} onClick={() => setMatchFilter('proximos')}>
            Próximos
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar país..."
          className="input-flat search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="partidos-container">
        {matchFilter === 'proximos' ? (
          <div className="columns-container">
            {groupedUpcomingMatches.map(([dateString, dateMatches]) => {
              const d = new Date(dateString + 'T12:00:00');
              return (
                <div key={dateString} className="date-column">
                  <div className="date-column-header">
                    {d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                  <div className="date-column-content">
                    {dateMatches.map(m => {
                      const comp = m.competitions[0];
                      const home = comp?.competitors.find(c => c.homeAway === 'home');
                      const away = comp?.competitors.find(c => c.homeAway === 'away');
                      return (
                        <div key={m.id} className="match-card">
                          <div className="match-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{new Date(m.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} hs</span>
                              <SoccerBallIcon active={favorites.includes(m.id)} onClick={(e) => { e.stopPropagation(); toggleFavorite(m.id); }} size={16} />
                            </span>
                          </div>
                          <div className="match-team-row">
                            <div className="match-team-info">
                              <img src={home?.team.logo || ''} alt="" className="match-team-logo" />
                              <span>{home?.team.displayName}</span>
                            </div>
                          </div>
                          <div className="match-team-row">
                            <div className="match-team-info">
                              <img src={away?.team.logo || ''} alt="" className="match-team-logo" />
                              <span>{away?.team.displayName}</span>
                            </div>
                          </div>
                          {(() => {
                            const v = getMatchVenue(comp);
                            return v ? (
                              <div className="match-venue">
                                <span>{v.name}</span>
                                {v.state && <><span className="match-venue-sep">·</span><span>{v.state}</span></>}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {groupedUpcomingMatches.length === 0 && (
              <div className="empty-state">No hay próximos partidos programados.</div>
            )}
          </div>
        ) : (
          <div className="matches-grid">
            {filteredMatches.map(m => {
              const comp = m.competitions[0];
              const home = comp?.competitors.find(c => c.homeAway === 'home');
              const away = comp?.competitors.find(c => c.homeAway === 'away');
              const isLive = m.status.type.state === 'in';
              return (
                <div key={m.id} className={`match-card ${isLive ? 'is-live' : ''}`}>
                  <div className="match-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{new Date(m.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                      <SoccerBallIcon active={favorites.includes(m.id)} onClick={(e) => { e.stopPropagation(); toggleFavorite(m.id); }} size={16} />
                    </span>
                    <span style={{ color: isLive ? 'var(--accent-live)' : 'inherit' }}>
                      {isLive ? m.status.displayClock : m.status.type.shortDetail}
                    </span>
                  </div>
                  <div className="match-team-row">
                    <div className="match-team-info">
                      <img src={home?.team.logo || ''} alt="" className="match-team-logo" />
                      <span>{home?.team.displayName}</span>
                    </div>
                    <span className="match-score">{m.status.type.state === 'pre' ? '-' : home?.score}</span>
                  </div>
                  <div className="match-team-row">
                    <div className="match-team-info">
                      <img src={away?.team.logo || ''} alt="" className="match-team-logo" />
                      <span>{away?.team.displayName}</span>
                    </div>
                    <span className="match-score">{m.status.type.state === 'pre' ? '-' : away?.score}</span>
                  </div>
                  {(() => {
                    const v = getMatchVenue(comp);
                    return v ? (
                      <div className="match-venue">
                        <span>{v.name}</span>
                        {v.state && <><span className="match-venue-sep">·</span><span>{v.state}</span></>}
                      </div>
                    ) : null;
                  })()}
                </div>
              );
            })}
            {filteredMatches.length === 0 && (
              <div className="empty-state">No se encontraron partidos.</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
