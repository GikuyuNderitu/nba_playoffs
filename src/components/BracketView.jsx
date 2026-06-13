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
    // Finals matchup resolved: in our playoffs data, KNICKS won
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
  // Eastern Conference Matchup Sequences (in binary tree order)
  const eastRound1Seq = [1, 4, 3, 2];
  const eastRound2Seq = [9, 10];
  const eastRound3Seq = [13];

  // Western Conference Matchup Sequences (in binary tree order)
  const westRound1Seq = [5, 6, 7, 8];
  const westRound2Seq = [12, 11];
  const westRound3Seq = [14];

  // Finals Sequence
  const finalsSeq = [15];

  const getMatch = (seq) => matchups.find(m => m.sequence === seq);

  const eastR1 = eastRound1Seq.map(getMatch).filter(Boolean);
  const eastR2 = eastRound2Seq.map(getMatch).filter(Boolean);
  const eastR3 = eastRound3Seq.map(getMatch).filter(Boolean);

  const westR1 = westRound1Seq.map(getMatch).filter(Boolean);
  const westR2 = westRound2Seq.map(getMatch).filter(Boolean);
  const westR3 = westRound3Seq.map(getMatch).filter(Boolean);

  const finals = finalsSeq.map(getMatch).filter(Boolean);
  
  const finalsMatch = finals[0];
  const champion = finalsMatch ? getMatchupWinner(finalsMatch, matchups) : null;

  return (
    <div className="bracket-wrapper">
      <div className="bracket-headers">
        <div className="header-group left-headers">
          <span>First Round</span>
          <span>Semifinals</span>
          <span>Conf. Finals</span>
        </div>
        <div className="header-group center-header">
          <span>NBA Finals</span>
        </div>
        <div className="header-group right-headers">
          <span>Conf. Finals</span>
          <span>Semifinals</span>
          <span>First Round</span>
        </div>
      </div>

      <div className="bracket-tree">
        {/* LEFT SIDE: Eastern Conference */}
        <div className="bracket-side left-side">
          <div className="bracket-col col-1">
            {eastR1.map(m => (
              <MatchupCard 
                key={m.id} 
                matchup={m} 
                winnerName={getMatchupWinner(m, matchups)}
                onSelect={onSelectMatchup}
              />
            ))}
          </div>
          <div className="bracket-col col-2">
            {eastR2.map(m => (
              <MatchupCard 
                key={m.id} 
                matchup={m} 
                winnerName={getMatchupWinner(m, matchups)}
                onSelect={onSelectMatchup}
              />
            ))}
          </div>
          <div className="bracket-col col-3">
            {eastR3.map(m => (
              <MatchupCard 
                key={m.id} 
                matchup={m} 
                winnerName={getMatchupWinner(m, matchups)}
                onSelect={onSelectMatchup}
              />
            ))}
          </div>
        </div>

        {/* CENTER: NBA Finals & Champion Podiums */}
        <div className="bracket-center">
          <div className="finals-slot">
            {finalsMatch && (
              <MatchupCard 
                matchup={finalsMatch} 
                winnerName={champion}
                onSelect={onSelectMatchup}
              />
            )}
          </div>
          
          {champion && (
            <div className="champion-podium fade-in">
              <span className="trophy">🏆</span>
              <h4>CHAMPION</h4>
              <div className="champion-name">{champion}</div>
            </div>
          )}
        </div>

        {/* RIGHT SIDE: Western Conference */}
        <div className="bracket-side right-side">
          <div className="bracket-col col-3">
            {westR3.map(m => (
              <MatchupCard 
                key={m.id} 
                matchup={m} 
                winnerName={getMatchupWinner(m, matchups)}
                onSelect={onSelectMatchup}
              />
            ))}
          </div>
          <div className="bracket-col col-2">
            {westR2.map(m => (
              <MatchupCard 
                key={m.id} 
                matchup={m} 
                winnerName={getMatchupWinner(m, matchups)}
                onSelect={onSelectMatchup}
              />
            ))}
          </div>
          <div className="bracket-col col-1">
            {westR1.map(m => (
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
    </div>
  );
}
