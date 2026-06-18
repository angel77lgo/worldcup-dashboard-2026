import { useState, useEffect } from 'react';

export type TabType = 'partidos' | 'grupos' | 'eliminatorias' | 'estadisticas' | 'simulador';

const getInitialTab = (): TabType => {
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

export function useRouting() {
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    let hash = '';
    if (tab === 'simulador') hash = '#/simulator';
    else if (tab === 'grupos') hash = '#/grupos';
    else if (tab === 'eliminatorias') hash = '#/eliminatorias';
    else if (tab === 'estadisticas') hash = '#/equipos';
    window.location.hash = hash;
  };

  useEffect(() => {
    const handleNavigation = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);

    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  return { activeTab, handleTabChange };
}
