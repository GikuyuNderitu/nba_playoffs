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
    <div className="w-full max-w-full flex flex-col gap-4 md:gap-8 animate-[fadeIn_0.4s_ease-out]">
      {/* Matchup Header (Option A - below video on mobile, stacked) */}
      <div className="order-2 md:order-1 flex flex-col md:flex-row md:items-center gap-3 md:gap-5 pb-4 md:pb-5 border-b border-solid border-white/6 mb-4 md:mb-8 mt-4 md:mt-0">
        <button 
          className="font-sans text-sm font-semibold py-2.5 px-5 rounded-lg border border-solid border-white/6 bg-white/[0.02] text-[#f5f6fa] cursor-pointer transition-all duration-300 hover:border-[#00f2fe] hover:bg-[#00f2fe]/5 hover:text-[#00f2fe] hover:shadow-[0_0_10px_rgba(0,242,254,0.1)] w-full md:w-auto text-center" 
          onClick={onBack}
        >
          ← Back to Bracket
        </button>
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center self-start px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold uppercase tracking-wider bg-[#00f2fe]/10 border border-solid border-[#00f2fe]/30 text-[#00f2fe]">
            {stageName}
          </span>
          <h2 className="m-0 text-lg md:text-2xl font-extrabold text-[#f5f6fa]">{contenderA} vs {contenderB}</h2>
        </div>
      </div>

      <div className="order-1 md:order-2 flex flex-col gap-8">
        <div className="mobile-landscape-fullscreen-player w-[calc(100%+32px)] -ml-4 md:ml-0 md:w-full border-none md:border md:border-solid md:border-white/6 md:rounded-2xl overflow-hidden bg-transparent md:bg-[#121424]/70 shadow-none md:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {activeGame ? (
            <div className="flex flex-col">
              <div className="now-playing-title-label order-2 md:order-1 text-xs md:text-sm text-[#8a8f9f] p-3 px-4 md:p-4 md:px-6 border-b border-solid border-white/6 bg-white/[0.01]">
                Now Playing: <strong className="text-[#00f2fe]">Game {activeGame.game_number} Highlights</strong>
              </div>
              <div className="video-player-wrapper order-1 md:order-2">
                <VideoPlayer 
                  videoId={activeGame.video_id}
                  onVideoEnded={handleVideoEnded}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center aspect-video bg-black text-[#8a8f9f]">
              <p>Select a game highlights video to watch.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Game schedule & skip controls */}
      <div className="order-3 md:order-3 p-4 md:p-6 rounded-2xl border border-solid border-white/6 bg-[#121424]/70 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <h3 className="text-base md:text-lg font-bold text-[#f5f6fa] pb-3 border-b border-solid border-white/6 mb-5 m-0">
          Series Schedule & Progress
        </h3>
        <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
          {games.length === 0 ? (
            <p className="text-sm text-[#8a8f9f] text-center py-4">No games available for this matchup.</p>
          ) : (
            games.map((g) => {
              const isActive = activeGame && activeGame.id === g.id;
              
              // Resolve status borders for game rows
              let statusBorder = "border-transparent";
              if (g.status === 'watched') statusBorder = "border-yellow-500/20";
              if (g.status === 'skipped') statusBorder = "border-purple-500/20";
              
              // Resolve status dot color and glow
              let dotClass = "bg-[#00f2fe] shadow-[0_0_6px_#00f2fe]";
              if (g.status === 'watched') dotClass = "bg-[#ffb800] shadow-[0_0_6px_#ffb800]";
              if (g.status === 'skipped') dotClass = "bg-[#9d4edd] shadow-[0_0_6px_#9d4edd]";

              return (
                <div 
                  key={g.id} 
                  className={`flex items-center gap-3 md:gap-4 p-2.5 md:p-3 md:px-4 rounded-xl bg-white/[0.02] border border-solid transition-all duration-300 hover:bg-white/[0.05] hover:-translate-y-0.5 ${statusBorder} ${isActive ? 'border-[#00f2fe]/30 bg-[#00f2fe]/[0.06] shadow-[0_0_8px_rgba(0,242,254,0.1)]' : ''}`}
                  onClick={() => onSelectGame(g.id, false)}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 transition-all duration-300 ${dotClass}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-[#8a8f9f]">Game {g.game_number}</span>
                      {isActive && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#00f2fe] text-[#06070d] tracking-wider">
                          PLAYING
                        </span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm font-medium text-[#f5f6fa] m-0 line-clamp-2 md:line-clamp-1 leading-snug md:leading-normal">
                      {g.title}
                    </p>
                    <span className="text-[11px] text-[#8a8f9f]">⏱ {g.duration}</span>
                  </div>
                  <div className="shrink-0" onClick={e => e.stopPropagation()}>
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
  );
}
