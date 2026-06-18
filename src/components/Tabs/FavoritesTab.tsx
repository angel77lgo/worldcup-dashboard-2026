import { useState, useMemo } from 'react';
import type { MatchEvent } from '../../types';
import { SoccerBallIcon } from './SoccerBallIcon';

interface FavoritesTabProps {
  matches: MatchEvent[];
  favorites: string[];
  toggleFavorite: (id: string) => void;
  loading: boolean;
}

export function FavoritesTab({ matches, favorites, toggleFavorite, loading }: FavoritesTabProps) {
  const [filter, setFilter] = useState<'todos' | 'anteriores' | 'envivo' | 'proximos'>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  const favoriteMatches = useMemo(() => {
    return matches.filter(m => favorites.includes(m.id));
  }, [matches, favorites]);

  const filteredMatches = useMemo(() => {
    let filtered = favoriteMatches;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => {
        const c = m.competitions[0];
        if (!c) return false;
        const home = c.competitors.find(comp => comp.homeAway === 'home')?.team.displayName.toLowerCase() || '';
        const away = c.competitors.find(comp => comp.homeAway === 'away')?.team.displayName.toLowerCase() || '';
        return home.includes(q) || away.includes(q);
      });
    }

    if (filter === 'anteriores') return filtered.filter(m => m.status.type.state === 'post');
    if (filter === 'envivo') return filtered.filter(m => m.status.type.state === 'in');
    if (filter === 'proximos') return filtered.filter(m => m.status.type.state === 'pre');

    return filtered;
  }, [favoriteMatches, searchQuery, filter]);

  const getMatchVenue = (comp: any): { name: string; state: string } | null => {
    if (!comp?.venue?.fullName) return null;
    const city = comp.venue.address?.city || '';
    const parts = city.split(',').map((s: string) => s.trim());
    return { name: comp.venue.fullName, state: parts.length > 1 ? parts[1] : '' };
  };

  return (
    <>
      <section className="hero-section" style={{ padding: '30px 20px', minHeight: 'auto' }}>
        <div className="hero-title" style={{ background: 'var(--glass-bg)', color: 'var(--text-primary)', marginBottom: 0 }}>
          ⚽ Mis Encuentros Favoritos
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.95rem' }}>
          Sigue de cerca los partidos que has marcado como favoritos. Recibirás actualizaciones en tiempo real y podrás acceder a ellos rápidamente.
        </p>
      </section>

      <div className="controls-bar">
        <div className="sub-filters">
          <button className={`sub-filter-btn ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')}>
            Todos ({favoriteMatches.length})
          </button>
          <button className={`sub-filter-btn ${filter === 'anteriores' ? 'active' : ''}`} onClick={() => setFilter('anteriores')}>
            Anteriores
          </button>
          <button className={`sub-filter-btn ${filter === 'envivo' ? 'active' : ''}`} onClick={() => setFilter('envivo')}>
            En Vivo
          </button>
          <button className={`sub-filter-btn ${filter === 'proximos' ? 'active' : ''}`} onClick={() => setFilter('proximos')}>
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

      <div className="partidos-container" style={{ marginTop: '20px' }}>
        {loading ? (
          <div className="loader">Cargando encuentros...</div>
        ) : filteredMatches.length > 0 ? (
          <div className="matches-grid">
            {filteredMatches.map(m => {
              const comp = m.competitions[0];
              const home = comp?.competitors.find(c => c.homeAway === 'home');
              const away = comp?.competitors.find(c => c.homeAway === 'away');
              const isLive = m.status.type.state === 'in';
              return (
                <div key={m.id} className={`match-card ${isLive ? 'is-live' : ''}`}>
                  <div className="match-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{new Date(m.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                      <SoccerBallIcon active={true} onClick={(e) => { e.stopPropagation(); toggleFavorite(m.id); }} size={16} />
                    </span>
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
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '60px 20px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚽</div>
            <h3>No se encontraron encuentros favoritos</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '400px', margin: '8px auto 0' }}>
              {favoriteMatches.length === 0 
                ? 'Agrega encuentros a tus favoritos haciendo clic en el icono del balón en la sección de Partidos.'
                : 'Intenta cambiar los filtros o el texto de búsqueda.'}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
