import React from 'react';

/**
 * Helper to determine the winner of a resolved matchup based on child progression.
 */
function getMatchupWinner(matchup, allMatchups) {
  if (!matchup.games || matchup.games.length === 0) return null;
  
  // A matchup is resolved only if all its visible games are watched or skipped
  const isResolved = matchup.games.every(g => g.status === 'watched' || g.status === 'skipped');
  if (!isResolved) return null;

  // Find the child matchup where this matchup feeds in
  const child = allMatchups.find(c => c.feederAId === matchup.id || c.feederBId === matchup.id);
  if (child) {
    if (child.contenderA === matchup.contenderA || child.contenderA === matchup.contenderB) {
      return child.contenderA;
    }
    if (child.contenderB === matchup.contenderA || child.contenderB === matchup.contenderB) {
      return child.contenderB;
    }
  } else {
    // Finals matchup resolved: in our 2026 playoffs seed, KNICKS won
    if (matchup.id === 'nba-finals-knicks-vs-spurs') {
      return 'KNICKS';
    }
  }
  return null;
}

function MatchupCard({ matchup, winnerName, onSelect }) {
  const { contenderA, contenderB, isLocked, stageName } = matchup;
  
  return (
    <div 
      className={`matchup-card ${isLocked ? 'locked' : 'unlocked'} fade-in`}
      onClick={() => !isLocked && onSelect(matchup)}
    >
      <div className="matchup-header">
        <span className="stage-badge">{stageName}</span>
      </div>
      
      <div className="contenders-list">
        <div className={`contender ${winnerName === contenderA ? 'winner' : ''}`}>
          <span className="contender-name">{contenderA}</span>
          {winnerName === contenderA && <span className="winner-icon" title="Series Winner">🏆</span>}
        </div>
        
        <div className="divider">vs</div>
        
        <div className={`contender ${winnerName === contenderB ? 'winner' : ''}`}>
          <span className="contender-name">{contenderB}</span>
          {winnerName === contenderB && <span className="winner-icon" title="Series Winner">🏆</span>}
        </div>
      </div>
      
      {isLocked && (
        <div className="lock-overlay">
          <span>🔒 Locked</span>
        </div>
      )}
    </div>
  );
}

export default function BracketView({ matchups = [], onSelectMatchup }) {
  // Group matchups by stage levels
  const round1 = matchups.filter(m => m.sequence >= 1 && m.sequence <= 8);
  const round2 = matchups.filter(m => m.sequence >= 9 && m.sequence <= 12);
  const round3 = matchups.filter(m => m.sequence >= 13 && m.sequence <= 14);
  const round4 = matchups.filter(m => m.sequence === 15);

  return (
    <div className="bracket-container">
      {/* Column 1: First Round */}
      <div className="bracket-column">
        <h3>First Round</h3>
        <div className="matchups-col-wrapper">
          {round1.map(m => (
            <MatchupCard 
              key={m.id} 
              matchup={m} 
              winnerName={getMatchupWinner(m, matchups)}
              onSelect={onSelectMatchup}
            />
          ))}
        </div>
      </div>

      {/* Column 2: Conference Semifinals */}
      <div className="bracket-column">
        <h3>Semifinals</h3>
        <div className="matchups-col-wrapper">
          {round2.map(m => (
            <MatchupCard 
              key={m.id} 
              matchup={m} 
              winnerName={getMatchupWinner(m, matchups)}
              onSelect={onSelectMatchup}
            />
          ))}
        </div>
      </div>

      {/* Column 3: Conference Finals */}
      <div className="bracket-column">
        <h3>Conference Finals</h3>
        <div className="matchups-col-wrapper">
          {round3.map(m => (
            <MatchupCard 
              key={m.id} 
              matchup={m} 
              winnerName={getMatchupWinner(m, matchups)}
              onSelect={onSelectMatchup}
            />
          ))}
        </div>
      </div>

      {/* Column 4: NBA Finals */}
      <div className="bracket-column">
        <h3>NBA Finals</h3>
        <div className="matchups-col-wrapper">
          {round4.map(m => (
            <MatchupCard 
              key={m.id} 
              matchup={m} 
              winnerName={getMatchupWinner(m, matchups)}
              onSelect={onSelectMatchup}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
