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

export default function App() {
  const [currentView, setCurrentView] = useState('bracket'); // 'bracket' | 'timeline' | 'matchup'
  const [selectedMatchupId, setSelectedMatchupId] = useState(null);
  const [sessionId, setSessionId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('s') || '';
  });

  const createSessionMutation = useCreateSession();
  const cloneSessionMutation = useCloneSession();

  // Create session if not present in URL
  useEffect(() => {
    if (!sessionId) {
      createSessionMutation.mutate(undefined, {
        onSuccess: (data) => {
          setSessionId(data.id);
          const params = new URLSearchParams(window.location.search);
          params.set('s', data.id);
          window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
        }
      });
    }
  }, [sessionId, createSessionMutation]);

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

  const { data: tournaments, isLoading: loadingTournaments } = useTournaments();
  const activeTournamentId = tournaments?.[0]?.id || 'nba-playoffs-2026';

  const { data: tournamentDetails, isLoading: loadingDetails } = useTournamentDetails(activeTournamentId, sessionId);
  const { data: timelineGames, isLoading: loadingTimeline } = useTournamentTimeline(activeTournamentId, sessionId);

  const updateProgressMutation = useUpdateProgress(sessionId, activeTournamentId);

  const handleToggleProgress = (gameId, status) => {
    updateProgressMutation.mutate({ gameId, status });
  };

  const handleSelectMatchup = (matchup) => {
    setSelectedMatchupId(matchup.id);
    setCurrentView('matchup');
  };

  const handlePlayFromTimeline = (game) => {
    setSelectedMatchupId(game.matchup_id);
    setCurrentView('matchup');
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
          <h1 onClick={() => { setCurrentView('bracket'); setSelectedMatchupId(null); }} style={{ cursor: 'pointer' }}>
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
            onClick={() => setCurrentView('bracket')}
          >
            Bracket View
          </button>
          <button 
            className={`tab-btn ${currentView === 'timeline' ? 'active' : ''}`}
            onClick={() => setCurrentView('timeline')}
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
                onBack={() => { setCurrentView('bracket'); setSelectedMatchupId(null); }}
                onToggleProgress={handleToggleProgress}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
