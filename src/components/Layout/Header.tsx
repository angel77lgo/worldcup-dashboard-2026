import { RefreshCw, Sun, Moon } from 'lucide-react';
import type { TabType } from '../../hooks/useRouting';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  isRefreshing: boolean;
  fetchData: () => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function Header({ darkMode, setDarkMode, isRefreshing, fetchData, activeTab, onTabChange }: HeaderProps) {
  return (
    <>
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

      <nav className="controls-bar">
        <div className="tabs">
          <button className={`tab ${activeTab === 'partidos' ? 'active' : ''}`} onClick={() => onTabChange('partidos')}>Partidos</button>
          <button className={`tab ${activeTab === 'grupos' ? 'active' : ''}`} onClick={() => onTabChange('grupos')}>Grupos</button>
          <button className={`tab ${activeTab === 'eliminatorias' ? 'active' : ''}`} onClick={() => onTabChange('eliminatorias')}>Eliminatorias</button>
          <button className={`tab ${activeTab === 'estadisticas' ? 'active' : ''}`} onClick={() => onTabChange('estadisticas')}>Equipos</button>
          <button className={`tab ${activeTab === 'simulador' ? 'active' : ''}`} onClick={() => onTabChange('simulador')}>Simulador</button>
        </div>
      </nav>
    </>
  );
}
