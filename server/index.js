require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { db, run, all, get } = require('./db');
const { parseAndImportPlaylist } = require('./importer');
const { startScheduler, syncTournament } = require('./scheduler');

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
  let spoilerFree = 1;

  if (sessionId) {
    const progressRows = await all('SELECT game_id, status FROM progress WHERE session_id = ?', [sessionId]);
    for (const p of progressRows) {
      progressMap.set(p.game_id, p.status);
    }
    
    const settings = await get('SELECT spoiler_free FROM session_tournaments WHERE session_id = ? AND tournament_id = ?', [sessionId, tournamentId]);
    if (settings) {
      spoilerFree = settings.spoiler_free;
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
    if (spoilerFree === 1) {
      if (tournament.type === 'linear') {
        if (m.sequence > 1) {
          const precedingMatchup = matchups.find(pm => pm.sequence === m.sequence - 1);
          if (precedingMatchup) {
            const precedingResolved = resolvedMap.get(precedingMatchup.id);
            if (!precedingResolved) isLocked = true;
          }
        }
      } else {
        // bracket type
        if (m.feeder_a_id) {
          const parentAResolved = resolvedMap.get(m.feeder_a_id);
          if (!parentAResolved) isLocked = true;
        }
        if (m.feeder_b_id) {
          const parentBResolved = resolvedMap.get(m.feeder_b_id);
          if (!parentBResolved) isLocked = true;
        }
      }
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
    spoiler_free: spoilerFree,
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

// Database & Seeding Health Check
app.get('/api/dbhealth', asyncHandler(async (req, res) => {
  try {
    const result = await get('SELECT id FROM tournaments LIMIT 1');
    if (!result) {
      return res.status(503).json({ status: 'seeding', message: 'Database tables initialized but empty' });
    }
    res.json({ status: 'ok', database: 'connected', tournamentId: result.id });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
}));

// List all tournaments joined with session status
app.get('/api/tournaments', asyncHandler(async (req, res) => {
  const sessionId = req.query.session_id;
  let tournaments;
  if (sessionId) {
    tournaments = await all(`
      SELECT t.*, 
             COALESCE(st.is_watched, 0) as is_watched, 
             COALESCE(st.is_watching, 0) as is_watching,
             COALESCE(st.spoiler_free, 1) as spoiler_free
      FROM tournaments t
      LEFT JOIN session_tournaments st ON t.id = st.tournament_id AND st.session_id = ?
      ORDER BY t.created_at DESC
    `, [sessionId]);
  } else {
    tournaments = await all('SELECT *, 0 as is_watched, 0 as is_watching, 1 as spoiler_free FROM tournaments ORDER BY created_at DESC');
  }
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

  // Calculate and update session_tournaments status
  const tournamentInfo = await get(`
    SELECT m.tournament_id 
    FROM games g
    JOIN matchups m ON g.matchup_id = m.id
    WHERE g.id = ?
  `, [gameId]);

  if (tournamentInfo) {
    const tournamentId = tournamentInfo.tournament_id;
    const totalGamesRow = await get(`
      SELECT COUNT(g.id) as total
      FROM games g
      JOIN matchups m ON g.matchup_id = m.id
      WHERE m.tournament_id = ?
    `, [tournamentId]);

    const completedGamesRow = await get(`
      SELECT COUNT(p.id) as completed
      FROM progress p
      JOIN games g ON p.game_id = g.id
      JOIN matchups m ON g.matchup_id = m.id
      WHERE p.session_id = ? AND m.tournament_id = ? AND p.status IN ('watched', 'skipped')
    `, [sessionId, tournamentId]);

    const total = totalGamesRow ? totalGamesRow.total : 0;
    const completed = completedGamesRow ? completedGamesRow.completed : 0;

    let isWatched = 0;
    let isWatching = 0;

    if (completed === 0) {
      isWatched = 0;
      isWatching = 0;
    } else if (completed < total) {
      isWatched = 0;
      isWatching = 1;
    } else {
      isWatched = 1;
      isWatching = 0;
    }

    await run(`
      INSERT INTO session_tournaments (session_id, tournament_id, is_watched, is_watching, spoiler_free)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(session_id, tournament_id)
      DO UPDATE SET 
        is_watched = excluded.is_watched,
        is_watching = excluded.is_watching
    `, [sessionId, tournamentId, isWatched, isWatching]);
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

// Update tournament settings for a session (spoiler-free, manual is_watched override)
app.post('/api/sessions/:sessionId/tournaments/:tournamentId/settings', asyncHandler(async (req, res) => {
  const { sessionId, tournamentId } = req.params;
  const { spoilerFree, isWatched } = req.body;

  // Verify session
  const session = await get('SELECT id FROM watch_sessions WHERE id = ?', [sessionId]);
  if (!session) {
    return res.status(404).json({ error: 'Watch session not found' });
  }

  // Verify tournament
  const tournament = await get('SELECT id FROM tournaments WHERE id = ?', [tournamentId]);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  // Load existing settings or insert defaults
  const existing = await get('SELECT * FROM session_tournaments WHERE session_id = ? AND tournament_id = ?', [sessionId, tournamentId]);
  
  const nextSpoilerFree = spoilerFree !== undefined ? (spoilerFree ? 1 : 0) : (existing ? existing.spoiler_free : 1);
  const nextIsWatched = isWatched !== undefined ? (isWatched ? 1 : 0) : (existing ? existing.is_watched : 0);
  const nextIsWatching = existing ? existing.is_watching : 0;

  await run(`
    INSERT INTO session_tournaments (session_id, tournament_id, is_watched, is_watching, spoiler_free)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(session_id, tournament_id)
    DO UPDATE SET
      is_watched = excluded.is_watched,
      spoiler_free = excluded.spoiler_free
  `, [sessionId, tournamentId, nextIsWatched, nextIsWatching, nextSpoilerFree]);

  res.json({ success: true, spoilerFree: nextSpoilerFree === 1, isWatched: nextIsWatched === 1 });
}));

// Trigger a manual sync for a tournament (Admin only)
app.post('/api/tournaments/:id/sync', asyncHandler(async (req, res) => {
  const tournamentId = req.params.id;
  const authHeader = req.headers.authorization;
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
    return res.status(401).json({ error: 'Unauthorized manual sync request' });
  }

  await syncTournament(tournamentId);
  res.json({ success: true, message: `Sync completed for tournament: ${tournamentId}` });
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
  // Start background sync scheduler
  try {
    startScheduler();
  } catch (err) {
    console.error('[Server] Failed to start background sync scheduler:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

module.exports = app;
