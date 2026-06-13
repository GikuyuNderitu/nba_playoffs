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
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [containerWidth, setContainerWidth] = useState(1300);

  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      if (width > 0) {
        setContainerWidth(width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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

    const scale = rect.width / 1300;
    ctx.scale(dpr * scale, dpr * scale);

    // Clear canvas
    ctx.clearRect(0, 0, 1300, 680);

    // Draw Conference Labels
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0, 242, 254, 0.4)';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#00f2fe';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EASTERN CONFERENCE', 270, 12);
    ctx.fillText('WESTERN CONFERENCE', 1030, 12);
    ctx.restore();

    // Draw Column Headers (Stage Names)
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const stageHeaders = [
      { name: 'FIRST ROUND', x: 90 },
      { name: 'CONF. SEMIFINALS', x: 270 },
      { name: 'CONF. FINALS', x: 450 },
      { name: 'NBA FINALS', x: 650 },
      { name: 'CONF. FINALS', x: 850 },
      { name: 'CONF. SEMIFINALS', x: 1030 },
      { name: 'FIRST ROUND', x: 1210 }
    ];

    stageHeaders.forEach(sh => {
      ctx.fillText(sh.name, sh.x, 32);
    });

    // Draw connection lines programmatically based on parent-child matchups
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0, 242, 254, 0.15)';

    nodes.forEach(childNode => {
      const { matchup } = childNode;
      const feeders = [matchup.feederAId, matchup.feederBId].filter(Boolean);

      feeders.forEach(feederId => {
        const parentNode = nodes.find(n => n.matchup.id === feederId);
        if (parentNode) {
          ctx.beginPath();
          const pY = parentNode.y + parentNode.h / 2;
          const cY = childNode.y + childNode.h / 2;

          if (parentNode.x < childNode.x) {
            // Left to right connector
            const pX = parentNode.x + parentNode.w;
            const cX = childNode.x;
            const midX = pX + (cX - pX) / 2;

            ctx.moveTo(pX, pY);
            ctx.lineTo(midX, pY);
            ctx.lineTo(midX, cY);
            ctx.lineTo(cX, cY);
          } else {
            // Right to left connector
            const pX = parentNode.x;
            const cX = childNode.x + childNode.w;
            const midX = pX - (pX - cX) / 2;

            ctx.moveTo(pX, pY);
            ctx.lineTo(midX, pY);
            ctx.lineTo(midX, cY);
            ctx.lineTo(cX, cY);
          }
          ctx.stroke();
        }
      });
    });
    ctx.restore();

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

      if (!isLocked) {
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
          : '#ffffff';
        
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
          : '#ffffff';

        let nameB = contenderB;
        if (ctx.measureText(nameB).width > w - 30) {
          nameB = nameB.substring(0, 10) + '...';
        }
        ctx.fillText(nameB, x + 12, y + 54);
        if (isWinnerB) {
          ctx.fillText('🏆', x + w - 24, y + 54);
        }
      } else {
        // Lock Overlay with Lock Icon in center, no text bleed
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒 Locked', x + w / 2, y + h / 2);
      }
    });
  }, [matchups, hoveredNode, containerWidth]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / 1300;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

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
    const scale = rect.width / 1300;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

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
  const scale = containerWidth / 1300;

  return (
    <div className="bracket-wrapper">
      <div 
        ref={containerRef}
        className="bracket-tree-canvas-container" 
        style={{ 
          position: 'relative', 
          width: '100%', 
          maxWidth: '1300px', 
          aspectRatio: '1300/680',
          margin: '0 auto' 
        }}
      >
        <canvas 
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />
        
        {championName && (
          <div 
            className="champion-podium fade-in" 
            style={{ 
              position: 'absolute', 
              top: `${410 * scale}px`, 
              left: `${575 * scale}px`, 
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              boxSizing: 'border-box' 
            }}
          >
            <span className="trophy-float">🏆</span>
            <h4 className="champion-podium-h4">CHAMPION</h4>
            <div className="champion-podium-name">{championName}</div>
          </div>
        )}
      </div>
    </div>
  );
}
