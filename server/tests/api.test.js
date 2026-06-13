import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDbPath = path.join(__dirname, 'test_api.sqlite');

// Set DATABASE_PATH env var before importing app
process.env.DATABASE_PATH = testDbPath;

let app;
let db;
let seedData;

beforeAll(async () => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Load app dynamically to ensure process.env.DATABASE_PATH is set first
  const appModule = await import('../index');
  app = appModule.default;

  // Load db and seed dynamically
  const dbModule = await import('../db');
  db = dbModule.db;

  const seedModule = await import('../seed');
  seedData = seedModule.seedData;

  // Run migrations and seed
  await seedData();
});

afterAll(async () => {
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

describe('Backend API Integration Tests', () => {
  let sessionId;

  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/tournaments should list tournaments', async () => {
    const res = await request(app).get('/api/tournaments');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe('nba-playoffs-2026');
  });

  it('POST /api/sessions should create a new watch session', async () => {
    const res = await request(app).post('/api/sessions');
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    sessionId = res.body.id;
  });

  it('GET /api/sessions/:id/progress should return empty map initially', async () => {
    const res = await request(app).get(`/api/sessions/${sessionId}/progress`);
    expect(res.status).toBe(200);
    expect(res.body.progress).toEqual({});
  });

  it('GET /api/tournaments/nba-playoffs-2026 should enforce locks and placeholders initially', async () => {
    const res = await request(app)
      .get('/api/tournaments/nba-playoffs-2026')
      .query({ session_id: sessionId });

    expect(res.status).toBe(200);
    
    // First round matchups must be unlocked
    const firstRound = res.body.matchups.filter(m => m.stageName === 'First Round');
    expect(firstRound.length).toBe(8);
    for (const m of firstRound) {
      expect(m.isLocked).toBe(false);
      expect(m.contenderA).not.toContain('Winner of');
      expect(m.contenderB).not.toContain('Winner of');
      // Initially, only Game 1 is visible (the first unwatched)
      expect(m.games.length).toBe(1);
      expect(m.games[0].game_number).toBe(1);
    }

    // Later rounds must be locked
    const laterMatchups = res.body.matchups.filter(m => m.stageName !== 'First Round');
    for (const m of laterMatchups) {
      expect(m.isLocked).toBe(true);
      expect(m.contenderA).toContain('Winner of');
      expect(m.contenderB).toContain('Winner of');
      expect(m.title).toContain('Winner of'); // Verify title masking
      expect(m.games).toEqual([]);
    }
  });

  it('should unlock subsequent games sequentially as previous games are watched', async () => {
    // 1. Mark Celtics vs 76ers Game 1 as watched
    const progressRes = await request(app)
      .post(`/api/sessions/${sessionId}/progress`)
      .send({ gameId: 'full-76ers-vs-celtics-game-1', status: 'watched' });
    expect(progressRes.status).toBe(200);

    // 2. Query progress map
    const progressMapRes = await request(app).get(`/api/sessions/${sessionId}/progress`);
    expect(progressMapRes.body.progress['full-76ers-vs-celtics-game-1']).toBe('watched');

    // 3. Query tournament matchups again
    const res = await request(app)
      .get('/api/tournaments/nba-playoffs-2026')
      .query({ session_id: sessionId });

    const celticsMatchup = res.body.matchups.find(m => m.id === 'full-76ers-vs-celtics');
    // Celtics matchup should now return Game 1 (watched) AND Game 2 (unwatched - the next sequential gate)
    expect(celticsMatchup.games.length).toBe(2);
    expect(celticsMatchup.games[0].game_number).toBe(1);
    expect(celticsMatchup.games[0].status).toBe('watched');
    expect(celticsMatchup.games[1].game_number).toBe(2);
    expect(celticsMatchup.games[1].status).toBe('unwatched');
  });

  it('GET /api/tournaments/nba-playoffs-2026/timeline should filter timeline dynamically', async () => {
    // With Game 1 of Celtics vs 76ers watched, the timeline should contain:
    // Game 1 of the other 7 matchups + Game 1 of Celtics (watched) + Game 2 of Celtics (first unwatched)
    // Total = 9 games
    const res = await request(app)
      .get('/api/tournaments/nba-playoffs-2026/timeline')
      .query({ session_id: sessionId });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(9);

    // Verify chronological order (sorting of dates)
    const dates = res.body.map(g => new Date(g.date));
    const sortedDates = [...dates].sort((a, b) => a - b);
    expect(dates).toEqual(sortedDates);
  });

  it('POST /api/sessions/:id/clone should clone session progress correctly', async () => {
    // Clone our session
    const cloneRes = await request(app).post(`/api/sessions/${sessionId}/clone`);
    expect(cloneRes.status).toBe(201);
    
    const cloneSessionId = cloneRes.body.id;
    expect(cloneSessionId).toBeDefined();
    expect(cloneSessionId).not.toBe(sessionId);

    // Verify progress matches
    const progressRes = await request(app).get(`/api/sessions/${cloneSessionId}/progress`);
    expect(progressRes.body.progress['full-76ers-vs-celtics-game-1']).toBe('watched');

    // Verify modifying clone does not affect original
    await request(app)
      .post(`/api/sessions/${cloneSessionId}/progress`)
      .send({ gameId: 'full-76ers-vs-celtics-game-2', status: 'skipped' });

    const originalProgress = await request(app).get(`/api/sessions/${sessionId}/progress`);
    const clonedProgress = await request(app).get(`/api/sessions/${cloneSessionId}/progress`);

    expect(originalProgress.body.progress['full-76ers-vs-celtics-game-2']).toBeUndefined();
    expect(clonedProgress.body.progress['full-76ers-vs-celtics-game-2']).toBe('skipped');
  });

  it('should return 404 for non-existent session/tournament requests', async () => {
    const invalidSession = await request(app).get('/api/sessions/non-existent-session/progress');
    expect(invalidSession.status).toBe(404);

    const invalidTournament = await request(app).get('/api/tournaments/non-existent-tournament');
    expect(invalidTournament.status).toBe(404);
  });
});
