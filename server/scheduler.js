const { all, get, run } = require('./db');
const { parseAndImportPlaylist } = require('./importer');

// Track currently active sync tasks to prevent concurrent syncs on the same tournament
const activeSyncs = new Set();

/**
 * Perform synchronization for a single tournament
 * @param {string} tournamentId 
 */
async function syncTournament(tournamentId) {
  if (activeSyncs.has(tournamentId)) {
    console.log(JSON.stringify({
      level: 'warn',
      event: 'sync_skipped',
      tournament_id: tournamentId,
      reason: 'Sync already in progress',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  activeSyncs.add(tournamentId);
  const startTime = Date.now();

  console.log(JSON.stringify({
    level: 'info',
    event: 'sync_started',
    tournament_id: tournamentId,
    timestamp: new Date().toISOString()
  }));

  try {
    const tourn = await get(`
      SELECT t.*, s.resource as playlist_id, s.import_template_id as preset_name, s.id as source_id
      FROM tournaments t
      JOIN import_sources s ON t.source_id = s.id
      WHERE t.id = ?
    `, [tournamentId]);

    if (!tourn) {
      console.warn(JSON.stringify({
        level: 'warn',
        event: 'sync_skipped',
        tournament_id: tournamentId,
        reason: 'No import source configured',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    const result = await parseAndImportPlaylist({
      playlistId: tourn.playlist_id,
      tournamentId: tourn.id,
      title: tourn.title,
      description: tourn.description,
      type: tourn.type,
      presetName: tourn.preset_name,
      sourceId: tourn.source_id
    });

    // Update last sync time
    await run('UPDATE tournaments SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?', [tournamentId]);
    
    const durationMs = Date.now() - startTime;
    console.log(JSON.stringify({
      level: 'info',
      event: 'sync_completed',
      tournament_id: tournamentId,
      duration_ms: durationMs,
      matchups_upserted: result.matchupCount,
      games_upserted: result.gameCount,
      status: 'success',
      timestamp: new Date().toISOString()
    }));
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(JSON.stringify({
      level: 'error',
      event: 'sync_failed',
      tournament_id: tournamentId,
      duration_ms: durationMs,
      error_message: err.message,
      status: 'failed',
      timestamp: new Date().toISOString()
    }));
  } finally {
    activeSyncs.delete(tournamentId);
  }
}

/**
 * Decoupled Queue abstraction so that setInterval can be easily replaced by
 * a real message queue (e.g. BullMQ, RabbitMQ, SQS) in the future.
 */
const SyncQueue = {
  enqueue: async (tournamentId) => {
    // Process immediately in background (current simple scale implementation)
    // In a distributed queue setup, this would publish a message/job to the queue worker.
    syncTournament(tournamentId);
  }
};

/**
 * Retrieve and sync all uncompleted tournaments that have an import source
 */
async function runAllActiveSyncs() {
  console.log('[Scheduler] Scanning database for active, uncompleted tournaments to sync...');
  try {
    const activeTournaments = await all(`
      SELECT id FROM tournaments 
      WHERE completed = 0 AND source_id IS NOT NULL
    `);
    
    if (activeTournaments.length === 0) {
      console.log('[Scheduler] No uncompleted tournaments with sync sources found.');
      return;
    }

    console.log(`[Scheduler] Found ${activeTournaments.length} active tournaments. Enqueuing sync jobs...`);
    for (const t of activeTournaments) {
      await SyncQueue.enqueue(t.id);
    }
  } catch (err) {
    console.error('[Scheduler] Failed to retrieve tournaments for scheduler sync:', err.message);
  }
}

let intervalId = null;

/**
 * Start the sync background scheduler loop
 * @param {number} intervalMs - Frequency of checks (default: 1 hour)
 */
function startScheduler(intervalMs = 60 * 60 * 1000) {
  if (intervalId) return;

  console.log(`[Scheduler] Initializing sync scheduler loop (runs every ${intervalMs / 1000}s)`);

  // 1. Startup check: trigger immediately after a brief delay
  setTimeout(() => {
    console.log('[Scheduler] Executing startup sync check...');
    runAllActiveSyncs();
  }, 3000);

  // 2. Periodic loop
  intervalId = setInterval(() => {
    runAllActiveSyncs();
  }, intervalMs);
}

/**
 * Stop the background scheduler
 */
function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Scheduler] Sync scheduler stopped.');
  }
}

module.exports = {
  SyncQueue,
  syncTournament,
  runAllActiveSyncs,
  startScheduler,
  stopScheduler
};
