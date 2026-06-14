import React, { useState, useEffect } from 'react';
import { 
  useTournaments, 
  useTournamentDetails, 
  useTournamentTimeline, 
  useCreateSession, 
  useCloneSession, 
  useUpdateProgress,
  useUpdateTournamentSettings
} from './data-access/queries';
import BracketView from './components/BracketView';
import TimelineView from './components/TimelineView';
import MatchupView from './components/MatchupView';
import HomeView from './components/HomeView';
import { parseUrlRoute, buildUrl } from './utils/router';

export default function App() {
  const [currentView, setCurrentView] = useState(() => parseUrlRoute(window.location.pathname, window.location.search).view);
  const [selectedMatchupId, setSelectedMatchupId] = useState(() => parseUrlRoute(window.location.pathname, window.location.search).matchupId);
  const [selectedGameId, setSelectedGameId] = useState(() => parseUrlRoute(window.location.pathname, window.location.search).gameId);
  const [sessionId, setSessionId] = useState(() => parseUrlRoute(window.location.pathname, window.location.search).s);
  const [activeTournamentId, setActiveTournamentId] = useState(() => parseUrlRoute(window.location.pathname, window.location.search).tournamentId);

  const createSessionMutation = useCreateSession();
  const cloneSessionMutation = useCloneSession();

  const { data: tournaments, isLoading: loadingTournaments } = useTournaments(sessionId);

  // Sync tournament ID from loaded tournaments if not specified in URL, but ONLY if we are not on the root page
  useEffect(() => {
    const isRoot = window.location.pathname === '/';
    if (!isRoot && !activeTournamentId && tournaments && tournaments.length > 0) {
      const defaultTournamentId = tournaments[0].id;
      setActiveTournamentId(defaultTournamentId);
      
      const newFullPath = buildUrl({
        tournamentId: defaultTournamentId,
        matchupId: selectedMatchupId,
        gameId: selectedGameId,
        sessionId,
        view: currentView,
        stage: new URLSearchParams(window.location.search).get('stage')
      });
      window.history.replaceState({}, '', newFullPath);
    }
  }, [tournaments, activeTournamentId, selectedMatchupId, selectedGameId, sessionId, currentView]);

  const activeTournId = activeTournamentId || null;

  const { data: tournamentDetails, isLoading: loadingDetails } = useTournamentDetails(activeTournId, sessionId);
  const { data: timelineGames, isLoading: loadingTimeline } = useTournamentTimeline(activeTournId, sessionId);
  
  const updateTournamentSettingsMutation = useUpdateTournamentSettings(sessionId);

  // Helper to update the URL
  const updateUrl = (newView, newMatchupId, newGameId, replace = false) => {
    let stage = null;
    if (newMatchupId && tournamentDetails) {
      const matchup = tournamentDetails.matchups.find(m => m.id === newMatchupId);
      if (matchup) stage = matchup.stageName;
    } else if (newMatchupId) {
      const searchParams = new URLSearchParams(window.location.search);
      stage = searchParams.get('stage') || null;
    }

    const view = newMatchupId ? 'matchup' : newView;

    const newFullPath = buildUrl({
      tournamentId: activeTournId,
      matchupId: newMatchupId,
      gameId: newGameId,
      sessionId,
      view,
      stage
    });

    if (replace) {
      window.history.replaceState({}, '', newFullPath);
    } else {
      window.history.pushState({}, '', newFullPath);
    }
  };

  // Redirect to the first unwatched game of a matchup if gameId is not in the URL
  useEffect(() => {
    if (tournamentDetails && selectedMatchupId && !selectedGameId) {
      const matchup = tournamentDetails.matchups.find(m => m.id === selectedMatchupId);
      if (matchup) {
        let targetGameId = null;
        if (matchup.games && matchup.games.length > 0) {
          const firstUnwatched = matchup.games.find(g => g.status === 'unwatched');
          targetGameId = firstUnwatched ? firstUnwatched.id : matchup.games[0].id;
        }
        if (targetGameId) {
          setSelectedGameId(targetGameId);
          updateUrl('matchup', selectedMatchupId, targetGameId, true);
        }
      }
    }
  }, [tournamentDetails, selectedMatchupId, selectedGameId]);

  // Sync stage if it becomes available in loaded details
  useEffect(() => {
    if (tournamentDetails && selectedMatchupId && selectedGameId) {
      const params = new URLSearchParams(window.location.search);
      if (!params.get('stage')) {
        const matchup = tournamentDetails.matchups.find(m => m.id === selectedMatchupId);
        if (matchup && matchup.stageName) {
          updateUrl(currentView, selectedMatchupId, selectedGameId, true);
        }
      }
    }
  }, [tournamentDetails, selectedMatchupId, selectedGameId]);

  // Sync state with browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const route = parseUrlRoute(window.location.pathname, window.location.search);
      if (route.s) setSessionId(route.s);
      if (route.tournamentId) setActiveTournamentId(route.tournamentId);
      setCurrentView(route.view);
      setSelectedMatchupId(route.matchupId);
      setSelectedGameId(route.gameId);
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
          
          const stage = new URLSearchParams(window.location.search).get('stage');
          const newFullPath = buildUrl({
            tournamentId: activeTournId,
            matchupId: selectedMatchupId,
            gameId: selectedGameId,
            sessionId: data.id,
            view: currentView,
            stage
          });
          window.history.replaceState({}, '', newFullPath);
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
        
        const stage = new URLSearchParams(window.location.search).get('stage');
        const newFullPath = buildUrl({
          tournamentId: activeTournId,
          matchupId: selectedMatchupId,
          gameId: selectedGameId,
          sessionId: data.id,
          view: currentView,
          stage
        });
        window.history.pushState({}, '', newFullPath);
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
    setActiveTournamentId(null);
    updateUrl('bracket', null, null, false);
  };

  const isLoading = loadingTournaments || !sessionId || (!!activeTournId && (loadingDetails || loadingTimeline));

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
            <img src="/favicon.svg" alt="ChronoCourt Logo" className="w-7 h-7 md:w-8 md:h-8 object-contain shrink-0" />
            <span>ChronoCourt</span>
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

      {activeTournId && tournamentDetails?.type !== 'linear' && currentView !== 'matchup' && (
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
            {!activeTournId && (
              <HomeView 
                tournaments={tournaments || []}
                onSelectTournament={(id) => {
                  setActiveTournamentId(id);
                  const selectedTourn = tournaments.find(t => t.id === id);
                  const defaultView = selectedTourn?.type === 'linear' ? 'timeline' : 'bracket';
                  setCurrentView(defaultView);
                  const newFullPath = buildUrl({
                    tournamentId: id,
                    sessionId,
                    view: defaultView
                  });
                  window.history.pushState({}, '', newFullPath);
                }}
                onToggleWatched={(id, isCurrentlyWatched) => {
                  updateTournamentSettingsMutation.mutate({
                    tournamentId: id,
                    isWatched: !isCurrentlyWatched
                  });
                }}
              />
            )}

            {activeTournId && (
              <>
                {/* Active Tournament Navigation / Settings Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-[#0d0e17] p-4 rounded-xl border border-solid border-white/5">
                  <div className="flex items-center gap-2">
                    <button 
                      className="btn text-xs font-semibold py-1.5 px-3 rounded-lg hover:bg-white/5 cursor-pointer border border-solid border-white/5 text-[#8a8f9f]"
                      onClick={() => {
                        setActiveTournamentId(null);
                        setCurrentView('bracket');
                        setSelectedMatchupId(null);
                        setSelectedGameId(null);
                        updateUrl('bracket', null, null, false);
                      }}
                    >
                      ← Back
                    </button>
                    <h2 className="text-base md:text-lg font-bold text-[#f5f6fa] ml-2 leading-tight">{tournamentDetails?.title}</h2>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#8a8f9f] hidden md:inline">
                      Spoiler-Free Mode:
                    </span>
                    <button
                      onClick={() => {
                        updateTournamentSettingsMutation.mutate({
                          tournamentId: activeTournId,
                          spoilerFree: !tournamentDetails?.spoiler_free
                        });
                      }}
                      className={`btn text-xs font-bold px-3 py-1.5 rounded-lg border border-solid cursor-pointer transition-all duration-300 ${
                        tournamentDetails?.spoiler_free
                          ? 'border-[#00f2fe]/30 bg-[#00f2fe]/5 text-[#00f2fe] hover:bg-[#00f2fe]/10 shadow-[0_0_10px_rgba(0,242,254,0.1)]'
                          : 'border-white/10 bg-transparent text-[#8a8f9f] hover:text-[#f5f6fa] hover:border-white/20'
                      }`}
                    >
                      {tournamentDetails?.spoiler_free ? '🔒 Spoiler-Free ON' : '🔓 Revealed (Spoilers)'}
                    </button>
                  </div>
                </div>

                {currentView === 'matchup' && activeMatchup && (
                  <MatchupView 
                    matchup={activeMatchup}
                    selectedGameId={selectedGameId}
                    onSelectGame={(gameId, replace = false) => {
                      setSelectedGameId(gameId);
                      updateUrl('matchup', selectedMatchupId, gameId, replace);
                    }}
                    onBack={() => {
                      const backView = tournamentDetails?.type === 'linear' ? 'timeline' : 'bracket';
                      setCurrentView(backView);
                      setSelectedMatchupId(null);
                      setSelectedGameId(null);
                      updateUrl(backView, null, null, false);
                    }}
                    onToggleProgress={handleToggleProgress}
                  />
                )}

                {currentView !== 'matchup' && (
                  <>
                    {(currentView === 'timeline' || tournamentDetails?.type === 'linear') ? (
                      <TimelineView 
                        tournamentId={activeTournId}
                        games={timelineGames || []} 
                        onPlayGame={handlePlayFromTimeline} 
                        onToggleProgress={handleToggleProgress} 
                      />
                    ) : (
                      <BracketView 
                        matchups={tournamentDetails?.matchups || []} 
                        onSelectMatchup={handleSelectMatchup} 
                      />
                    )}
                  </>
                )}
              </>
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
        <p className="text-xs text-[#4e5264] mt-2 flex items-center justify-center gap-1.5">
          <img src="/favicon.svg" alt="ChronoCourt Logo" className="w-4 h-4 object-contain opacity-60" />
          <span>ChronoCourt — Spoiler-Free Sports</span>
        </p>
      </footer>
    </div>
  );
}
