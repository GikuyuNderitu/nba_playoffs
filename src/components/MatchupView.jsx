import React, { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import SkipControl from './SkipControl';

/**
 * MatchupView Component
 * Renders a dedicated watch page for a selected series/matchup, including
 * an inline VideoPlayer and sequential list of games.
 */
export default function MatchupView({ 
  matchup, 
  onBack, 
  onToggleProgress, 
  selectedGameId = null, 
  onSelectGame = () => {} 
}) {
  const { contenderA, contenderB, stageName, games = [] } = matchup;
  const [activeGame, setActiveGame] = useState(null);

  // Synchronize active game with props / auto-selection
  useEffect(() => {
    if (games.length > 0) {
      const matchedGame = selectedGameId ? games.find(g => g.id === selectedGameId) : null;
      if (matchedGame) {
        setActiveGame(matchedGame);
      } else {
        // Auto-select the first unwatched game in the list initially
        const firstUnwatched = games.find(g => g.status === 'unwatched');
        const defaultGame = firstUnwatched || games[0];
        setActiveGame(defaultGame);
        onSelectGame(defaultGame.id, true); // replace state to avoid cluttering history
      }
    } else {
      setActiveGame(null);
    }
  }, [games, selectedGameId]);

  const handleVideoEnded = () => {
    if (activeGame) {
      onToggleProgress(activeGame.id, 'watched');
      
      // Auto-progress: play the next game in the sequence if available
      const currentIdx = games.findIndex(g => g.id === activeGame.id);
      if (currentIdx !== -1 && currentIdx + 1 < games.length) {
        onSelectGame(games[currentIdx + 1].id, true); // Replace URL on auto-advance
      }
    }
  };

  return (
    <div className="matchup-view-container fade-in">
      <div className="matchup-view-header">
        <button className="matchup-view-header-back-btn" onClick={onBack}>
          ← Back to Bracket
        </button>
        <div className="matchup-view-info">
          <span className="badge badge-cyan">{stageName}</span>
          <h2 className="matchup-view-info-h2">{contenderA} vs {contenderB}</h2>
        </div>
      </div>

      <div className="matchup-view-content">
        {/* Left Column: Embedded Video Player */}
        <div className="player-column">
          {activeGame ? (
            <div className="active-player-wrapper">
              <div className="now-playing-label">
                Now Playing: <strong>Game {activeGame.game_number} Highlights</strong>
              </div>
              <VideoPlayer 
                videoId={activeGame.video_id}
                onVideoEnded={handleVideoEnded}
              />
            </div>
          ) : (
            <div className="no-video-placeholder">
              <p>Select a game highlights video to watch.</p>
            </div>
          )}
        </div>

        {/* Right Column: Game schedule & skip controls */}
        <div className="series-games-column">
          <h3 className="series-games-column-h3">Series Schedule & Progress</h3>
          <div className="series-games-list">
            {games.length === 0 ? (
              <p className="no-games-text">No games available for this matchup.</p>
            ) : (
              games.map((g) => {
                const isActive = activeGame && activeGame.id === g.id;
                return (
                  <div 
                    key={g.id} 
                    className={`series-game-row ${g.status} ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectGame(g.id, false)}
                  >
                    <div className="game-status-dot"></div>
                    <div className="game-row-details">
                      <div className="game-row-title-bar">
                        <span className="game-num">Game {g.game_number}</span>
                        {isActive && <span className="now-playing-badge">PLAYING</span>}
                      </div>
                      <p className="game-row-title">{g.title}</p>
                      <span className="game-row-duration">⏱ {g.duration}</span>
                    </div>
                    <div className="game-row-action" onClick={e => e.stopPropagation()}>
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
