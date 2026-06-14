require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database.sqlite');

// Ensure parent directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[Database] Error opening database:', err.message);
  } else {
    console.log('[Database] Connected to SQLite database at:', dbPath);
    db.configure('busyTimeout', 5000);
  }
});

// Helper to run query as a Promise
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Helper to get all rows
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Helper to get a single row
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Initialize tables
async function setupSchema() {
  // Check if tables already exist to optimize cold starts
  try {
    const tables = await all("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.map(t => t.name);
    const requiredTables = [
      'import_templates',
      'import_sources',
      'tournaments',
      'matchups',
      'games',
      'watch_sessions',
      'progress',
      'session_tournaments'
    ];
    const allExist = requiredTables.every(name => tableNames.includes(name));
    
    if (allExist) {
      await run('PRAGMA foreign_keys = ON');
      console.log('[Database] Schema already verified. Skipping table creation.');
      return;
    }
  } catch (err) {
    console.warn('[Database] Failed to verify schema existence, proceeding with setup:', err.message);
  }

  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        // Enable foreign keys
        await run('PRAGMA foreign_keys = ON');

        // 1. Import Templates
        await run(`
          CREATE TABLE IF NOT EXISTS import_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            patterns TEXT NOT NULL, -- JSON array of { gameRegex, fallbackRegex }
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // 2. Import Sources
        await run(`
          CREATE TABLE IF NOT EXISTS import_sources (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            source_type TEXT NOT NULL, -- 'youtube_playlist', etc.
            resource TEXT NOT NULL, -- e.g., playlist ID
            import_template_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (import_template_id) REFERENCES import_templates(id) ON DELETE CASCADE
          )
        `);

        // 3. Tournaments
        await run(`
          CREATE TABLE IF NOT EXISTS tournaments (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL,
            source_id TEXT,
            last_sync_at DATETIME,
            completed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (source_id) REFERENCES import_sources(id) ON DELETE SET NULL
          )
        `);

        // Ensure columns exist on tournaments if the table was created before
        try {
          await run("ALTER TABLE tournaments ADD COLUMN source_id TEXT");
        } catch (e) {}
        try {
          await run("ALTER TABLE tournaments ADD COLUMN last_sync_at DATETIME");
        } catch (e) {}
        try {
          await run("ALTER TABLE tournaments ADD COLUMN completed INTEGER DEFAULT 0");
        } catch (e) {}

        // 4. Matchups (with feeder foreign key constraints)
        await run(`
          CREATE TABLE IF NOT EXISTS matchups (
            id TEXT PRIMARY KEY,
            tournament_id TEXT NOT NULL,
            title TEXT NOT NULL,
            stage_name TEXT NOT NULL,
            sequence INTEGER NOT NULL,
            feeder_a_id TEXT,
            feeder_b_id TEXT,
            FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
            FOREIGN KEY (feeder_a_id) REFERENCES matchups(id) ON DELETE SET NULL,
            FOREIGN KEY (feeder_b_id) REFERENCES matchups(id) ON DELETE SET NULL
          )
        `);

        // 5. Games
        await run(`
          CREATE TABLE IF NOT EXISTS games (
            id TEXT PRIMARY KEY,
            matchup_id TEXT NOT NULL,
            game_number INTEGER NOT NULL,
            title TEXT NOT NULL,
            team_a TEXT NOT NULL,
            team_b TEXT NOT NULL,
            date TEXT NOT NULL,
            video_id TEXT NOT NULL,
            duration TEXT NOT NULL,
            FOREIGN KEY (matchup_id) REFERENCES matchups(id) ON DELETE CASCADE
          )
        `);

        // 6. Watch Sessions
        await run(`
          CREATE TABLE IF NOT EXISTS watch_sessions (
            id TEXT PRIMARY KEY,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // 7. Progress
        await run(`
          CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('watched', 'skipped')),
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES watch_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
            UNIQUE (session_id, game_id)
          )
        `);

        // 8. Session Tournaments Progress & Settings
        await run(`
          CREATE TABLE IF NOT EXISTS session_tournaments (
            session_id TEXT NOT NULL,
            tournament_id TEXT NOT NULL,
            is_watched INTEGER DEFAULT 0,
            is_watching INTEGER DEFAULT 0,
            spoiler_free INTEGER DEFAULT 1,
            PRIMARY KEY (session_id, tournament_id),
            FOREIGN KEY (session_id) REFERENCES watch_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
          )
        `);

        console.log('[Database] Schema setup successfully.');
        resolve();
      } catch (err) {
        console.error('[Database] Schema setup failed:', err.message);
        reject(err);
      }
    });
  });
}

module.exports = {
  db,
  run,
  all,
  get,
  setupSchema,
  dbPath
};
