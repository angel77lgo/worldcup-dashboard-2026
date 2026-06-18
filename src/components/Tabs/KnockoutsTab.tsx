import React from 'react';
import { MatchEvent } from '../../types';
import { 
  ROUND_OF_32, R32_ORDER, R16_ORDER, QF_ORDER, SF_ORDER 
} from '../../utils/constants';
import { parsePlaceholderToSlot } from '../../utils/helpers';

interface KnockoutsTabProps {
  matches: MatchEvent[];
  resolveRealSlot: (slot: string) => any;
}

export function KnockoutsTab({ matches, resolveRealSlot }: KnockoutsTabProps) {
  const getMatchBySlug = (slug: string) => matches.filter(m => m.season.slug === slug);

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
          '3,6': 89, '1,4': 90, '2,5': 91, '7,8': 92,
          '11,12': 93, '9,10': 94, '14,15': 95, '13,16': 96
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
          '1,2': 97, '5,6': 98, '3,4': 99, '7,8': 100
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
          '1,2': 101, '3,4': 102
        };
        if (mapping[key]) return mapping[key];
      }
    }

    if (m.season.slug === '3rd-place-match') return 103;
    if (m.season.slug === 'final') return 104;
    return 0;
  };

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

  const BracketCard = ({ matchNum, homeTeam, awayTeam, homeScore, awayScore, homeWin, awayWin, state, liveDetail }: any) => {
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
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '5px 12px', background: 'rgba(0,0,0,0.04)', borderBottom: '1px solid var(--border-light)',
          fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
          <span>M{matchNum}</span>
          {isLive && <span style={{ color: '#ef4444', fontWeight: 800 }}>🔴 {liveDetail}</span>}
          {isPost && <span>Final</span>}
        </div>
        {[
          { team: homeTeam, score: homeScore, win: homeWin },
          { team: awayTeam, score: awayScore, win: awayWin }
        ].map((row, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 12px', borderTop: i === 1 ? '1px solid var(--border-light)' : 'none',
            background: row.win ? 'rgba(14, 165, 233, 0.05)' : 'transparent',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', overflow: 'hidden' }}>
              {row.team?.logo ? (
                <img src={row.team.logo} alt="" style={{ width: '18px', height: 'auto', flexShrink: 0 }} />
              ) : (
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>🏳️</span>
              )}
              <span style={{
                fontSize: '0.82rem', fontWeight: row.win ? 700 : 400, color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {row.team?.name || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Por clasificar</span>}
              </span>
            </div>
            {(isLive || isPost) && (
              <span style={{
                fontWeight: 800, fontSize: '0.9rem', color: row.win ? 'var(--accent-primary)' : 'var(--text-secondary)',
                marginLeft: '6px', flexShrink: 0
              }}>
                {row.score ?? '-'}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const RoundColumn = ({ title, flexWeight = 1, children }: any) => (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '210px' }}>
      <div style={{
        textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid var(--border-light)',
        paddingBottom: '8px', marginBottom: '16px'
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
        key={matchDef.match} matchNum={matchDef.match}
        homeTeam={homeDisplay} awayTeam={awayDisplay}
        homeScore={home?.score} awayScore={away?.score}
        homeWin={home?.winner} awayWin={away?.winner}
        state={state} liveDetail={espnMatch?.status.type.shortDetail}
      />
    );
  });

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
          key={m.id} matchNum={matchNum}
          homeTeam={home ? { name: home.team.displayName, logo: home.team.logo } : null}
          awayTeam={away ? { name: away.team.displayName, logo: away.team.logo } : null}
          homeScore={home?.score} awayScore={away?.score}
          homeWin={home?.winner} awayWin={away?.winner}
          state={state} liveDetail={m.status.type.shortDetail}
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
        display: 'flex', gap: '32px', minWidth: 'max-content', background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', padding: '28px 24px',
        minHeight: '900px', alignItems: 'stretch'
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', justifyContent: 'center', marginLeft: '20px' }}>
          <div>
            <div style={{
              textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)',
              textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '8px', marginBottom: '16px'
            }}>🏆 Gran Final</div>
            {buildRoundCards('final', [104])}
          </div>
          <div>
            <div style={{
              textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--border-light)',
              paddingBottom: '8px', marginBottom: '16px'
            }}>Tercer Puesto</div>
            {buildRoundCards('3rd-place-match', [103])}
          </div>
        </div>
      </div>
    </div>
  );
}
