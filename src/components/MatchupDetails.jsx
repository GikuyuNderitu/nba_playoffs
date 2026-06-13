import React from 'react';

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

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          className="btn" 
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '10px', 
                            borderColor: g.status === 'watched' ? 'var(--neon-gold)' : 'var(--border-color)',
                            background: g.status === 'watched' ? 'rgba(255, 184, 0, 0.1)' : 'transparent',
                            color: g.status === 'watched' ? 'var(--neon-gold)' : 'var(--text-secondary)'
                          }}
                          onClick={() => onToggleProgress(g.id, g.status === 'watched' ? 'unwatched' : 'watched')}
                        >
                          👁 Watched
                        </button>
                        
                        <button 
                          className="btn" 
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '10px', 
                            borderColor: g.status === 'skipped' ? 'var(--neon-purple)' : 'var(--border-color)',
                            background: g.status === 'skipped' ? 'rgba(157, 78, 221, 0.1)' : 'transparent',
                            color: g.status === 'skipped' ? 'var(--neon-purple)' : 'var(--text-secondary)'
                          }}
                          onClick={() => onToggleProgress(g.id, g.status === 'skipped' ? 'unwatched' : 'skipped')}
                        >
                          ⏭ Skip
                        </button>
                      </div>
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
