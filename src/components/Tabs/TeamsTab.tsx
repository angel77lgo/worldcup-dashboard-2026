import React, { useState } from 'react';
import { GroupStanding } from '../../types';
import { getStat } from '../../hooks/useWorldCupData';

interface TeamsTabProps {
  standings: GroupStanding[];
}

export function TeamsTab({ standings }: TeamsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const teamMap: Record<string, { logo: string; pts: number }> = {};
  standings.forEach(g => g.entries.forEach(e => {
    teamMap[e.team.displayName] = {
      logo: e.team.logos?.[0]?.href || '',
      pts: getStat(e, 'points')
    };
  }));

  const filteredTeams = Object.entries(teamMap)
    .filter(([name]) => name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b[1].pts - a[1].pts);

  return (
    <>
      <div className="controls-bar" style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar equipo..."
          className="input-flat search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'block' }}
        />
      </div>
      <div className="stats-grid">
        {filteredTeams.map(([name, data]) => (
          <div key={name} className="stat-item">
            <img src={data.logo} alt="" style={{ width: '32px', marginBottom: '10px' }} />
            <div className="stat-label">{name}</div>
            <div className="stat-value">{data.pts} PTS</div>
          </div>
        ))}
        {filteredTeams.length === 0 && (
          <div className="empty-state">No se encontraron equipos.</div>
        )}
      </div>
    </>
  );
}
