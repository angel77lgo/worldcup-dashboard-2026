import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Sun, Moon } from 'lucide-react';
import Simulator from './Simulator';

// --- TYPES ---
interface Team {
  id: string;
  name: string;
  displayName: string;
  abbreviation: string;
  logo: string;
}

interface Competitor {
  id: string;
  homeAway: 'home' | 'away';
  winner?: boolean;
  score: string;
  team: Team;
}

interface MatchDetail {
  type: { id: string; text: string; };
  clock: { value: number; displayValue: string; };
  team: { id: string; };
  scoreValue: number;
  scoringPlay: boolean;
  redCard: boolean;
  yellowCard: boolean;
  penaltyKick: boolean;
  ownGoal: boolean;
  athletesInvolved?: Array<{
    id: string;
    displayName: string;
    shortName: string;
  }>;
}

interface MatchStatus {
  clock: number;
  displayClock: string;
  period: number;
  type: {
    id: string;
    name: string;
    state: 'pre' | 'in' | 'post';
    completed: boolean;
    description: string;
    detail: string;
    shortDetail: string;
  };
}

interface MatchEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  season: {
    slug: 'group-stage' | 'round-of-32' | 'round-of-16' | 'quarterfinals' | 'semifinals' | '3rd-place-match' | 'final';
  };
  status: MatchStatus;
  competitions: Array<{
    competitors: Competitor[];
    details?: MatchDetail[];
    venue?: {
      fullName: string;
      address?: { city: string; };
    };
  }>;
}

interface StandingEntry {
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logos?: Array<{ href: string }>;
  };
  stats: Array<{
    name: string;
    value: number;
    displayValue: string;
    summary?: string;
    type?: string;
  }>;
}

interface GroupStanding {
  name: string;
  abbreviation: string;
  entries: StandingEntry[];
}

const ROUND_OF_32 = [
  { match: 73, home: '2A', away: '2B' },
  { match: 74, home: '1E', away: '3rd(ABCDF)' },
  { match: 75, home: '1F', away: '2C' },
  { match: 76, home: '1C', away: '2F' },
  { match: 77, home: '1I', away: '3rd(CDFGH)' },
  { match: 78, home: '2E', away: '2I' },
  { match: 79, home: '1A', away: '3rd(CEFHI)' },
  { match: 80, home: '1L', away: '3rd(EHIJK)' },
  { match: 81, home: '1D', away: '3rd(BEFIJ)' },
  { match: 82, home: '1G', away: '3rd(AEHIJ)' },
  { match: 83, home: '2K', away: '2L' },
  { match: 84, home: '1H', away: '2J' },
  { match: 85, home: '1B', away: '3rd(EFGIJ)' },
  { match: 86, home: '1J', away: '2H' },
  { match: 87, home: '1K', away: '3rd(DEIJL)' },
  { match: 88, home: '2D', away: '2G' },
];

const getInitialTab = (): 'partidos' | 'grupos' | 'eliminatorias' | 'estadisticas' | 'simulador' => {
  const hash = window.location.hash;
  if (hash === '#/simulator' || hash === '#simulator') return 'simulador';
  if (hash === '#/grupos' || hash === '#grupos') return 'grupos';
  if (hash === '#/eliminatorias' || hash === '#eliminatorias') return 'eliminatorias';
  if (hash === '#/equipos' || hash === '#equipos') return 'estadisticas';

  const path = window.location.pathname;
  if (path === '/simulator' || path === '/simulator/') return 'simulador';
  if (path === '/grupos') return 'grupos';
  if (path === '/eliminatorias') return 'eliminatorias';
  if (path === '/equipos') return 'estadisticas';
  return 'partidos';
};

function App() {
  const [activeTab, setActiveTab] = useState<'partidos' | 'grupos' | 'eliminatorias' | 'estadisticas' | 'simulador'>(getInitialTab);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [matches, setMatches] = useState<MatchEvent[]>([]);
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Nuevo estado para los filtros de partidos (Anteriores, En Vivo, Próximos)
  const [matchFilter, setMatchFilter] = useState<'anteriores' | 'envivo' | 'proximos'>('proximos');

  const handleTabChange = (tab: 'partidos' | 'grupos' | 'eliminatorias' | 'estadisticas' | 'simulador') => {
    setActiveTab(tab);
    let hash = '';
    if (tab === 'simulador') hash = '#/simulator';
    else if (tab === 'grupos') hash = '#/grupos';
    else if (tab === 'eliminatorias') hash = '#/eliminatorias';
    else if (tab === 'estadisticas') hash = '#/equipos';
    window.location.hash = hash;
  };

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);

    try {
      const scoreboardUrl = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=150';
      const matchesRes = await fetch(scoreboardUrl);
      if (matchesRes.ok) {
        const matchesData = await matchesRes.json();
        const events: MatchEvent[] = matchesData.events || [];
        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setMatches(events);
      }

      const standingsUrl = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';
      const standingsRes = await fetch(standingsUrl);
      if (standingsRes.ok) {
        const standingsData = await standingsRes.json();
        if (standingsData.children) {
          setStandings(standingsData.children.map((child: any) => {
            const entries = child.standings?.entries || [];

            // Sort explicitly by FIFA criteria: Points, Goal Difference, Goals For
            entries.sort((a: any, b: any) => {
              const getVal = (entry: any, name: string) => entry.stats.find((s: any) => s.name === name)?.value || 0;
              const ptsA = getVal(a, 'points');
              const ptsB = getVal(b, 'points');
              if (ptsA !== ptsB) return ptsB - ptsA;

              const gdA = getVal(a, 'pointDifferential');
              const gdB = getVal(b, 'pointDifferential');
              if (gdA !== gdB) return gdB - gdA;

              const gfA = getVal(a, 'pointsFor');
              const gfB = getVal(b, 'pointsFor');
              if (gfA !== gfB) return gfB - gfA;

              return 0;
            });

            return {
              name: child.name,
              abbreviation: child.abbreviation,
              entries: entries
            };
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60000);

    const handleNavigation = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);

    return () => {
      clearInterval(interval);
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  const liveMatches = useMemo(() => matches.filter(m => m.status.type.state === 'in'), [matches]);
  const upcomingMatches = useMemo(() => matches.filter(m => m.status.type.state === 'pre'), [matches]);

  const getStat = (entry: StandingEntry, statName: string): number => {
    const found = entry.stats.find(s => s.name === statName || s.type === statName);
    return found ? found.value : 0;
  };

  const bestThirdsRealList = useMemo(() => {
    const thirds = standings
      .filter(g => g.entries.length >= 3)
      .map(g => {
        const letter = g.name.replace('Group ', '').replace('Grupo ', '');
        return {
          id: g.entries[2].team.id,
          name: g.entries[2].team.displayName,
          logo: g.entries[2].team.logos?.[0]?.href || '',
          abbr: g.entries[2].team.abbreviation,
          group: letter,
          stats: g.entries[2].stats
        };
      });

    thirds.sort((a, b) => {
      const getVal = (entry: any, name: string) => entry.stats.find((s: any) => s.name === name || s.type === name)?.value || 0;
      const ptsA = getVal(a, 'points');
      const ptsB = getVal(b, 'points');
      if (ptsA !== ptsB) return ptsB - ptsA;

      const gdA = getVal(a, 'pointDifferential');
      const gdB = getVal(b, 'pointDifferential');
      if (gdA !== gdB) return gdB - gdA;

      const gfA = getVal(a, 'pointsFor');
      const gfB = getVal(b, 'pointsFor');
      if (gfA !== gfB) return gfB - gfA;

      return 0;
    });

    return thirds.slice(0, 8);
  }, [standings]);

  const bestThirdsReal = useMemo(() => {
    return new Set(bestThirdsRealList.map(t => t.id));
  }, [bestThirdsRealList]);

  const groupTopTeamsReal = useMemo(() => {
    const topTeams: Record<string, { id: string; name: string; logo: string; abbr: string }> = {};
    standings.forEach(g => {
      const letter = g.name.replace('Group ', '').replace('Grupo ', '');
      if (g.entries[0]) {
        topTeams[`1${letter}`] = {
          id: g.entries[0].team.id,
          name: g.entries[0].team.displayName,
          logo: g.entries[0].team.logos?.[0]?.href || '',
          abbr: g.entries[0].team.abbreviation
        };
      }
      if (g.entries[1]) {
        topTeams[`2${letter}`] = {
          id: g.entries[1].team.id,
          name: g.entries[1].team.displayName,
          logo: g.entries[1].team.logos?.[0]?.href || '',
          abbr: g.entries[1].team.abbreviation
        };
      }
    });
    return topTeams;
  }, [standings]);

  const thirdPlaceAssignmentsReal = useMemo(() => {
    const assignments: Record<string, any> = {};
    const assignedIds = new Set<string>();

    const slots = [
      '3rd(ABCDF)',
      '3rd(CDFGH)',
      '3rd(CEFHI)',
      '3rd(EHIJK)',
      '3rd(BEFIJ)',
      '3rd(AEHIJ)',
      '3rd(EFGIJ)',
      '3rd(DEIJL)'
    ];

    for (const slot of slots) {
      const allowed = slot.replace('3rd(', '').replace(')', '').split('');
      const match = bestThirdsRealList.find(t => allowed.includes(t.group) && !assignedIds.has(t.id));
      if (match) {
        assignments[slot] = { id: match.id, name: match.name, logo: match.logo, abbr: match.abbr };
        assignedIds.add(match.id);
      }
    }

    return assignments;
  }, [bestThirdsRealList]);

  const resolveRealSlot = (slot: string) => {
    if (/^[12][A-L]$/.test(slot)) {
      return groupTopTeamsReal[slot] || null;
    }

    if (slot.startsWith('3rd(')) {
      return thirdPlaceAssignmentsReal[slot] || null;
    }

    return null;
  };

  const parsePlaceholderToSlot = (displayName: string): string => {
    if (!displayName) return '';
    const cleanName = displayName.trim();

    // Match Group [A-L] Winner / 2nd Place / 1st Place
    const groupMatch = cleanName.match(/Group\s+([A-L])\s+(Winner|2nd Place|1st Place)/i);
    if (groupMatch) {
      const letter = groupMatch[1].toUpperCase();
      const type = groupMatch[2].toLowerCase();
      const pos = (type === 'winner' || type === '1st place') ? '1' : '2';
      return `${pos}${letter}`;
    }

    // Match Third Place Group A/B/C/D/F
    const thirdMatch = cleanName.match(/Third Place Group\s+([A-L/]+)/i);
    if (thirdMatch) {
      const groups = thirdMatch[1].replace(/\//g, '').toUpperCase();
      return `3rd(${groups})`;
    }

    return '';
  };

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      filtered = filtered.filter(m => {
        const name = m.name.toLowerCase();
        const t1 = m.competitions[0]?.competitors[0]?.team.displayName.toLowerCase() || '';
        const t2 = m.competitions[0]?.competitors[1]?.team.displayName.toLowerCase() || '';
        return name.includes(sq) || t1.includes(sq) || t2.includes(sq);
      });
    }

    if (activeTab === 'partidos') {
      if (matchFilter === 'anteriores') return filtered.filter(m => m.status.type.state === 'post');
      if (matchFilter === 'envivo') return filtered.filter(m => m.status.type.state === 'in');
      if (matchFilter === 'proximos') return filtered.filter(m => m.status.type.state === 'pre');
    }
    return filtered;
  }, [matches, searchQuery, matchFilter, activeTab]);

  // Agrupar próximos partidos por fecha en columnas
  const groupedUpcomingMatches = useMemo(() => {
    if (matchFilter !== 'proximos' || activeTab !== 'partidos') return [];

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
  }, [filteredMatches, matchFilter, activeTab]);

  // Render events/details for live matches
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

  const getMatchVenue = (comp: any): { name: string; state: string } | null => {
    if (!comp?.venue?.fullName) return null;
    const city = comp.venue.address?.city || '';
    const parts = city.split(',').map((s: string) => s.trim());
    return { name: comp.venue.fullName, state: parts.length > 1 ? parts[1] : '' };
  };

  return (
    <div>
      <header className="header">
        <div className="header-title">FIFA 26</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} aria-label="Toggle theme">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="refresh-btn" onClick={() => fetchData()} disabled={isRefreshing}>
            <RefreshCw size={16} className={isRefreshing ? 'spinning' : ''} />
            {isRefreshing ? 'Actualizando' : 'Actualizar'}
          </button>
        </div>
      </header>

      {/* HERO SECTION: LIVE MATCHES OR NEXT MATCH */}
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

                  {/* Detalles del partido: Goles, Tarjetas */}
                  {comp.details && comp.details.length > 0 && (
                    <div className="live-match-extended-info">
                      <h4 className="extended-info-title">Jugadas Clave</h4>
                      {renderMatchDetails(comp.details, home?.team.id, away?.team.id)}
                    </div>
                  )}

                  <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <a href={(m as any).links?.[0]?.href || `https://www.google.com/search?q=ver+partido+${home?.team.displayName}+vs+${away?.team.displayName}+en+vivo`} target="_blank" rel="noreferrer" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'var(--accent-primary)',
                      color: '#ffffff',
                      padding: '12px 32px',
                      borderRadius: '99px',
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      boxShadow: 'var(--shadow-md)',
                      transition: 'transform 0.2s ease, background 0.2s ease',
                    }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#0284c7'; }} onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'var(--accent-primary)'; }}>
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
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'var(--bg-color)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-light)',
                      padding: '10px 28px',
                      borderRadius: '99px',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      transition: 'all 0.2s ease',
                    }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
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

      {/* NAVIGATION */}
      <nav className="tabs">
        <button className={`tab ${activeTab === 'partidos' ? 'active' : ''}`} onClick={() => handleTabChange('partidos')}>Partidos</button>
        <button className={`tab ${activeTab === 'grupos' ? 'active' : ''}`} onClick={() => handleTabChange('grupos')}>Grupos</button>
        <button className={`tab ${activeTab === 'eliminatorias' ? 'active' : ''}`} onClick={() => handleTabChange('eliminatorias')}>Eliminatorias</button>
        <button className={`tab ${activeTab === 'estadisticas' ? 'active' : ''}`} onClick={() => handleTabChange('estadisticas')}>Equipos</button>
        <button className={`tab ${activeTab === 'simulador' ? 'active' : ''}`} onClick={() => handleTabChange('simulador')}>Simulador</button>
      </nav>

      {/* SUB-FILTERS & SEARCH (For Matches Tab) */}
      {activeTab === 'partidos' && (
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
      )}

      {/* TAB CONTENT */}
      {activeTab === 'partidos' && (
        <div className="partidos-container">
          {matchFilter === 'proximos' ? (
            // COLUMNS BY DATE FOR UPCOMING MATCHES
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
                            <div className="match-header">
                              <span>{new Date(m.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} hs</span>
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
            // STANDARD GRID FOR OTHERS (LIVE, PAST)
            <div className="matches-grid">
              {filteredMatches.map(m => {
                const comp = m.competitions[0];
                const home = comp?.competitors.find(c => c.homeAway === 'home');
                const away = comp?.competitors.find(c => c.homeAway === 'away');
                const isLive = m.status.type.state === 'in';
                return (
                  <div key={m.id} className={`match-card ${isLive ? 'is-live' : ''}`}>
                    <div className="match-header">
                      <span>{new Date(m.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
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
      )}

      {activeTab === 'grupos' && (
        <div className="standings-grid">
          {standings.map(group => (
            <div key={group.name} className="group-card">
              <div className="group-header">{group.name}</div>
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>POS</th>
                    <th style={{ textAlign: 'left' }}>EQUIPO</th>
                    <th>PJ</th>
                    <th>DG</th>
                    <th>PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {group.entries.map((entry, idx) => {
                    const isTop2 = idx < 2;
                    const isBestThird = idx === 2 && bestThirdsReal.has(entry.team.id);
                    const rowClass = isTop2 ? 'qualified-top2' : isBestThird ? 'qualified-third' : '';
                    return (
                      <tr key={entry.team.id} className={rowClass}>
                        <td>{idx + 1}</td>
                        <td className="team-cell">
                          <img src={entry.team.logos?.[0]?.href || ''} alt="" style={{ width: '16px' }} />
                          <span style={{ fontWeight: (isTop2 || isBestThird) ? 600 : 400 }}>
                            {entry.team.displayName}
                          </span>
                          {isBestThird && (
                            <span className="third-place-badge">3°✓</span>
                          )}
                        </td>
                        <td>{getStat(entry, 'gamesPlayed')}</td>
                        <td>{getStat(entry, 'pointDifferential')}</td>
                        <td style={{ fontWeight: 700 }}>{getStat(entry, 'points')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'eliminatorias' && (() => {
        // Helper: resolve a team for any bracket slot (group slot or winner-of slot)
        const getMatchBySlug = (slug: string) => matches.filter(m => m.season.slug === slug);

        // Map ESPN API match to official FIFA World Cup 2026 match number
        const getESPNMatchNum = (m: MatchEvent): number => {
          if (m.season.slug === 'group-stage') return 0;
          const directMatch = m.name?.match(/Match\s+(\d+)/i) || m.name?.match(/\bM(\d+)\b/i);
          if (directMatch) return parseInt(directMatch[1], 10);

          const homeName = m.competitions[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.displayName || '';
          const awayName = m.competitions[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.displayName || '';

          if (m.season.slug === 'round-of-32') {
            const hSlot = parsePlaceholderToSlot(homeName);
            const aSlot = parsePlaceholderToSlot(awayName);
            const found = ROUND_OF_32.find(def =>
              (def.home === hSlot && def.away === aSlot) || (def.home === aSlot && def.away === hSlot)
            );
            if (found) return found.match;
          }

          if (m.season.slug === 'round-of-16') {
            const nums = [...m.name.matchAll(/\d+/g)].map(x => parseInt(x[0], 10));
            const eventIndices = nums.filter(n => n !== 32);
            if (eventIndices.length === 2) {
              const sortedIndices = [...eventIndices].sort((a, b) => a - b);
              const key = sortedIndices.join(',');
              const mapping: Record<string, number> = {
                '3,6': 89,
                '1,4': 90,
                '2,5': 91,
                '7,8': 92,
                '11,12': 93,
                '9,10': 94,
                '14,15': 95,
                '13,16': 96
              };
              if (mapping[key]) return mapping[key];
            }
          }

          if (m.season.slug === 'quarterfinals') {
            const nums = [...m.name.matchAll(/\d+/g)].map(x => parseInt(x[0], 10));
            const r16WinnerNums = nums.filter(n => n !== 16);
            if (r16WinnerNums.length === 2) {
              const sorted = [...r16WinnerNums].sort((a, b) => a - b);
              const key = sorted.join(',');
              const mapping: Record<string, number> = {
                '1,2': 97,
                '5,6': 98,
                '3,4': 99,
                '7,8': 100
              };
              if (mapping[key]) return mapping[key];
            }
          }

          if (m.season.slug === 'semifinals') {
            const nums = [...m.name.matchAll(/\d+/g)].map(x => parseInt(x[0], 10));
            if (nums.length === 2) {
              const sorted = [...nums].sort((a, b) => a - b);
              const key = sorted.join(',');
              const mapping: Record<string, number> = {
                '1,2': 101,
                '3,4': 102
              };
              if (mapping[key]) return mapping[key];
            }
          }

          if (m.season.slug === '3rd-place-match') return 103;
          if (m.season.slug === 'final') return 104;
          return 0;
        };

        // Find the ESPN round-of-32 match for our bracket slot
        const findR32Match = (matchDef: { home: string; away: string }) =>
          matches.find(m =>
            m.season.slug === 'round-of-32' &&
            m.competitions[0]?.competitors?.length === 2 &&
            (() => {
              const home = m.competitions[0].competitors.find(c => c.homeAway === 'home');
              const away = m.competitions[0].competitors.find(c => c.homeAway === 'away');
              const hSlot = parsePlaceholderToSlot(home?.team?.displayName || '');
              const aSlot = parsePlaceholderToSlot(away?.team?.displayName || '');
              return hSlot === matchDef.home && aSlot === matchDef.away;
            })()
          );

        // Render one bracket match card
        const BracketCard = ({ matchNum, homeTeam, awayTeam, homeScore, awayScore, homeWin, awayWin, state, liveDetail }: {
          matchNum: number;
          homeTeam: { name: string; logo: string } | null;
          awayTeam: { name: string; logo: string } | null;
          homeScore?: string;
          awayScore?: string;
          homeWin?: boolean;
          awayWin?: boolean;
          state?: string;
          liveDetail?: string;
        }) => {
          const isLive = state === 'in';
          const isPost = state === 'post';
          return (
            <div style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              minWidth: '200px',
              width: '200px'
            }}>
              {/* Match label */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '5px 12px',
                background: 'rgba(0,0,0,0.04)',
                borderBottom: '1px solid var(--border-light)',
                fontSize: '0.65rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <span>M{matchNum}</span>
                {isLive && <span style={{ color: '#ef4444', fontWeight: 800 }}>🔴 {liveDetail}</span>}
                {isPost && <span>Final</span>}
              </div>
              {/* Home row */}
              {[
                { team: homeTeam, score: homeScore, win: homeWin },
                { team: awayTeam, score: awayScore, win: awayWin }
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderTop: i === 1 ? '1px solid var(--border-light)' : 'none',
                  background: row.win ? 'rgba(14, 165, 233, 0.05)' : 'transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', overflow: 'hidden' }}>
                    {row.team?.logo ? (
                      <img src={row.team.logo} alt="" style={{ width: '18px', height: 'auto', flexShrink: 0 }} />
                    ) : (
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>🏳️</span>
                    )}
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: row.win ? 700 : 400,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {row.team?.name || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Por clasificar</span>}
                    </span>
                  </div>
                  {(isLive || isPost) && (
                    <span style={{
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      color: row.win ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      marginLeft: '6px',
                      flexShrink: 0
                    }}>
                      {row.score ?? '-'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        };

        // Build bracket column helper
        const RoundColumn = ({ title, flexWeight = 1, children }: { title: string; flexWeight?: number; children: React.ReactNode }) => (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: '210px'
          }}>
            <div style={{
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderBottom: '2px solid var(--border-light)',
              paddingBottom: '8px',
              marginBottom: '16px'
            }}>
              {title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {React.Children.toArray(children).filter(Boolean).map((child, i) => (
                <div key={i} style={{ flex: flexWeight, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 0' }}>
                  {child}
                </div>
              ))}
            </div>
          </div>
        );

        // Visual order for single left-to-right bracket layout
        const R32_ORDER = [75, 78, 73, 76, 83, 84, 81, 82, 74, 77, 79, 80, 86, 87, 85, 88];
        const R16_ORDER = [89, 90, 93, 94, 91, 92, 95, 96];
        const QF_ORDER = [97, 98, 99, 100];
        const SF_ORDER = [101, 102];

        // Build R32 cards in visual tree order
        const r32Cards = R32_ORDER.map(matchNum => {
          const matchDef = ROUND_OF_32.find(d => d.match === matchNum);
          if (!matchDef) return null;
          const espnMatch = findR32Match(matchDef);
          const comp = espnMatch?.competitions[0];
          const home = comp?.competitors?.find(c => c.homeAway === 'home');
          const away = comp?.competitors?.find(c => c.homeAway === 'away');
          const state = espnMatch?.status.type.state;
          const isStarted = state === 'in' || state === 'post';
          const homeTeam = resolveRealSlot(matchDef.home);
          const awayTeam = resolveRealSlot(matchDef.away);
          const homeDisplay = (isStarted && home) ? { name: home.team.displayName, logo: home.team.logo } : homeTeam;
          const awayDisplay = (isStarted && away) ? { name: away.team.displayName, logo: away.team.logo } : awayTeam;
          return (
            <BracketCard
              key={matchDef.match}
              matchNum={matchDef.match}
              homeTeam={homeDisplay}
              awayTeam={awayDisplay}
              homeScore={home?.score}
              awayScore={away?.score}
              homeWin={home?.winner}
              awayWin={away?.winner}
              state={state}
              liveDetail={espnMatch?.status.type.shortDetail}
            />
          );
        });

        // Build cards for later rounds using ESPN data and correct tree ordering
        const buildRoundCards = (slug: string, orderArray: number[]) => {
          const roundMatches = getMatchBySlug(slug);
          return orderArray.map(matchNum => {
            const m = roundMatches.find(x => getESPNMatchNum(x) === matchNum);
            if (!m) return <BracketCard key={matchNum} matchNum={matchNum} homeTeam={null} awayTeam={null} />;

            const comp = m.competitions[0];
            const home = comp?.competitors?.find(c => c.homeAway === 'home');
            const away = comp?.competitors?.find(c => c.homeAway === 'away');
            const state = m.status.type.state;
            return (
              <BracketCard
                key={m.id}
                matchNum={matchNum}
                homeTeam={home ? { name: home.team.displayName, logo: home.team.logo } : null}
                awayTeam={away ? { name: away.team.displayName, logo: away.team.logo } : null}
                homeScore={home?.score}
                awayScore={away?.score}
                homeWin={home?.winner}
                awayWin={away?.winner}
                state={state}
                liveDetail={m.status.type.shortDetail}
              />
            );
          });
        };

        return (
          <div style={{ overflowX: 'auto', padding: '0 0 40px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Fase Eliminatoria</h3>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.85rem' }}>
                Cruces proyectados en tiempo real según la tabla actual de grupos. Desplázate para ver todas las rondas.
              </p>
            </div>
            <div style={{
              display: 'flex',
              gap: '32px',
              minWidth: 'max-content',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              padding: '28px 24px',
              minHeight: '900px',
              alignItems: 'stretch'
            }}>
              <RoundColumn title="16vos de Final" flexWeight={1}>{r32Cards}</RoundColumn>
              <RoundColumn title="8vos de Final" flexWeight={2}>
                {buildRoundCards('round-of-16', R16_ORDER)}
              </RoundColumn>
              <RoundColumn title="Cuartos de Final" flexWeight={4}>
                {buildRoundCards('quarterfinals', QF_ORDER)}
              </RoundColumn>
              <RoundColumn title="Semifinales" flexWeight={8}>
                {buildRoundCards('semifinals', SF_ORDER)}
              </RoundColumn>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '48px',
                minWidth: '210px'
              }}>
                <div>
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid var(--border-light)', paddingBottom: '8px', marginBottom: '12px' }}>
                    3er Lugar
                  </div>
                  {buildRoundCards('3rd-place-match', [103])}
                </div>
                <div>
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid var(--accent-primary)', paddingBottom: '8px', marginBottom: '12px' }}>
                    🏆 Gran Final
                  </div>
                  {buildRoundCards('final', [104])}
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {activeTab === 'estadisticas' && (
        <>
          <input
            type="text"
            placeholder="Buscar equipo..."
            className="input-flat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="stats-grid">
            {(() => {
              const teamMap: any = {};
              standings.forEach(g => g.entries.forEach(e => {
                teamMap[e.team.displayName] = {
                  logo: e.team.logos?.[0]?.href,
                  pts: getStat(e, 'points')
                };
              }));
              return Object.entries(teamMap)
                .filter(([name]) => name.toLowerCase().includes(searchQuery.toLowerCase()))
                .sort((a: any, b: any) => b[1].pts - a[1].pts)
                .map(([name, data]: any) => (
                  <div key={name} className="stat-item">
                    <img src={data.logo} alt="" style={{ width: '32px', marginBottom: '10px' }} />
                    <div className="stat-label">{name}</div>
                    <div className="stat-value">{data.pts} PTS</div>
                  </div>
                ));
            })()}
          </div>
        </>
      )}

      {activeTab === 'simulador' && (
        <Simulator matches={matches} initialStandings={standings} />
      )}
    </div>
  );
}

export default App;
