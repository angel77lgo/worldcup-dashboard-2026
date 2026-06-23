import type { GroupStanding, StandingEntry } from '../../types';
import { getStat } from '../../hooks/useWorldCupData';

interface GroupsTabProps {
  standings: GroupStanding[];
  bestThirdsReal: Set<string>;
  loading?: boolean;
}

function isEliminated(
  entry: StandingEntry,
  entries: StandingEntry[],
  standings: GroupStanding[]
): boolean {
  const points = getStat(entry, 'points');
  const gamesPlayed = getStat(entry, 'gamesPlayed');
  const maxPts = points + (3 - gamesPlayed) * 3;

  if (entries.length >= 2) {
    const secondPts = getStat(entries[1], 'points');
    if (maxPts >= secondPts) return false;
  }

  const ourGroup = standings.find(g =>
    g.entries.some(e => e.team.id === entry.team.id)
  );
  if (!ourGroup || ourGroup.entries.length < 3) return true;

  const allThirds: Array<{ groupName: string; points: number; id: string }> = [];
  for (const group of standings) {
    if (group.entries.length >= 3) {
      allThirds.push({
        groupName: group.name,
        points: getStat(group.entries[2], 'points'),
        id: group.entries[2].team.id,
      });
    }
  }

  const simulated = allThirds
    .filter(t => t.groupName !== ourGroup.name)
    .concat([{ groupName: ourGroup.name, points: maxPts, id: entry.team.id }]);

  simulated.sort((a, b) => b.points - a.points);

  const ourIdx = simulated.findIndex(t => t.id === entry.team.id);
  return ourIdx >= 8;
}

export function GroupsTab({ standings, bestThirdsReal, loading }: GroupsTabProps) {
  if (loading) {
    return <div className="loader">Cargando grupos...</div>;
  }

  return (
    <div className="standings-grid">
      {standings.map(group => (
        <div key={group.name} className="group-card">
          <div className="group-header">{group.name}</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="standings-table">
              <thead>
                <tr>
                  <th>POS</th>
                  <th style={{ textAlign: 'left' }}>EQUIPO</th>
                  <th>PJ</th>
                  <th>G</th>
                  <th>E</th>
                  <th>P</th>
                  <th>DG</th>
                  <th>PTS</th>
                </tr>
              </thead>
              <tbody>
                {group.entries.map((entry, idx) => {
                  const isTop2 = idx < 2;
                  const isBestThird = idx === 2 && bestThirdsReal.has(entry.team.id);
                  const eliminated = !isTop2 && !isBestThird && isEliminated(entry, group.entries, standings);
                  const rowClass = eliminated
                    ? 'eliminated'
                    : isTop2
                      ? 'qualified-top2'
                      : isBestThird
                        ? 'qualified-third'
                        : '';
                  return (
                    <tr key={entry.team.id} className={rowClass}>
                      <td>{idx + 1}</td>
                      <td className="team-cell" style={{ whiteSpace: 'nowrap' }}>
                        <img src={entry.team.logos?.[0]?.href || ''} alt="" style={{ width: '16px', opacity: eliminated ? 0.4 : 1 }} />
                        <span style={{
                          fontWeight: (isTop2 || isBestThird) ? 600 : 400,
                          ...(eliminated ? { textDecoration: 'line-through', opacity: 0.5 } : {})
                        }}>
                          {entry.team.displayName}
                        </span>
                        {isBestThird && (
                          <span className="third-place-badge">3°✓</span>
                        )}
                        {eliminated && (
                          <span className="eliminated-badge">ELIM</span>
                        )}
                      </td>
                      <td>{getStat(entry, 'gamesPlayed')}</td>
                      <td>{getStat(entry, 'wins') || 0}</td>
                      <td>{getStat(entry, 'ties') || 0}</td>
                      <td>{getStat(entry, 'losses') || 0}</td>
                      <td>{getStat(entry, 'pointDifferential')}</td>
                      <td style={{ fontWeight: 700 }}>{getStat(entry, 'points')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
