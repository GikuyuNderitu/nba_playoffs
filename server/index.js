require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { db, run, all, get } = require('./db');
const { parseAndImportPlaylist } = require('./importer');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Async helper to catch errors in Express routes
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================================================
// Helper: Resolve Bracket & Contenders dynamically for a session
// ============================================================================
async function resolveTournamentState(tournamentId, sessionId) {
  const tournament = await get('SELECT * FROM tournaments WHERE id = ?', [tournamentId]);
  if (!tournament) return null;

  const matchups = await all('SELECT * FROM matchups WHERE tournament_id = ? ORDER BY sequence ASC', [tournamentId]);
  const games = await all(`
    SELECT g.* FROM games g
    JOIN matchups m ON g.matchup_id = m.id
    WHERE m.tournament_id = ?
    ORDER BY g.game_number ASC
  `, [tournamentId]);

  let progressMap = new Map();
  if (sessionId) {
    const progressRows = await all('SELECT game_id, status FROM progress WHERE session_id = ?', [sessionId]);
    for (const p of progressRows) {
      progressMap.set(p.game_id, p.status);
    }
  }

  // Group games by matchup_id
  const gamesByMatchup = new Map();
  for (const g of games) {
    if (!gamesByMatchup.has(g.matchup_id)) {
      gamesByMatchup.set(g.matchup_id, []);
    }
    const status = progressMap.get(g.id) || 'unwatched';
    gamesByMatchup.get(g.matchup_id).push({ ...g, status });
  }

  const resolvedMap = new Map();
  const teamsMap = new Map();
  const matchupMap = new Map(matchups.map(m => [m.id, m]));
  const resolvedMatchups = [];

  for (const m of matchups) {
    const mGames = gamesByMatchup.get(m.id) || [];
    
    // Find actual teams of the matchup
    const mTeamsSet = new Set();
    for (const g of mGames) {
      mTeamsSet.add(g.team_a);
      mTeamsSet.add(g.team_b);
    }
    const mTeams = Array.from(mTeamsSet);
    teamsMap.set(m.id, mTeams);

    // Determine lock state
    let isLocked = false;
    if (m.feeder_a_id) {
      const parentAResolved = resolvedMap.get(m.feeder_a_id);
      if (!parentAResolved) isLocked = true;
    }
    if (m.feeder_b_id) {
      const parentBResolved = resolvedMap.get(m.feeder_b_id);
      if (!parentBResolved) isLocked = true;
    }

    // Resolve contenders
    let contenderA = '';
    let contenderB = '';

    const firstGame = mGames[0];
    const actualTeamA = firstGame ? firstGame.team_a : '';
    const actualTeamB = firstGame ? firstGame.team_b : '';

    if (!m.feeder_a_id) {
      contenderA = actualTeamA;
    } else {
      const feederA = matchupMap.get(m.feeder_a_id);
      const parentAResolved = resolvedMap.get(m.feeder_a_id);
      if (parentAResolved) {
        const feederTeams = teamsMap.get(m.feeder_a_id) || [];
        contenderA = feederTeams.find(t => mTeams.includes(t)) || 'TBD';
      } else {
        const feederLabel = feederA.stage_name === 'First Round' 
          ? (feederA.title || 'First Round')
          : feederA.stage_name;
        contenderA = `Winner of ${feederLabel}`;
      }
    }

    if (!m.feeder_b_id) {
      contenderB = actualTeamB;
    } else {
      const feederB = matchupMap.get(m.feeder_b_id);
      const parentBResolved = resolvedMap.get(m.feeder_b_id);
      if (parentBResolved) {
        const feederTeams = teamsMap.get(m.feeder_b_id) || [];
        contenderB = feederTeams.find(t => mTeams.includes(t)) || 'TBD';
      } else {
        const feederLabel = feederB.stage_name === 'First Round' 
          ? (feederB.title || 'First Round')
          : feederB.stage_name;
        contenderB = `Winner of ${feederLabel}`;
      }
    }

    // Check if this matchup is resolved (all visible/actual games completed)
    let isResolved = false;
    if (!isLocked && mGames.length > 0) {
      isResolved = mGames.every(g => g.status === 'watched' || g.status === 'skipped');
    }
    resolvedMap.set(m.id, isResolved);

    // Determine visible games (slice up to first unwatched game)
    let visibleGames = [];
    if (!isLocked) {
      const firstUnwatchedIdx = mGames.findIndex(g => g.status === 'unwatched');
      if (firstUnwatchedIdx === -1) {
        visibleGames = mGames;
      } else {
        visibleGames = mGames.slice(0, firstUnwatchedIdx + 1);
      }
    }

    resolvedMatchups.push({
      id: m.id,
      title: isLocked ? `${contenderA} vs ${contenderB}` : m.title,
      stageName: m.stage_name,
      sequence: m.sequence,
      feederAId: m.feeder_a_id,
      feederBId: m.feeder_b_id,
      contenderA,
      contenderB,
      isLocked,
      games: visibleGames
    });
  }

  return {
    ...tournament,
    matchups: resolvedMatchups
  };
}

// ============================================================================
// API Routes
// ============================================================================

// Base health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List all tournaments
app.get('/api/tournaments', asyncHandler(async (req, res) => {
  const tournaments = await all('SELECT * FROM tournaments ORDER BY created_at DESC');
  res.json(tournaments);
}));

// Create a new session
app.post('/api/sessions', asyncHandler(async (req, res) => {
  const sessionId = crypto.randomUUID();
  await run('INSERT INTO watch_sessions (id) VALUES (?)', [sessionId]);
  res.status(201).json({ id: sessionId });
}));

// Clone an existing session
app.post('/api/sessions/:id/clone', asyncHandler(async (req, res) => {
  const sourceSessionId = req.params.id;

  // Verify source session exists
  const sourceSession = await get('SELECT id FROM watch_sessions WHERE id = ?', [sourceSessionId]);
  if (!sourceSession) {
    return res.status(404).json({ error: 'Source watch session not found' });
  }

  const newSessionId = crypto.randomUUID();
  await run('INSERT INTO watch_sessions (id) VALUES (?)', [newSessionId]);

  // Copy progress
  await run(`
    INSERT INTO progress (session_id, game_id, status)
    SELECT ?, game_id, status FROM progress WHERE session_id = ?
  `, [newSessionId, sourceSessionId]);

  res.status(201).json({ id: newSessionId });
}));

// Get progress for a session
app.get('/api/sessions/:id/progress', asyncHandler(async (req, res) => {
  const sessionId = req.params.id;

  // Verify session exists
  const session = await get('SELECT id FROM watch_sessions WHERE id = ?', [sessionId]);
  if (!session) {
    return res.status(404).json({ error: 'Watch session not found' });
  }

  const progressRows = await all('SELECT game_id, status FROM progress WHERE session_id = ?', [sessionId]);
  const progressMap = {};
  for (const row of progressRows) {
    progressMap[row.game_id] = row.status;
  }

  res.json({ progress: progressMap });
}));

// Save or toggle progress for a game
app.post('/api/sessions/:id/progress', asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  const { gameId, status } = req.body;

  if (!gameId || !status) {
    return res.status(400).json({ error: 'Missing gameId or status' });
  }

  if (!['watched', 'skipped', 'unwatched'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  // Verify session exists
  const session = await get('SELECT id FROM watch_sessions WHERE id = ?', [sessionId]);
  if (!session) {
    return res.status(404).json({ error: 'Watch session not found' });
  }

  // Verify game exists
  const game = await get('SELECT id FROM games WHERE id = ?', [gameId]);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  if (status === 'unwatched') {
    await run('DELETE FROM progress WHERE session_id = ? AND game_id = ?', [sessionId, gameId]);
  } else {
    await run(`
      INSERT INTO progress (session_id, game_id, status)
      VALUES (?, ?, ?)
      ON CONFLICT(session_id, game_id)
      DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP
    `, [sessionId, gameId, status]);
  }

  res.json({ success: true });
}));

// Get tournament details (matchups and visible games)
app.get('/api/tournaments/:id', asyncHandler(async (req, res) => {
  const tournamentId = req.params.id;
  const sessionId = req.query.session_id;

  if (sessionId) {
    const session = await get('SELECT id FROM watch_sessions WHERE id = ?', [sessionId]);
    if (!session) {
      return res.status(404).json({ error: 'Watch session not found' });
    }
  }

  const result = await resolveTournamentState(tournamentId, sessionId);
  if (!result) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  res.json(result);
}));

// Get tournament timeline (flattened, chronologically sorted list of visible games)
app.get('/api/tournaments/:id/timeline', asyncHandler(async (req, res) => {
  const tournamentId = req.params.id;
  const sessionId = req.query.session_id;

  if (sessionId) {
    const session = await get('SELECT id FROM watch_sessions WHERE id = ?', [sessionId]);
    if (!session) {
      return res.status(404).json({ error: 'Watch session not found' });
    }
  }

  const result = await resolveTournamentState(tournamentId, sessionId);
  if (!result) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  // Flatten visible games from all matchups
  const timelineGames = result.matchups.flatMap(m => m.games);

  // Sort chronologically by date
  timelineGames.sort((a, b) => new Date(a.date) - new Date(b.date));

  res.json(timelineGames);
}));

// Import a playlist dynamically as a tournament
app.post('/api/tournaments/import', asyncHandler(async (req, res) => {
  const { playlistId, tournamentId, title, description, type, presetName } = req.body;

  if (!playlistId || !tournamentId || !title) {
    return res.status(400).json({ error: 'Missing playlistId, tournamentId, or title' });
  }

  const result = await parseAndImportPlaylist({
    playlistId,
    tournamentId,
    title,
    description,
    type,
    presetName
  });

  res.json({ success: true, ...result });
}));

// ============================================================================
// Static Asset Serving & Global Error Handler
// ============================================================================

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  app.get('*splat', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global JSON Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.message);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
if (require.main === module) {
  const { setupSchema, get } = require('./db');
  const { seedData } = require('./seed');

  setupSchema()
    .then(async () => {
      const tournamentExists = await get('SELECT id FROM tournaments LIMIT 1');
      if (!tournamentExists) {
        console.log('[Server] Database is empty. Seeding initial playoffs data...');
        await seedData();
      }
    })
    .catch((err) => {
      console.error('[Server] Database schema initialization failed:', err.message);
    })
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`[Server] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      });
    });
}

module.exports = app;
