import { useState, useEffect } from 'react';
import { Lock, Edit3, ChevronDown, ChevronUp, Shuffle } from 'lucide-react';
import { MatchEvent } from './types';
import { 
  ROUND_OF_32, ROUND_OF_16, QUARTERFINALS, SEMIFINALS, FINAL, THIRD 
} from './utils/constants';

type TeamSlot = { name: string; logo?: string; abbr?: string } | null;

export default function Simulator({ matches, initialStandings }: { matches: any[], initialStandings: any[] }) {
  const [simScores, setSimScores] = useState<Record<string, { home: string, away: string }>>(() => {
    const saved = localStorage.getItem('simScores');
    return saved ? JSON.parse(saved) : {};
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  // Resultados de los cruces eliminatorios
  const [knockoutScores, setKnockoutScores] = useState<Record<number, { home: string; away: string }>>(() => {
    const saved = localStorage.getItem('knockoutScores');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('simScores', JSON.stringify(simScores));
  }, [simScores]);

  useEffect(() => {
    localStorage.setItem('knockoutScores', JSON.stringify(knockoutScores));
  }, [knockoutScores]);

  const resetSimulator = () => {
    setSimScores({});
    setKnockoutScores({});
    localStorage.removeItem('simScores');
    localStorage.removeItem('knockoutScores');
  };

  const fillRandom = () => {
    const groupMatches = matches.filter(m => m.season?.slug === 'group-stage');
    const newScores = { ...simScores };
    groupMatches.forEach(m => {
      if (m.status?.type?.state !== 'post' && m.status?.type?.state !== 'in') {
        // Pesos simples para hacer marcadores más lógicos (más comunes: 0, 1, 2)
        const getWeightedScore = () => {
          const r = Math.random();
          if (r < 0.35) return '1';
          if (r < 0.65) return '2';
          if (r < 0.85) return '0';
          if (r < 0.95) return '3';
          return '4';
        };
        newScores[m.id] = {
          home: getWeightedScore(),
          away: getWeightedScore()
        };
      }
    });
    setSimScores(newScores);
  };

  const handleScoreChange = (matchId: string, type: 'home' | 'away', value: string) => {
    const sanitizedValue = value.replace(/[^0-9]/g, '');
    setSimScores(prev => ({
      ...prev,
      [matchId]: { ...(prev[matchId] || { home: '', away: '' }), [type]: sanitizedValue }
    }));
  };

  const handleKnockoutChange = (matchNum: number, type: 'home' | 'away', value: string) => {
    const sanitizedValue = value.replace(/[^0-9]/g, '');
    setKnockoutScores(prev => ({
      ...prev,
      [matchNum]: { ...(prev[matchNum] || { home: '', away: '' }), [type]: sanitizedValue }
    }));
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // ---------- CALCULAR STANDINGS SIMULADOS ----------
  const { simulatedStandings, teamToGroupMap, bestThirds, groupTopTeams, thirdPlaceAssignments } = useMemo(() => {
    const groupMap: Record<string, any[]> = {};
    const teamToGroupMap: Record<string, string> = {};

    initialStandings.forEach(g => {
      groupMap[g.name] = g.entries.map((e: any) => {
        teamToGroupMap[e.team.id] = g.name;
        return { id: e.team.id, name: e.team.displayName, abbr: e.team.abbreviation, logo: e.team.logos?.[0]?.href, pj: 0, w: 0, d: 0, l: 0, gf: 0, gc: 0, pts: 0 };
      });
    });

    const updateStats = (teamId: string, gf: number, gc: number) => {
      const gn = teamToGroupMap[teamId];
      if (!gn) return;
      const t = groupMap[gn].find(x => x.id === teamId);
      if (t) {
        t.pj += 1; t.gf += gf; t.gc += gc;
        if (gf > gc) { t.w += 1; t.pts += 3; }
        else if (gf === gc) { t.d += 1; t.pts += 1; }
        else { t.l += 1; }
      }
    };

    matches.filter(m => m.season?.slug === 'group-stage').forEach(m => {
      const comp = m.competitions[0];
      const home = comp.competitors.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors.find((c: any) => c.homeAway === 'away');
      if (!home || !away) return;

      let hs = 0, as_ = 0, played = false;
      if (m.status.type.state === 'post' || m.status.type.state === 'in') {
        hs = parseInt(home.score, 10) || 0; as_ = parseInt(away.score, 10) || 0; played = true;
      } else if (simScores[m.id]) {
        const h = simScores[m.id].home, a = simScores[m.id].away;
        if (h.trim() !== '' && a.trim() !== '') {
          const ph = parseInt(h, 10), pa = parseInt(a, 10);
          if (!isNaN(ph) && !isNaN(pa)) { hs = ph; as_ = pa; played = true; }
        }
      }
      if (played) { updateStats(home.team.id, hs, as_); updateStats(away.team.id, as_, hs); }
    });

    const sortFn = (a: any, b: any) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const dA = a.gf - a.gc, dB = b.gf - b.gc;
      if (dB !== dA) return dB - dA;
      return b.gf - a.gf;
    };

    const result = Object.entries(groupMap).map(([name, teams]) => {
      teams.sort(sortFn);
      return { name, entries: teams };
    });

    const thirds = result.filter(g => g.entries.length >= 3)
      .map(g => ({ ...g.entries[2], group: g.name.replace('Group ', '') }))
      .sort(sortFn);
    const bestThirds = thirds.slice(0, 8);

    // Mapa: '1A' -> teamSlot, '2A' -> teamSlot, etc.
    const groupTopTeams: Record<string, TeamSlot> = {};
    result.forEach(g => {
      const letter = g.name.replace('Group ', '');
      if (g.entries[0]) groupTopTeams[`1${letter}`] = { name: g.entries[0].name, logo: g.entries[0].logo, abbr: g.entries[0].abbr };
      if (g.entries[1]) groupTopTeams[`2${letter}`] = { name: g.entries[1].name, logo: g.entries[1].logo, abbr: g.entries[1].abbr };
    });

    // Dedup third place assignments
    const thirdPlaceAssignments: Record<string, TeamSlot> = {};
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
      const match = bestThirds.find((t: any) => allowed.includes(t.group) && !assignedIds.has(t.id));
      if (match) {
        thirdPlaceAssignments[slot] = { name: match.name, logo: match.logo, abbr: match.abbr };
        assignedIds.add(match.id);
      }
    }

    return { simulatedStandings: result, teamToGroupMap, bestThirds, groupTopTeams, thirdPlaceAssignments };
  }, [matches, initialStandings, simScores]);

  // ---------- RESOLVER SLOTS DE LAS LLAVES ----------
  const resolveSlot = (slot: string): TeamSlot => {
    if (/^[12][A-L]$/.test(slot)) return groupTopTeams[slot] || null;

    if (slot.startsWith('3rd(')) {
      return thirdPlaceAssignments[slot] || null;
    }

    // Slots de ganadores: 'W73', 'W89', etc.
    if (slot.startsWith('W')) {
      const matchNum = parseInt(slot.slice(1));
      return resolveKnockoutWinner(matchNum);
    }

    // Slots de perdedores (3er lugar): 'L101', etc.
    if (slot.startsWith('L')) {
      const matchNum = parseInt(slot.slice(1));
      return resolveKnockoutLoser(matchNum);
    }

    return null;
  };

  const resolveKnockoutWinner = (matchNum: number): TeamSlot => {
    const score = knockoutScores[matchNum];
    const allMatches = [...ROUND_OF_32, ...ROUND_OF_16, ...QUARTERFINALS, ...SEMIFINALS, ...FINAL, ...THIRD];
    const matchDef = allMatches.find(m => m.match === matchNum);
    if (!matchDef) return null;

    const homeTeam = resolveSlot(matchDef.home);
    const awayTeam = resolveSlot(matchDef.away);

    if (!score || score.home.trim() === '' || score.away.trim() === '') return null;
    const h = parseInt(score.home, 10), a = parseInt(score.away, 10);
    if (isNaN(h) || isNaN(a)) return null;
    if (h > a) return homeTeam;
    if (a > h) return awayTeam;
    return null; // empate = sin ganador determinado
  };

  const resolveKnockoutLoser = (matchNum: number): TeamSlot => {
    const score = knockoutScores[matchNum];
    const allMatches = [...SEMIFINALS];
    const matchDef = allMatches.find(m => m.match === matchNum);
    if (!matchDef) return null;

    const homeTeam = resolveSlot(matchDef.home);
    const awayTeam = resolveSlot(matchDef.away);

    if (!score || score.home.trim() === '' || score.away.trim() === '') return null;
    const h = parseInt(score.home, 10), a = parseInt(score.away, 10);
    if (isNaN(h) || isNaN(a)) return null;
    if (h > a) return awayTeam;
    if (a > h) return homeTeam;
    return null;
  };

  // ---------- CHECKS ----------
  const groupStageComplete = useMemo(() => {
    const groupMatches = matches.filter(m => m.season?.slug === 'group-stage');
    return groupMatches.every(m => {
      if (m.status?.type?.state === 'post' || m.status?.type?.state === 'in') return true;
      const s = simScores[m.id];
      return s && s.home.trim() !== '' && s.away.trim() !== '';
    });
  }, [matches, simScores]);

  const matchesByGroup = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    matches.filter(m => m.season?.slug === 'group-stage').forEach(m => {
      const comp = m.competitions[0];
      const home = comp.competitors.find((c: any) => c.homeAway === 'home');
      if (home) {
        const gn = teamToGroupMap[home.team.id] || 'Unknown';
        if (!grouped[gn]) grouped[gn] = [];
        grouped[gn].push(m);
      }
    });
    return grouped;
  }, [matches, teamToGroupMap]);

  // ---------- ESTILOS REUTILIZABLES ----------
  const cardStyle: React.CSSProperties = { background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' };

  const renderKnockoutMatch = (matchDef: { match: number; home: string; away: string }, label?: string, reverse?: boolean) => {
    const homeTeam = resolveSlot(matchDef.home);
    const awayTeam = resolveSlot(matchDef.away);
    const score = knockoutScores[matchDef.match];
    const isReady = homeTeam && awayTeam;

    const isFinished = score && score.home.trim() !== '' && score.away.trim() !== '';
    const hNum = isFinished ? parseInt(score.home, 10) : -1;
    const aNum = isFinished ? parseInt(score.away, 10) : -1;
    const isHomeWinner = isFinished && hNum > aNum;
    const isAwayWinner = isFinished && aNum > hNum;

    return (
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', minWidth: '190px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: reverse ? 'row-reverse' : 'row', alignItems: 'center', background: 'var(--bg-color)', padding: '5px 12px', borderBottom: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)' }}>M{matchDef.match}</span>
          {label && <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>{label}</span>}
        </div>
        {[
          { team: homeTeam, slotKey: matchDef.home, scoreKey: 'home' as const, isWinner: isHomeWinner },
          { team: awayTeam, slotKey: matchDef.away, scoreKey: 'away' as const, isWinner: isAwayWinner }
        ].map(({ team, slotKey, scoreKey, isWinner }) => (
          <div key={scoreKey} style={{ display: 'flex', flexDirection: reverse ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: scoreKey === 'home' ? '1px solid var(--border-light)' : 'none', background: isWinner ? 'rgba(14, 165, 233, 0.06)' : 'transparent', transition: 'background-color 0.2s ease' }}>
            <div style={{ display: 'flex', flexDirection: reverse ? 'row-reverse' : 'row', alignItems: 'center', gap: '8px', flex: 1 }}>
              {team?.logo && <img src={team.logo} alt="" style={{ width: '20px' }} />}
              <span style={{ fontWeight: isWinner ? 750 : 600, fontSize: '0.85rem', color: team ? 'var(--text-primary)' : 'var(--text-secondary)', fontStyle: team ? 'normal' : 'italic', textAlign: reverse ? 'right' : 'left' }}>
                {team ? (team.abbr || team.name) : slotKey}
              </span>
            </div>

            {isReady && (
              <input
                type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                style={{ width: '34px', padding: '4px', textAlign: 'center', fontWeight: 700, border: '1.5px solid var(--accent-primary)', borderRadius: '4px', outline: 'none', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', fontFamily: 'inherit', fontSize: '0.9rem', marginLeft: reverse ? '0' : '10px', marginRight: reverse ? '10px' : '0' }}
                value={score?.[scoreKey] ?? ''}
                onChange={(e) => handleKnockoutChange(matchDef.match, scoreKey, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>{title}</h3>
      {subtitle && <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{subtitle}</p>}
    </div>
  );

  // ---------- RENDER ----------
  return (
    <div className="simulator-container">
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '10px' }}>Simulador de Torneo</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '620px', margin: '0 auto', lineHeight: '1.6' }}>
          Completa los resultados de la fase de grupos para desbloquear las llaves eliminatorias. Los partidos ya jugados están bloqueados.
        </p>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={fillRandom}
            style={{
              background: 'transparent',
              border: '2px solid var(--accent-cyan)',
              color: 'var(--accent-cyan)',
              padding: '10px 24px',
              borderRadius: '99px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--accent-cyan-light)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Shuffle size={16} />
            Llenar Fase de Grupos Aleatoriamente
          </button>

          <button
            onClick={resetSimulator}
            style={{
              background: 'transparent',
              border: '2px solid #ef4444',
              color: '#ef4444',
              padding: '10px 24px',
              borderRadius: '99px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#fef2f2';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Limpiar Simulador
          </button>
        </div>
      </div>

      {/* ===== FASE DE GRUPOS ===== */}
      <div style={{ marginBottom: '60px' }}>
        <SectionTitle title="Fase de Grupos" subtitle="Rellena los marcadores de los partidos pendientes" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
          {simulatedStandings.map(group => {
            const groupMatchesList = matchesByGroup[group.name] || [];
            const isExpanded = expandedGroups[group.name] || false;

            return (
              <div key={group.name} style={{ ...cardStyle, alignSelf: 'start' }}>
                <div style={{ background: 'var(--accent-cyan-light)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{group.name}</h3>
                </div>

                <table className="standings-table" style={{ background: 'var(--card-bg)' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px', fontSize: '0.7rem' }}></th>
                      <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.7rem' }}>EQUIPO</th>
                      <th style={{ padding: '8px', fontSize: '0.7rem' }}>PJ</th>
                      <th style={{ padding: '8px', fontSize: '0.7rem' }}>DG</th>
                      <th style={{ padding: '8px', fontSize: '0.7rem' }}>PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.entries.map((team: any, idx: number) => {
                      const isBestThird = idx === 2 && bestThirds.some(t => t.id === team.id);
                      return (
                        <tr key={team.id} style={{ background: idx < 2 ? 'rgba(14,165,233,0.06)' : 'transparent', borderLeft: idx < 2 ? '3px solid var(--accent-cyan)' : isBestThird ? '3px solid #7dd3fc' : '3px solid transparent' }}>
                          <td style={{ padding: '8px', fontWeight: 600, color: 'var(--text-secondary)', width: '28px' }}>{idx + 1}</td>
                          <td className="team-cell" style={{ padding: '8px' }}>
                            <img src={team.logo} alt="" style={{ width: '16px' }} />
                            <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{team.name}</span>
                            {isBestThird && <span style={{ fontSize: '0.62rem', background: '#e0f2fe', color: 'var(--accent-cyan)', padding: '1px 5px', borderRadius: '99px', fontWeight: 700 }}>3°✓</span>}
                          </td>
                          <td style={{ padding: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{team.pj}</td>
                          <td style={{ padding: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{team.gf - team.gc > 0 ? `+${team.gf - team.gc}` : team.gf - team.gc}</td>
                          <td style={{ padding: '8px', fontWeight: 800 }}>{team.pts}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ borderTop: '1px solid var(--border-light)' }}>
                  <button
                    onClick={() => toggleGroup(group.name)}
                    style={{ width: '100%', padding: '11px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    <span>Partidos del grupo</span>
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '14px', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {groupMatchesList.map(m => {
                        const comp = m.competitions[0];
                        const home = comp.competitors.find((c: any) => c.homeAway === 'home');
                        const away = comp.competitors.find((c: any) => c.homeAway === 'away');
                        const isPlayed = m.status.type.state === 'post' || m.status.type.state === 'in';

                        const groupLetter = group.name.replace('Group ', '');
                        return (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                              <span style={{ fontSize: '0.62rem', background: '#e8f5e9', color: '#2e7d32', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                                G-{groupLetter}
                              </span>
                              <img src={home?.team.logo} alt="" style={{ width: '18px' }} />
                              <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{home?.team.abbreviation}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 10px' }}>
                              {isPlayed ? (
                                <>
                                  <span style={{ background: '#f1f5f9', padding: '3px 9px', borderRadius: '4px', fontWeight: 800 }}>{home?.score}</span>
                                  <Lock size={11} color="#94a3b8" />
                                  <span style={{ background: '#f1f5f9', padding: '3px 9px', borderRadius: '4px', fontWeight: 800 }}>{away?.score}</span>
                                </>
                              ) : (
                                <>
                                  <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                                    style={{ width: '36px', padding: '5px', textAlign: 'center', fontWeight: 700, border: '1.5px solid var(--accent-primary)', borderRadius: '5px', outline: 'none', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', fontFamily: 'inherit' }}
                                    value={simScores[m.id]?.home ?? ''}
                                    onChange={(e) => handleScoreChange(m.id, 'home', e.target.value)} />
                                  <Edit3 size={11} color="var(--accent-primary)" />
                                  <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                                    style={{ width: '36px', padding: '5px', textAlign: 'center', fontWeight: 700, border: '1.5px solid var(--accent-primary)', borderRadius: '5px', outline: 'none', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', fontFamily: 'inherit' }}
                                    value={simScores[m.id]?.away ?? ''}
                                    onChange={(e) => handleScoreChange(m.id, 'away', e.target.value)} />
                                </>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{away?.team.abbreviation}</span>
                              <img src={away?.team.logo} alt="" style={{ width: '18px' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== MEJORES TERCEROS ===== */}
      <div style={{ marginBottom: '60px' }}>
        <SectionTitle title="Mejores 8 Terceros que Clasifican" subtitle="De 12 grupos, los 8 mejores terceros pasan a 16avos" />
        <div style={cardStyle}>
          <table className="standings-table">
            <thead>
              <tr>
                <th style={{ padding: '10px', fontSize: '0.75rem' }}></th>
                <th style={{ textAlign: 'left', padding: '10px', fontSize: '0.75rem' }}>EQUIPO</th>
                <th style={{ padding: '10px', fontSize: '0.75rem' }}>GRUPO</th>
                <th style={{ padding: '10px', fontSize: '0.75rem' }}>PJ</th>
                <th style={{ padding: '10px', fontSize: '0.75rem' }}>GF</th>
                <th style={{ padding: '10px', fontSize: '0.75rem' }}>DG</th>
                <th style={{ padding: '10px', fontWeight: 800, fontSize: '0.75rem' }}>PTS</th>
              </tr>
            </thead>
            <tbody>
              {bestThirds.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Completa los resultados para ver los mejores terceros.</td></tr>
              ) : bestThirds.map((t: any, idx: number) => (
                <tr key={t.id} style={{ borderLeft: '3px solid #7dd3fc', background: 'rgba(14,165,233,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                  <td className="team-cell" style={{ padding: '10px' }}><img src={t.logo} alt="" style={{ width: '18px' }} /><span style={{ fontWeight: 700 }}>{t.name}</span></td>
                  <td style={{ padding: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Grupo {t.group}</td>
                  <td style={{ padding: '10px', fontSize: '0.85rem' }}>{t.pj}</td>
                  <td style={{ padding: '10px', fontSize: '0.85rem' }}>{t.gf}</td>
                  <td style={{ padding: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.gf - t.gc > 0 ? `+${t.gf - t.gc}` : t.gf - t.gc}</td>
                  <td style={{ padding: '10px', fontWeight: 800 }}>{t.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== LLAVES ELIMINATORIAS ===== */}
      {!groupStageComplete && (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--card-bg)', border: '1px dashed #cbd5e1', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔒</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Llaves bloqueadas</div>
          <div style={{ fontSize: '0.95rem' }}>Completa todos los marcadores de la fase de grupos para generar las llaves eliminatorias.</div>
        </div>
      )}

      {groupStageComplete && (() => {
        const getMatchByNum = (matchNum: number) => {
          const all = [...ROUND_OF_32, ...ROUND_OF_16, ...QUARTERFINALS, ...SEMIFINALS, ...FINAL, ...THIRD];
          return all.find(m => m.match === matchNum)!;
        };

        const leftR32 = [75, 78, 73, 76, 83, 84, 81, 82].map(getMatchByNum);
        const leftR16 = [89, 90, 93, 94].map(getMatchByNum);
        const leftQF = [97, 98].map(getMatchByNum);
        const leftSF = [101].map(getMatchByNum);

        const rightSF = [102].map(getMatchByNum);
        const rightQF = [99, 100].map(getMatchByNum);
        const rightR16 = [91, 92, 95, 96].map(getMatchByNum);
        const rightR32 = [74, 77, 79, 80, 86, 87, 85, 88].map(getMatchByNum);

        const Col = ({ title, flexWeight, matches, rightAligned }: { title: string, flexWeight: number, matches: any[], rightAligned?: boolean }) => (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '190px' }}>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--border-light)', paddingBottom: '8px', marginBottom: '16px' }}>{title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {matches.map(m => (
                <div key={m.match} style={{ flex: flexWeight, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 0' }}>
                  {renderKnockoutMatch(m, undefined, rightAligned)}
                </div>
              ))}
            </div>
          </div>
        );

        return (
          <div style={{ marginTop: '40px' }}>
            <SectionTitle title="Fase Eliminatoria Simulada" subtitle="Visualiza el camino completo del torneo hacia el trofeo. Desplázate horizontalmente para ver todas las llaves." />
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-start',
              alignItems: 'stretch',
              gap: '15px', 
              overflowX: 'auto', 
              padding: '30px 20px', 
              background: 'var(--card-bg)', 
              border: '1px solid var(--border-light)', 
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              minHeight: '1100px'
            }}>
              {/* LADO IZQUIERDO */}
              <div style={{ display: 'flex', gap: '15px' }}>
                <Col title="16avos" flexWeight={1} matches={leftR32} />
                <Col title="Octavos" flexWeight={2} matches={leftR16} />
                <Col title="Cuartos" flexWeight={4} matches={leftQF} />
                <Col title="Semis" flexWeight={8} matches={leftSF} />
              </div>

              {/* CENTRO: FINAL Y TERCER PUESTO */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '60px', minWidth: '220px', margin: '0 10px' }}>
                <div>
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--accent-primary)', paddingBottom: '8px', marginBottom: '16px' }}>
                    🏆 Gran Final
                  </div>
                  {FINAL.map(m => <div key={m.match}>{renderKnockoutMatch(m, 'Final')}</div>)}
                </div>
                
                <div>
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--border-light)', paddingBottom: '8px', marginBottom: '16px' }}>
                    Tercer Puesto
                  </div>
                  {THIRD.map(m => <div key={m.match}>{renderKnockoutMatch(m, '3° Lugar')}</div>)}
                </div>
              </div>

              {/* LADO DERECHO */}
              <div style={{ display: 'flex', gap: '15px' }}>
                <Col title="Semis" flexWeight={8} matches={rightSF} rightAligned />
                <Col title="Cuartos" flexWeight={4} matches={rightQF} rightAligned />
                <Col title="Octavos" flexWeight={2} matches={rightR16} rightAligned />
                <Col title="16avos" flexWeight={1} matches={rightR32} rightAligned />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
