import React from 'react';
import SkipControl from './SkipControl';

export default function MatchupDetails({ matchup, onClose, onPlayGame, onToggleProgress }) {
  const { contenderA, contenderB, stageName, games = [] } = matchup;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="badge badge-muted" style={{ marginBottom: '6px' }}>{stageName}</span>
            <h2>{contenderA} vs {contenderB}</h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close details">&times;</button>
        </div>

        <div className="modal-body">
          <div className="games-list">
            {games.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '20px 0' }}>
                No games available or matchup is locked.
              </p>
            ) : (
              games.map((g) => {
                return (
                  <div key={g.id} className={`game-row ${g.status} fade-in`}>
                    <div className="game-info">
                      <span className="game-number-label">Game {g.game_number}</span>
                      <h4 className="game-title">{g.title}</h4>
                      <div className="game-meta">
                        <span>{g.duration}</span>
                        <span>
                          {new Date(g.date).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="game-actions">
                      <button 
                        className={`play-btn-circle ${g.status === 'watched' ? 'watched' : ''}`}
                        onClick={() => onPlayGame(g)}
                        title="Watch Game Highlights"
                      >
                        ▶
                      </button>

                      <SkipControl 
                        status={g.status}
                        onChange={(newStatus) => onToggleProgress(g.id, newStatus)}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
