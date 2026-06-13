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
    <div className="app-container">
      <header className="app-header">
        <div className="brand-section">
          <h1 onClick={handleBrandClick} style={{ cursor: 'pointer' }}>
            🏀 ChronoCourt
          </h1>
        </div>
        <div className="header-actions">
          {sessionId && (
            <div className="session-badge">
              <span>Session:</span>
              <span className="session-id">{sessionId}</span>
              <button 
                className="btn btn-tiny"
                style={{ borderColor: 'var(--neon-purple)', color: 'var(--neon-purple)', marginLeft: '8px' }}
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
        <div className="view-tabs-container">
          <button 
            className={`tab-btn ${currentView === 'bracket' ? 'active' : ''}`}
            onClick={() => handleTabChange('bracket')}
          >
            Bracket View
          </button>
          <button 
            className={`tab-btn ${currentView === 'timeline' ? 'active' : ''}`}
            onClick={() => handleTabChange('timeline')}
          >
            Timeline View
          </button>
        </div>
      )}

      <main className="main-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading ChronoCourt...</p>
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
    </div>
  );
}
