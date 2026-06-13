import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDbPath = path.join(__dirname, 'test_importer.sqlite');

// Set DATABASE_PATH env var before importing db
process.env.DATABASE_PATH = testDbPath;
process.env.YOUTUBE_API_KEY = 'fake-api-key-for-testing';

let db;
let parseAndImportPlaylist;

const mockPlaylistItemsPage1 = {
  nextPageToken: 'page2',
  items: [
    // Celtics vs 76ers - Game 1 (Duplicate: Non-extended)
    {
      snippet: {
        title: '#2 CELTICS at #7 76ERS | First Round GAME 1 HIGHLIGHTS',
        publishedAt: '2026-04-19T10:00:00Z'
      },
      contentDetails: {
        videoId: 'video-celtics-76ers-g1-normal'
      }
    },
    // Celtics vs 76ers - Game 1 (Duplicate: Extended - should take priority)
    {
      snippet: {
        title: 'EXTENDED: #2 CELTICS at #7 76ERS | First Round GAME 1 HIGHLIGHTS',
        publishedAt: '2026-04-19T10:30:00Z'
      },
      contentDetails: {
        videoId: 'video-celtics-76ers-g1-extended'
      }
    },
    // Celtics vs 76ers - Game 2
    {
      snippet: {
        title: '#2 CELTICS at #7 76ERS | First Round GAME 2 HIGHLIGHTS',
        publishedAt: '2026-04-21T10:00:00Z'
      },
      contentDetails: {
        videoId: 'video-celtics-76ers-g2'
      }
    }
  ]
};

const mockPlaylistItemsPage2 = {
  items: [
    // Knicks vs Hawks - Game 1
    {
      snippet: {
        title: '#3 KNICKS at #6 HAWKS | First Round GAME 1 HIGHLIGHTS',
        publishedAt: '2026-04-18T10:00:00Z'
      },
      contentDetails: {
        videoId: 'video-knicks-hawks-g1'
      }
    },
    // Semifinals - Knicks vs 76ers - Game 1
    {
      snippet: {
        title: 'EXTENDED: #3 KNICKS at #7 76ERS | Semifinals GAME 1 HIGHLIGHTS',
        publishedAt: '2026-05-04T10:00:00Z'
      },
      contentDetails: {
        videoId: 'video-semis-knicks-76ers-g1'
      }
    }
  ]
};

beforeAll(async () => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Load db and setup schema
  const dbModule = await import('../db');
  db = dbModule.db;
  await dbModule.setupSchema();

  // Load importer dynamically
  const importerModule = await import('../importer');
  parseAndImportPlaylist = importerModule.parseAndImportPlaylist;
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

describe('YouTube Playlist Importer Logic Tests', () => {
  it('should fetch paginated playlist items and parse them correctly using template', async () => {
    // Mock global fetch to handle pages
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url.includes('pageToken=page2')) {
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve(mockPlaylistItemsPage2),
          text: () => Promise.resolve(JSON.stringify(mockPlaylistItemsPage2))
        });
      } else {
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve(mockPlaylistItemsPage1),
          text: () => Promise.resolve(JSON.stringify(mockPlaylistItemsPage1))
        });
      }
    });

    const result = await parseAndImportPlaylist({
      playlistId: 'mock-playlist-id',
      tournamentId: 'mock-tournament',
      title: 'Mock Tournament',
      description: 'Mocking YouTube playlist imports',
      presetName: 'nba'
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.matchupCount).toBe(3); // Celtics vs 76ers, Knicks vs Hawks, Knicks vs 76ers
    expect(result.gameCount).toBe(4);    // 2 first round games for Celtics, 1 for Knicks, 1 semis game

    // Check that we resolved tournament
    const dbModule = await import('../db');
    const tournament = await dbModule.get("SELECT * FROM tournaments WHERE id = 'mock-tournament'");
    expect(tournament).toBeDefined();
    expect(tournament.title).toBe('Mock Tournament');

    // Check that matchups exist
    const matchups = await dbModule.all("SELECT * FROM matchups WHERE tournament_id = 'mock-tournament' ORDER BY sequence ASC");
    expect(matchups.length).toBe(3);

    // Verify sequence stage-ordering
    expect(matchups[0].stage_name).toBe('First Round');
    expect(matchups[1].stage_name).toBe('First Round');
    expect(matchups[2].stage_name).toBe('Semifinals');

    // Verify deduplication: Celtics vs 76ers Game 1 must be the EXTENDED version
    const g1 = await dbModule.get("SELECT * FROM games WHERE matchup_id = 'first-round-76ers-vs-celtics' AND game_number = 1");
    expect(g1.video_id).toBe('video-celtics-76ers-g1-extended');
    expect(g1.title).toContain('EXTENDED:');

    // Verify dynamic feeder linkage
    // Semifinals (Knicks vs 76ers) should have feeder A and B pointing to First Round Knicks vs Hawks and Celtics vs 76ers
    const semis = matchups.find(m => m.stage_name === 'Semifinals');
    expect(semis.feeder_a_id).toBe('first-round-76ers-vs-celtics');
    expect(semis.feeder_b_id).toBe('first-round-hawks-vs-knicks');

    // Cleanup mock spy
    fetchSpy.mockRestore();
  });
});
