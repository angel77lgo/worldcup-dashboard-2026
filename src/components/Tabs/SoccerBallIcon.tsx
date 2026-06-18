import React from 'react';

interface SoccerBallIconProps {
  active?: boolean;
  size?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function SoccerBallIcon({ active = false, size = 18, className = '', onClick }: SoccerBallIconProps) {
  return (
    <button
      onClick={onClick}
      className={`soccer-ball-fav-btn ${active ? 'active' : ''} ${className}`}
      style={{
        background: 'none',
        border: 'none',
        padding: '6px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        transition: 'all 0.2s ease',
        color: active ? '#f59e0b' : '#94a3b8',
      }}
      title={active ? "Quitar de favoritos" : "Agregar a favoritos"}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        stroke="currentColor"
        strokeWidth="1.8"
        fill={active ? 'currentColor' : 'none'}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        <circle cx="12" cy="12" r="10" />
        <polygon 
          points="12,9 14.85,11.07 13.76,14.43 10.24,14.43 9.15,11.07" 
          fill={active ? 'rgba(0, 0, 0, 0.15)' : 'none'} 
        />
        <line x1="12" y1="9" x2="12" y2="2" />
        <line x1="14.85" y1="11.07" x2="21.5" y2="8.8" />
        <line x1="13.76" y1="14.43" x2="18.1" y2="21" />
        <line x1="10.24" y1="14.43" x2="5.9" y2="21" />
        <line x1="9.15" y1="11.07" x2="2.5" y2="8.8" />
      </svg>
    </button>
  );
}
