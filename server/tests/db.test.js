import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDbPath = path.join(__dirname, 'test.sqlite');

let db, run, all, get, setupSchema;
let seedData;

describe('Database Schema & Seeding Unit Tests', () => {
  beforeAll(async () => {
    // Set env var before dynamically importing db.js so it connects to the test database
    process.env.DATABASE_PATH = testDbPath;

    // Delete test database if it exists from a previous aborted run
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Dynamically import CJS modules to respect process.env.DATABASE_PATH
    const dbModule = await import('../db');
    db = dbModule.db;
    run = dbModule.run;
    all = dbModule.all;
    get = dbModule.get;
    setupSchema = dbModule.setupSchema;

    const seedModule = await import('../seed');
    seedData = seedModule.seedData;
  });

  afterAll(async () => {
    // Close connection and clean up database file
    if (db) {
      await new Promise((resolve) => {
        db.close((err) => {
          if (err) console.error('Error closing database:', err.message);
          resolve();
        });
      });
    }
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should create database schema tables successfully', async () => {
    await setupSchema();

    // Verify all 5 tables exist
    const tables = await all("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('tournaments');
    expect(tableNames).toContain('matchups');
    expect(tableNames).toContain('games');
    expect(tableNames).toContain('watch_sessions');
    expect(tableNames).toContain('progress');
  });

  it('should enforce foreign key constraints', async () => {
    // Attempting to insert a matchup without a valid tournament should fail
    let errorOccurred = false;
    try {
      await run(`
        INSERT INTO matchups (id, tournament_id, title, stage_name, sequence)
        VALUES ('invalid-matchup', 'non-existent-tournament', 'Team A vs Team B', 'First Round', 1)
      `);
    } catch (err) {
      errorOccurred = true;
      expect(err.message).toContain('FOREIGN KEY constraint failed');
    }
    expect(errorOccurred).toBe(true);
  });

  it('should seed the database successfully with complete 2025-2026 NBA playoffs data', async () => {
    await seedData();

    // Verify 1 tournament is seeded
    const tournaments = await all('SELECT * FROM tournaments');
    expect(tournaments.length).toBe(1);
    expect(tournaments[0].id).toBe('nba-playoffs-2026');

    // Verify 15 matchups are seeded
    const matchups = await all('SELECT * FROM matchups');
    expect(matchups.length).toBe(15);

    // Verify 83 games are seeded
    const games = await all('SELECT * FROM games');
    expect(games.length).toBe(83);

    // Verify first matchup in sequence is CELTICS vs 76ERS
    const firstMatchup = await get('SELECT * FROM matchups ORDER BY sequence ASC LIMIT 1');
    expect(firstMatchup.id).toBe('full-76ers-vs-celtics');
    expect(firstMatchup.stage_name).toBe('First Round');
  });

  it('should set feeder matchup foreign keys correctly in later rounds', async () => {
    // The finals matchup should have feeders set to the conference finals matchups
    const finals = await get("SELECT * FROM matchups WHERE stage_name = 'NBA Finals'");
    expect(finals.feeder_a_id).toBe('full-cavaliers-vs-knicks');
    expect(finals.feeder_b_id).toBe('full-spurs-vs-thunder');
  });
});
