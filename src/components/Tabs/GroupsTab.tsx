import type { GroupStanding } from '../../types';
import { getStat } from '../../hooks/useWorldCupData';

interface GroupsTabProps {
  standings: GroupStanding[];
  bestThirdsReal: Set<string>;
}

export function GroupsTab({ standings, bestThirdsReal }: GroupsTabProps) {
  return (
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
  );
}
