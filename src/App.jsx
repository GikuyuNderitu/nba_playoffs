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
import MatchupDetails from './components/MatchupDetails';
import VideoPlayer from './components/VideoPlayer';

export default function App() {
  const [activeTab, setActiveTab] = useState('bracket'); // 'bracket' | 'timeline'
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
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

  const handleVideoEnded = () => {
    if (activeGame) {
      handleToggleProgress(activeGame.id, 'watched');
    }
  };

  const isLoading = loadingTournaments || loadingDetails || loadingTimeline || !sessionId;

  // Find updated matchup details for modal if open
  const openMatchup = selectedMatchup
    ? tournamentDetails?.matchups.find(m => m.id === selectedMatchup.id)
    : null;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-section">
          <h1>🏀 ChronoCourt</h1>
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

      <div className="view-tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'bracket' ? 'active' : ''}`}
          onClick={() => setActiveTab('bracket')}
        >
          Bracket View
        </button>
        <button 
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline View
        </button>
      </div>

      <main className="main-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading ChronoCourt...</p>
          </div>
        ) : (
          <>
            {activeTab === 'bracket' ? (
              <BracketView 
                matchups={tournamentDetails?.matchups || []} 
                onSelectMatchup={setSelectedMatchup} 
              />
            ) : (
              <TimelineView 
                games={timelineGames || []} 
                onPlayGame={setActiveGame} 
                onToggleProgress={handleToggleProgress} 
              />
            )}
          </>
        )}
      </main>

      {/* Matchup Details Modal */}
      {openMatchup && (
        <MatchupDetails 
          matchup={openMatchup} 
          onClose={() => setSelectedMatchup(null)} 
          onPlayGame={setActiveGame} 
          onToggleProgress={handleToggleProgress} 
        />
      )}

      {/* Video Player Modal */}
      {activeGame && (
        <VideoPlayer 
          videoId={activeGame.video_id} 
          onVideoEnded={handleVideoEnded} 
          onClose={() => setActiveGame(null)} 
        />
      )}
    </div>
  );
}
