import React, { useState, useEffect } from 'react';
import { 
  useTournaments, 
  useTournamentDetails, 
  useTournamentTimeline, 
  useCreateSession, 
  useCloneSession, 
  useUpdateProgress 
} from './data-access/queries';
import BracketView from './components/BracketView';
import TimelineView from './components/TimelineView';
import MatchupView from './components/MatchupView';

const parseUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    s: params.get('s') || '',
    tournament: params.get('tournament') || '',
    view: params.get('view') || 'bracket',
    matchup: params.get('matchup') || null,
    game: params.get('game') || null,
  };
};

export default function App() {
  const [currentView, setCurrentView] = useState(() => parseUrlParams().view);
  const [selectedMatchupId, setSelectedMatchupId] = useState(() => parseUrlParams().matchup);
  const [selectedGameId, setSelectedGameId] = useState(() => parseUrlParams().game);
  const [sessionId, setSessionId] = useState(() => parseUrlParams().s);
  const [activeTournamentId, setActiveTournamentId] = useState(() => parseUrlParams().tournament);

  const createSessionMutation = useCreateSession();
  const cloneSessionMutation = useCloneSession();

  const { data: tournaments, isLoading: loadingTournaments } = useTournaments();

  // Sync tournament ID from loaded tournaments if not specified in URL
  useEffect(() => {
    if (!activeTournamentId && tournaments && tournaments.length > 0) {
      setActiveTournamentId(tournaments[0].id);
    }
  }, [tournaments, activeTournamentId]);

  const activeTournId = activeTournamentId || (tournaments && tournaments.length > 0 ? tournaments[0].id : 'nba-playoffs-2026');

  const { data: tournamentDetails, isLoading: loadingDetails } = useTournamentDetails(activeTournId, sessionId);
  const { data: timelineGames, isLoading: loadingTimeline } = useTournamentTimeline(activeTournId, sessionId);

  // Helper to update the URL
  const updateUrl = (newView, newMatchupId, newGameId, replace = false) => {
    const params = new URLSearchParams(window.location.search);
    
    if (sessionId) {
      params.set('s', sessionId);
    }
    
    params.set('tournament', activeTournId);
    
    if (newView && newView !== 'bracket') {
      params.set('view', newView);
    } else {
      params.delete('view');
    }
    
    if (newMatchupId) {
      params.set('matchup', newMatchupId);
      if (tournamentDetails) {
        const matchup = tournamentDetails.matchups.find(m => m.id === newMatchupId);
        if (matchup && matchup.stageName) {
          params.set('stage', matchup.stageName);
        } else {
          params.delete('stage');
        }
      } else {
        const currentStage = new URLSearchParams(window.location.search).get('stage');
        if (currentStage) {
          params.set('stage', currentStage);
        } else {
          params.delete('stage');
        }
      }
    } else {
      params.delete('matchup');
      params.delete('stage');
    }
    
    if (newGameId) {
      params.set('game', newGameId);
    } else {
      params.delete('game');
    }
    
    const newPath = `${window.location.pathname}?${params.toString()}`;
    if (replace) {
      window.history.replaceState({}, '', newPath);
    } else {
      window.history.pushState({}, '', newPath);
    }
  };

  // Sync stage if it becomes available in loaded details
  useEffect(() => {
    if (tournamentDetails && selectedMatchupId) {
      const params = new URLSearchParams(window.location.search);
      if (!params.get('stage')) {
        const matchup = tournamentDetails.matchups.find(m => m.id === selectedMatchupId);
        if (matchup && matchup.stageName) {
          updateUrl(currentView, selectedMatchupId, selectedGameId, true);
        }
      }
    }
  }, [tournamentDetails, selectedMatchupId]);

  // Sync state with browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = parseUrlParams();
      if (params.s) setSessionId(params.s);
      if (params.tournament) setActiveTournamentId(params.tournament);
      setCurrentView(params.view);
      setSelectedMatchupId(params.matchup);
      setSelectedGameId(params.game);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Create session if not present in URL
  useEffect(() => {
    if (!sessionId) {
      createSessionMutation.mutate(undefined, {
        onSuccess: (data) => {
          setSessionId(data.id);
          const params = new URLSearchParams(window.location.search);
          params.set('s', data.id);
          
          params.set('tournament', activeTournId);
          if (currentView && currentView !== 'bracket') params.set('view', currentView);
          if (selectedMatchupId) params.set('matchup', selectedMatchupId);
          if (selectedGameId) params.set('game', selectedGameId);
          
          window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
        }
      });
    }
  }, [sessionId, createSessionMutation, activeTournId, currentView, selectedMatchupId, selectedGameId]);

  // Handle clone session
  const handleCloneSession = () => {
    if (!sessionId) return;
    cloneSessionMutation.mutate(sessionId, {
      onSuccess: (data) => {
        setSessionId(data.id);
        const params = new URLSearchParams(window.location.search);
        params.set('s', data.id);
        window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
      }
    });
  };

  const updateProgressMutation = useUpdateProgress(sessionId, activeTournId);

  const handleToggleProgress = (gameId, status) => {
    updateProgressMutation.mutate({ gameId, status });
  };

  const handleSelectMatchup = (matchup) => {
    setSelectedMatchupId(matchup.id);
    setCurrentView('matchup');
    
    // Auto-select first game for the matchup to include in the URL
    let initialGameId = null;
    if (matchup.games && matchup.games.length > 0) {
      const firstUnwatched = matchup.games.find(g => g.status === 'unwatched');
      initialGameId = firstUnwatched ? firstUnwatched.id : matchup.games[0].id;
    }
    setSelectedGameId(initialGameId);
    
    // Push new history state
    updateUrl('matchup', matchup.id, initialGameId, false);
  };

  const handlePlayFromTimeline = (game) => {
    setSelectedMatchupId(game.matchup_id);
    setSelectedGameId(game.id);
    setCurrentView('matchup');
    
    // Push new history state
    updateUrl('matchup', game.matchup_id, game.id, false);
  };

  const handleTabChange = (view) => {
    setCurrentView(view);
    setSelectedMatchupId(null);
    setSelectedGameId(null);
    updateUrl(view, null, null, false);
  };

  const handleBrandClick = () => {
    setCurrentView('bracket');
    setSelectedMatchupId(null);
    setSelectedGameId(null);
    updateUrl('bracket', null, null, false);
  };

  const isLoading = loadingTournaments || loadingDetails || loadingTimeline || !sessionId;

  // Find active matchup details for the dedicated view
  const activeMatchup = selectedMatchupId && tournamentDetails
    ? tournamentDetails.matchups.find(m => m.id === selectedMatchupId)
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-[#06070d] text-[#f5f6fa]">
      <header className="sticky top-0 z-50 flex justify-between items-center px-4 py-3 md:px-8 md:py-4 bg-[#0d0e17] border-b border-solid border-white/6 backdrop-blur-md">
        <div className="brand-section">
          <h1 
            onClick={handleBrandClick} 
            className="cursor-pointer text-xl md:text-2xl font-extrabold flex items-center gap-2 bg-gradient-to-br from-[#f5f6fa] via-[#f5f6fa] to-[#00f2fe] bg-clip-text text-transparent"
          >
            🏀 ChronoCourt
          </h1>
        </div>
        <div className="hidden md:flex items-center gap-4">
          {sessionId && (
            <div className="text-sm text-[#8a8f9f] bg-[#121424]/70 px-3.5 py-2 rounded-lg border border-solid border-white/6 flex items-center">
              <span>Session:</span>
              <span className="font-mono font-semibold text-[#00f2fe] ml-1.5">{sessionId}</span>
              <button 
                className="btn btn-tiny border-solid border-[#9d4edd] text-[#9d4edd] ml-2 hover:bg-[#9d4edd]/15"
                onClick={handleCloneSession}
                disabled={cloneSessionMutation.isPending}
              >
                {cloneSessionMutation.isPending ? 'Cloning...' : '👥 Clone'}
              </button>
            </div>
          )}
        </div>
      </header>

      {currentView !== 'matchup' && (
        <div className="flex justify-center gap-4 my-8 mb-4 border-b border-solid border-white/6 pb-4">
          <button 
            className={`font-sans text-sm font-semibold py-2.5 px-6 rounded-lg border border-solid border-transparent bg-transparent text-[#8a8f9f] cursor-pointer transition-all duration-300 hover:text-[#f5f6fa] ${currentView === 'bracket' ? 'text-[#00f2fe] border-[#00f2fe]/30 bg-[#00f2fe]/[0.04] shadow-[0_0_15px_rgba(0,242,254,0.08)]' : ''}`}
            onClick={() => handleTabChange('bracket')}
          >
            Bracket View
          </button>
          <button 
            className={`font-sans text-sm font-semibold py-2.5 px-6 rounded-lg border border-solid border-transparent bg-transparent text-[#8a8f9f] cursor-pointer transition-all duration-300 hover:text-[#f5f6fa] ${currentView === 'timeline' ? 'text-[#00f2fe] border-[#00f2fe]/30 bg-[#00f2fe]/[0.04] shadow-[0_0_15px_rgba(0,242,254,0.08)]' : ''}`}
            onClick={() => handleTabChange('timeline')}
          >
            Timeline View
          </button>
        </div>
      )}

      <main className="flex-1 px-4 py-6 md:px-12 md:py-10 max-w-[1400px] w-full mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="w-10 h-10 border-3 border-solid border-white/5 rounded-full border-t-[#00f2fe] animate-spin"></div>
            <p style={{ color: 'var(--color-text-secondary)' }}>Loading ChronoCourt...</p>
          </div>
        ) : (
          <>
            {currentView === 'bracket' && (
              <BracketView 
                matchups={tournamentDetails?.matchups || []} 
                onSelectMatchup={handleSelectMatchup} 
              />
            )}
            
            {currentView === 'timeline' && (
              <TimelineView 
                games={timelineGames || []} 
                onPlayGame={handlePlayFromTimeline} 
                onToggleProgress={handleToggleProgress} 
              />
            )}

            {currentView === 'matchup' && activeMatchup && (
              <MatchupView 
                matchup={activeMatchup}
                selectedGameId={selectedGameId}
                onSelectGame={(gameId, replace = false) => {
                  setSelectedGameId(gameId);
                  updateUrl('matchup', selectedMatchupId, gameId, replace);
                }}
                onBack={() => {
                  setCurrentView('bracket');
                  setSelectedMatchupId(null);
                  setSelectedGameId(null);
                  updateUrl('bracket', null, null, false);
                }}
                onToggleProgress={handleToggleProgress}
              />
            )}
          </>
        )}
      </main>

      <footer className="w-full text-center py-6 border-t border-solid border-white/6 bg-[#0d0e17] mt-auto">
        {sessionId && (
          <div className="flex md:hidden flex-col items-center gap-2 mb-3 text-xs md:text-sm text-[#8a8f9f]">
            <span>Session:</span>
            <span className="font-mono font-semibold text-[#00f2fe] break-all px-4">{sessionId}</span>
            <button 
              className="btn btn-tiny border-solid border-[#9d4edd] text-[#9d4edd] hover:bg-[#9d4edd]/15"
              onClick={handleCloneSession}
              disabled={cloneSessionMutation.isPending}
            >
              {cloneSessionMutation.isPending ? 'Cloning...' : '👥 Clone'}
            </button>
          </div>
        )}
        <p className="text-xs text-[#4e5264] mt-2">🏀 ChronoCourt — Spoiler-Free Sports</p>
      </footer>
    </div>
  );
}
