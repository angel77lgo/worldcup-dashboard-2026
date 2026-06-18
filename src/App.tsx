import { useState, useEffect } from 'react';
import { useWorldCupData } from './hooks/useWorldCupData';
import { useTheme } from './hooks/useTheme';
import { useRouting } from './hooks/useRouting';
import { Header } from './components/Layout/Header';
import { MatchesTab } from './components/Tabs/MatchesTab';
import { GroupsTab } from './components/Tabs/GroupsTab';
import { KnockoutsTab } from './components/Tabs/KnockoutsTab';
import { TeamsTab } from './components/Tabs/TeamsTab';
import { FavoritesTab } from './components/Tabs/FavoritesTab';
import Simulator from './Simulator';

function App() {
  const { 
    matches, 
    standings, 
    loading, 
    isRefreshing, 
    fetchData,
    bestThirdsReal,
    resolveRealSlot
  } = useWorldCupData();
  
  const { darkMode, setDarkMode } = useTheme();
  const { activeTab, handleTabChange } = useRouting();

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('worldcup_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('worldcup_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (matchId: string) => {
    setFavorites(prev => 
      prev.includes(matchId) 
        ? prev.filter(id => id !== matchId) 
        : [...prev, matchId]
    );
  };

  return (
    <div>
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        isRefreshing={isRefreshing} 
        fetchData={fetchData}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {activeTab === 'partidos' && (
        <MatchesTab matches={matches} loading={loading} favorites={favorites} toggleFavorite={toggleFavorite} />
      )}

      {activeTab === 'favoritos' && (
        <FavoritesTab matches={matches} loading={loading} favorites={favorites} toggleFavorite={toggleFavorite} />
      )}

      {activeTab === 'grupos' && (
        <GroupsTab standings={standings} bestThirdsReal={bestThirdsReal} />
      )}

      {activeTab === 'eliminatorias' && (
        <KnockoutsTab matches={matches} resolveRealSlot={resolveRealSlot} />
      )}

      {activeTab === 'estadisticas' && (
        <TeamsTab standings={standings} />
      )}

      {activeTab === 'simulador' && (
        <Simulator matches={matches} initialStandings={standings} />
      )}
    </div>
  );
}

export default App;
