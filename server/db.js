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
function setupSchema() {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        // Enable foreign keys
        await run('PRAGMA foreign_keys = ON');

        // 1. Tournaments
        await run(`
          CREATE TABLE IF NOT EXISTS tournaments (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // 2. Matchups (with feeder foreign key constraints)
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

        // 3. Games
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

        // 4. Watch Sessions
        await run(`
          CREATE TABLE IF NOT EXISTS watch_sessions (
            id TEXT PRIMARY KEY,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // 5. Progress
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
