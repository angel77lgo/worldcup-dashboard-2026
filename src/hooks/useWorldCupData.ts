import { useState, useEffect, useMemo } from 'react';
import type { MatchEvent, GroupStanding, StandingEntry } from '../types';

export const getStat = (entry: StandingEntry, statName: string): number => {
  const found = entry.stats.find(s => s.name === statName || s.type === statName);
  return found ? found.value : 0;
};

const sortEspnEntries = (a: any, b: any) => {
  const getVal = (entry: any, name: string) => entry.stats.find((s: any) => s.name === name || s.type === name)?.value || 0;
  return (getVal(b, 'points') - getVal(a, 'points')) || 
         (getVal(b, 'pointDifferential') - getVal(a, 'pointDifferential')) || 
         (getVal(b, 'pointsFor') - getVal(a, 'pointsFor')) || 0;
};

export function useWorldCupData() {
  const [matches, setMatches] = useState<MatchEvent[]>([]);
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    setError(null);

    try {
      let hasError = false;

      const scoreboardUrl = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=150';
      const matchesRes = await fetch(scoreboardUrl);
      if (matchesRes.ok) {
        const matchesData = await matchesRes.json();
        const events: MatchEvent[] = matchesData.events || [];
        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setMatches(events);
      } else {
        hasError = true;
      }

      const standingsUrl = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';
      const standingsRes = await fetch(standingsUrl);
      if (standingsRes.ok) {
        const standingsData = await standingsRes.json();
        if (standingsData.children) {
          setStandings(standingsData.children.map((child: any) => {
            const entries = child.standings?.entries || [];

            entries.sort(sortEspnEntries);

            return {
              name: child.name,
              abbreviation: child.abbreviation,
              entries: entries
            };
          }));
        }
      } else {
        hasError = true;
      }

      if (hasError) {
        setError('No se pudieron cargar los datos. Verifica tu conexión.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión. Reintentando en 60 segundos...');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60000);

    return () => clearInterval(interval);
  }, []);

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

    thirds.sort(sortEspnEntries);

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
      '3rd(ABCDF)', '3rd(CDFGH)', '3rd(CEFHI)', '3rd(EHIJK)',
      '3rd(BEFIJ)', '3rd(AEHIJ)', '3rd(EFGIJ)', '3rd(DEIJL)'
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

  return { 
    matches, 
    standings, 
    loading, 
    isRefreshing, 
    error,
    fetchData,
    bestThirdsRealList,
    bestThirdsReal,
    groupTopTeamsReal,
    resolveRealSlot
  };
}
