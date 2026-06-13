import React, { useRef, useEffect, useState } from 'react';

/**
 * Helper to determine the winner of a resolved matchup based on child progression.
 */
function getMatchupWinner(matchup, allMatchups) {
  if (!matchup.games || matchup.games.length === 0) return null;
  
  const isResolved = matchup.games.every(g => g.status === 'watched' || g.status === 'skipped');
  if (!isResolved) return null;

  const child = allMatchups.find(c => c.feederAId === matchup.id || c.feederBId === matchup.id);
  if (child) {
    if (child.contenderA === matchup.contenderA || child.contenderA === matchup.contenderB) {
      return child.contenderA;
    }
    if (child.contenderB === matchup.contenderA || child.contenderB === matchup.contenderB) {
      return child.contenderB;
    }
  } else {
    // Finals matchup resolved
    if (matchup.id === 'nba-finals-knicks-vs-spurs') {
      return 'KNICKS';
    }
  }
  return null;
}

export default function BracketView({ matchups = [], onSelectMatchup }) {
  const canvasRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  // Group matchups by sequence
  const getMatch = (seq) => matchups.find(m => m.sequence === seq);

  const eastR1 = [1, 4, 3, 2].map(getMatch).filter(Boolean);
  const eastR2 = [9, 10].map(getMatch).filter(Boolean);
  const eastR3 = [13].map(getMatch).filter(Boolean);

  const westR1 = [5, 6, 7, 8].map(getMatch).filter(Boolean);
  const westR2 = [12, 11].map(getMatch).filter(Boolean);
  const westR3 = [14].map(getMatch).filter(Boolean);

  const finals = [15].map(getMatch).filter(Boolean);

  const cardW = 160;
  const cardH = 80;
  const nodes = [];

  const addColNodes = (matchupsList, colX, centersY) => {
    matchupsList.forEach((m, idx) => {
      nodes.push({
        matchup: m,
        x: colX - cardW / 2,
        y: centersY[idx] - cardH / 2,
        w: cardW,
        h: cardH,
        winnerName: getMatchupWinner(m, matchups)
      });
    });
  };

  // Populate node coordinates dynamically (mirrored tree layout)
  addColNodes(eastR1, 90, [85, 255, 425, 595]);
  addColNodes(eastR2, 270, [170, 510]);
  addColNodes(eastR3, 450, [340]);

  addColNodes(finals, 650, [340]);

  addColNodes(westR3, 850, [340]);
  addColNodes(westR2, 1030, [170, 510]);
  addColNodes(westR1, 1210, [85, 255, 425, 595]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // Guard against test environments (jsdom) that return null
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw connection lines
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.shadowBlur = 0;

    const drawLine = (x1, y1, x2, y2) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    // 1. Draw Left Side (East) Connectors
    // Col 1 (90) to Col 2 (270)
    // Row 1 (85) and Row 2 (255) to Col 2 Row 1 (170)
    drawLine(170, 85, 180, 85);
    drawLine(170, 255, 180, 255);
    drawLine(180, 85, 180, 255);
    drawLine(180, 170, 190, 170);

    // Row 3 (425) and Row 4 (595) to Col 2 Row 2 (510)
    drawLine(170, 425, 180, 425);
    drawLine(170, 595, 180, 595);
    drawLine(180, 425, 180, 595);
    drawLine(180, 510, 190, 510);

    // Col 2 (270) to Col 3 (450)
    // Row 1 (170) and Row 2 (510) to Col 3 Row 1 (340)
    drawLine(350, 170, 360, 170);
    drawLine(350, 510, 360, 510);
    drawLine(360, 170, 360, 510);
    drawLine(360, 340, 370, 340);

    // Col 3 (450) to Center Finals (650)
    drawLine(530, 340, 570, 340);

    // 2. Draw Right Side (West) Connectors
    // Col 7 (1210) to Col 6 (1030)
    // Row 1 (85) and Row 2 (255) to Col 6 Row 1 (170)
    drawLine(1130, 85, 1120, 85);
    drawLine(1130, 255, 1120, 255);
    drawLine(1120, 85, 1120, 255);
    drawLine(1120, 170, 1110, 170);

    // Row 3 (425) and Row 4 (595) to Col 6 Row 2 (510)
    drawLine(1130, 425, 1120, 425);
    drawLine(1130, 595, 1120, 595);
    drawLine(1120, 425, 1120, 595);
    drawLine(1120, 510, 1110, 510);

    // Col 6 (1030) to Col 5 (850)
    // Row 1 (170) and Row 2 (510) to Col 5 Row 1 (340)
    drawLine(950, 170, 940, 170);
    drawLine(950, 510, 940, 510);
    drawLine(940, 170, 940, 510);
    drawLine(940, 340, 930, 340);

    // Col 5 (850) to Center Finals (650)
    drawLine(770, 340, 730, 340);

    // Helper to draw rounded cards
    const drawRoundRect = (x, y, w, h, radius, fill, stroke, glow = null) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();

      if (glow) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = fill;
      ctx.fill();

      ctx.shadowBlur = 0; // Disable shadow for strokes

      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    // Draw matchup cards
    nodes.forEach(node => {
      const isHovered = hoveredNode && hoveredNode.matchup.id === node.matchup.id;
      const { matchup, x, y, w, h, winnerName } = node;
      const { contenderA, contenderB, isLocked, stageName } = matchup;

      const bgFill = isLocked ? '#121424' : '#16192b';
      const borderColor = isHovered 
        ? '#00f2fe' 
        : (isLocked ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.15)');
      const glowColor = isHovered ? 'rgba(0, 242, 254, 0.4)' : null;

      drawRoundRect(x, y, w, h, 8, bgFill, borderColor, glowColor);

      // Draw stage text (centered badge)
      ctx.fillStyle = isLocked ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.45)';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(stageName.toUpperCase(), x + w / 2, y + 8);

      // Draw "VS" divider in the middle
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = 'bold 8px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('VS', x + w / 2, y + h / 2 + 1);

      // Draw contenders (Left aligned)
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px sans-serif';

      // Contender A
      const isWinnerA = winnerName === contenderA;
      ctx.fillStyle = isWinnerA 
        ? '#ffb800' 
        : (isLocked ? 'rgba(255, 255, 255, 0.3)' : '#ffffff');
      
      let nameA = contenderA;
      if (ctx.measureText(nameA).width > w - 30) {
        nameA = nameA.substring(0, 10) + '...';
      }
      ctx.fillText(nameA, x + 12, y + 26);
      if (isWinnerA) {
        ctx.fillText('🏆', x + w - 24, y + 26);
      }

      // Contender B
      const isWinnerB = winnerName === contenderB;
      ctx.fillStyle = isWinnerB 
        ? '#ffb800' 
        : (isLocked ? 'rgba(255, 255, 255, 0.3)' : '#ffffff');

      let nameB = contenderB;
      if (ctx.measureText(nameB).width > w - 30) {
        nameB = nameB.substring(0, 10) + '...';
      }
      ctx.fillText(nameB, x + 12, y + 54);
      if (isWinnerB) {
        ctx.fillText('🏆', x + w - 24, y + 54);
      }

      // Lock Overlay
      if (isLocked) {
        ctx.fillStyle = 'rgba(6, 7, 13, 0.6)';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, w, h, 8) : ctx.rect(x, y, w, h);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒 Locked', x + w / 2, y + h / 2);
      }
    });
  }, [matchups, hoveredNode]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found = null;
    for (const node of nodes) {
      if (x >= node.x && x <= node.x + node.w && y >= node.y && y <= node.y + node.h) {
        if (!node.matchup.isLocked) {
          found = node;
          break;
        }
      }
    }
    setHoveredNode(found);
    canvas.style.cursor = found ? 'pointer' : 'default';
  };

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const node of nodes) {
      if (x >= node.x && x <= node.x + node.w && y >= node.y && y <= node.y + node.h) {
        if (!node.matchup.isLocked) {
          onSelectMatchup(node.matchup);
          break;
        }
      }
    }
  };

  const finalsMatch = finals[0];
  const championName = finalsMatch ? getMatchupWinner(finalsMatch, matchups) : null;

  return (
    <div className="bracket-wrapper">
      <div className="bracket-stages-line">
        <span>First Round</span>
        <span className="stage-arrow">→</span>
        <span>Semifinals</span>
        <span className="stage-arrow">→</span>
        <span>Conference Finals</span>
        <span className="stage-arrow">→</span>
        <span>NBA Finals</span>
      </div>

      <div className="bracket-tree-canvas-container" style={{ position: 'relative', width: '1300px', height: '680px', margin: '0 auto' }}>
        <canvas 
          ref={canvasRef}
          style={{ width: '1300px', height: '680px', display: 'block' }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />
        
        {championName && (
          <div 
            className="champion-podium fade-in" 
            style={{ 
              position: 'absolute', 
              top: '410px', 
              left: '575px', 
              width: '150px', 
              boxSizing: 'border-box' 
            }}
          >
            <span className="trophy">🏆</span>
            <h4>CHAMPION</h4>
            <div className="champion-name">{championName}</div>
          </div>
        )}
      </div>
    </div>
  );
}
