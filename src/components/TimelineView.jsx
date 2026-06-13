import React from 'react';
import SkipControl from './SkipControl';

export default function TimelineView({ games = [], onPlayGame, onToggleProgress }) {
  if (games.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          No games are currently unlocked on the timeline.
        </p>
      </div>
    );
  }

  // Helper to format date
  const formatDateHeader = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Group games by date string
  const groupedGames = games.reduce((groups, game) => {
    const dateKey = new Date(game.date).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(game);
    return groups;
  }, {});

  // Sort dates chronologically
  const sortedDateKeys = Object.keys(groupedGames).sort((a, b) => new Date(a) - new Date(b));

  return (
    <div className="timeline-container fade-in">
      <div className="timeline-track"></div>
      
      <div className="timeline-list">
        {sortedDateKeys.map((dateKey) => {
          const gamesForDate = groupedGames[dateKey];
          return (
            <div key={dateKey} className="timeline-group">
              <div className="timeline-date-header">
                <span className="timeline-dot-date"></span>
                <h4>{formatDateHeader(dateKey)}</h4>
              </div>
              
              <div className="timeline-games">
                {gamesForDate.map((g) => {
                  return (
                    <div key={g.id} className={`timeline-game-card ${g.status}`}>
                      <div className="timeline-game-body">
                        <div className="timeline-game-header">
                          <span className="badge badge-cyan" style={{ fontSize: '9px' }}>
                            {g.matchup_id.replace(/^full-|^nba-/, '').replace(/-vs-/, ' vs ').toUpperCase()}
                          </span>
                          <span className="badge badge-muted" style={{ fontSize: '9px', marginLeft: '6px' }}>
                            Game {g.game_number}
                          </span>
                        </div>
                        
                        <h4 className="timeline-game-title">{g.title}</h4>
                        
                        <div className="timeline-game-meta">
                          <span>⏱ {g.duration}</span>
                        </div>
                      </div>
                      
                      <div className="timeline-game-actions">
                        <button 
                          className={`play-btn-circle ${g.status === 'watched' ? 'watched' : ''}`}
                          onClick={() => onPlayGame(g)}
                          title="Watch Highlights"
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
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
