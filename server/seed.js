const { db, run, setupSchema } = require('./db');

const seedData = async () => {
  console.log('[Seed] Starting database seeding...');
  
  // Make sure schema exists
  await setupSchema();

  // Clean existing data
  console.log('[Seed] Cleaning existing data...');
  await run('DELETE FROM progress');
  await run('DELETE FROM watch_sessions');
  await run('DELETE FROM session_tournaments');
  await run('DELETE FROM games');
  await run('DELETE FROM matchups');
  await run('DELETE FROM tournaments');
  await run('DELETE FROM import_sources');
  await run('DELETE FROM import_templates');

  // Seed Import Templates
  console.log('[Seed] Seeding import templates...');
  await run(`
    INSERT INTO import_templates (id, name, patterns)
    VALUES (?, ?, ?)
  `, [
    'nba',
    'NBA Playoff Highlights Template',
    JSON.stringify([
      {
        gameRegex: '^(?:EXTENDED:\\s+)?#(\\d+)\\s+([A-Z0-9\\s]+?)\\s+at\\s+#(\\d+)\\s+([A-Z0-9\\s]+?)\\s*\\|\\s*([A-Z0-9\\s]+?)\\s+GAME\\s+(\\d+)\\s+HIGHLIGHTS',
        fallbackRegex: '^(?:EXTENDED:\\s+)?([A-Z0-9\\s#]+?)\\s+(?:at|vs)\\s+([A-Z0-9\\s#]+?)\\s*\\|\\s*([A-Z0-9\\s]+?)\\s+GAME\\s+(\\d+)\\s+HIGHLIGHTS'
      }
    ])
  ]);

  await run(`
    INSERT INTO import_templates (id, name, patterns)
    VALUES (?, ?, ?)
  `, [
    'generic',
    'Generic VS Match Template',
    JSON.stringify([
      {
        gameRegex: '^(?:EXTENDED:\\s+)?([A-Z0-9\\s#]+?)\\s+vs\\s+([A-Z0-9\\s#]+?)\\s*\\|\\s*([A-Z0-9\\s]+?)\\s+-\\s+Game\\s+(\\d+)',
        fallbackRegex: '^(?:EXTENDED:\\s+)?([A-Z0-9\\s#]+?)\\s+vs\\s+([A-Z0-9\\s#]+?)\\s*\\|\\s*([A-Z0-9\\s]+?)\\s+Game\\s+(\\d+)'
      }
    ])
  ]);

  // Seed Import Sources
  console.log('[Seed] Seeding import sources...');
  await run(`
    INSERT INTO import_sources (id, name, source_type, resource, import_template_id)
    VALUES (?, ?, ?, ?, ?)
  `, [
    'nba-playoffs-2026-source',
    'NBA Playoffs 2026 YouTube Playlist',
    'youtube_playlist',
    'PLlVlyGVtvuVnHNlPZ6vWeEuK2BNMF7c4t',
    'nba'
  ]);

  // 1. Insert Tournaments
  console.log('[Seed] Seeding tournaments...');
  await run(`
    INSERT INTO tournaments (id, title, description, type, source_id, completed)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    'nba-playoffs-2026',
    'NBA Playoffs | 2025-26 Season',
    'Experience the entire NBA Playoffs bracket from Round 1 through the NBA Finals in strict chronological order, completely spoiler-free.',
    'bracket',
    'nba-playoffs-2026-source',
    0
  ]);

  await run(`
    INSERT INTO tournaments (id, title, description, type, source_id, completed)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    'linear-mock-tournament',
    'FIFA World Cup Mock Group Stage',
    'Experience a mock soccer tournament group stage timeline, linear and spoiler-free.',
    'linear',
    null,
    0
  ]);

  // 2. Insert Matchups
  console.log('[Seed] Seeding matchups...');
  const matchups = [
  {
    "id": "full-76ers-vs-celtics",
    "title": "CELTICS vs 76ERS",
    "stageName": "First Round",
    "sequence": 1,
    "feederAId": null,
    "feederBId": null
  },
  {
    "id": "full-magic-vs-pistons",
    "title": "PISTONS vs MAGIC",
    "stageName": "First Round",
    "sequence": 2,
    "feederAId": null,
    "feederBId": null
  },
  {
    "id": "full-cavaliers-vs-raptors",
    "title": "CAVALIERS vs RAPTORS",
    "stageName": "First Round",
    "sequence": 3,
    "feederAId": null,
    "feederBId": null
  },
  {
    "id": "full-hawks-vs-knicks",
    "title": "KNICKS vs HAWKS",
    "stageName": "First Round",
    "sequence": 4,
    "feederAId": null,
    "feederBId": null
  },
  {
    "id": "full-suns-vs-thunder",
    "title": "THUNDER vs SUNS",
    "stageName": "First Round",
    "sequence": 5,
    "feederAId": null,
    "feederBId": null
  },
  {
    "id": "full-lakers-vs-rockets",
    "title": "LAKERS vs ROCKETS",
    "stageName": "First Round",
    "sequence": 6,
    "feederAId": null,
    "feederBId": null
  },
  {
    "id": "full-spurs-vs-trail-blazers",
    "title": "SPURS vs TRAIL BLAZERS",
    "stageName": "First Round",
    "sequence": 7,
    "feederAId": null,
    "feederBId": null
  },
  {
    "id": "full-nuggets-vs-timberwolves",
    "title": "TIMBERWOLVES vs NUGGETS",
    "stageName": "First Round",
    "sequence": 8,
    "feederAId": null,
    "feederBId": null
  },
  {
    "id": "full-76ers-vs-knicks",
    "title": "KNICKS vs 76ERS",
    "stageName": "Conference Semifinals",
    "sequence": 9,
    "feederAId": "full-hawks-vs-knicks",
    "feederBId": "full-76ers-vs-celtics"
  },
  {
    "id": "full-cavaliers-vs-pistons",
    "title": "CAVALIERS vs PISTONS",
    "stageName": "Conference Semifinals",
    "sequence": 10,
    "feederAId": "full-cavaliers-vs-raptors",
    "feederBId": "full-magic-vs-pistons"
  },
  {
    "id": "full-spurs-vs-timberwolves",
    "title": "SPURS vs TIMBERWOLVES",
    "stageName": "Conference Semifinals",
    "sequence": 11,
    "feederAId": "full-spurs-vs-trail-blazers",
    "feederBId": "full-nuggets-vs-timberwolves"
  },
  {
    "id": "full-lakers-vs-thunder",
    "title": "THUNDER vs LAKERS",
    "stageName": "Conference Semifinals",
    "sequence": 12,
    "feederAId": "full-lakers-vs-rockets",
    "feederBId": "full-suns-vs-thunder"
  },
  {
    "id": "full-cavaliers-vs-knicks",
    "title": "KNICKS vs CAVALIERS",
    "stageName": "Conference Finals",
    "sequence": 13,
    "feederAId": "full-76ers-vs-knicks",
    "feederBId": "full-cavaliers-vs-pistons"
  },
  {
    "id": "full-spurs-vs-thunder",
    "title": "SPURS vs THUNDER",
    "stageName": "Conference Finals",
    "sequence": 14,
    "feederAId": "full-spurs-vs-timberwolves",
    "feederBId": "full-lakers-vs-thunder"
  },
  {
    "id": "nba-finals-knicks-vs-spurs",
    "title": "KNICKS vs SPURS",
    "stageName": "NBA Finals",
    "sequence": 15,
    "feederAId": "full-cavaliers-vs-knicks",
    "feederBId": "full-spurs-vs-thunder"
  }
];
  
  for (const m of matchups) {
    await run(`
      INSERT INTO matchups (id, tournament_id, title, stage_name, sequence, feeder_a_id, feeder_b_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      m.id,
      'nba-playoffs-2026',
      m.title,
      m.stageName,
      m.sequence,
      m.feederAId,
      m.feederBId
    ]);
  }

  // 3. Insert Games
  console.log('[Seed] Seeding games...');
  const games = [
  {
    "id": "full-76ers-vs-celtics-game-1",
    "matchup_id": "full-76ers-vs-celtics",
    "game_number": 1,
    "title": "#7 76ERS at #2 CELTICS | FULL GAME 1 HIGHLIGHTS | April 19, 2026",
    "team_a": "CELTICS",
    "team_b": "76ERS",
    "date": "2026-04-19T19:53:37Z",
    "video_id": "Sv9N4IPSYzA",
    "duration": "15 minutes"
  },
  {
    "id": "full-76ers-vs-celtics-game-2",
    "matchup_id": "full-76ers-vs-celtics",
    "game_number": 2,
    "title": "#7 76ERS at #2 CELTICS | FULL GAME 2 HIGHLIGHTS | April 21, 2026",
    "team_a": "CELTICS",
    "team_b": "76ERS",
    "date": "2026-04-22T01:46:37Z",
    "video_id": "xeumsFo8qiM",
    "duration": "15 minutes"
  },
  {
    "id": "full-76ers-vs-celtics-game-3",
    "matchup_id": "full-76ers-vs-celtics",
    "game_number": 3,
    "title": "EXTENDED: #2 CELTICS at #7 76ERS | FULL GAME 3 HIGHLIGHTS | April 24, 2026",
    "team_a": "CELTICS",
    "team_b": "76ERS",
    "date": "2026-04-25T03:45:05Z",
    "video_id": "Z-_-wJPYTzE",
    "duration": "15 minutes"
  },
  {
    "id": "full-76ers-vs-celtics-game-4",
    "matchup_id": "full-76ers-vs-celtics",
    "game_number": 4,
    "title": "EXTENDED: #2 CELTICS at #7 76ERS | FULL GAME 4 HIGHLIGHTS | April 26, 2026",
    "team_a": "CELTICS",
    "team_b": "76ERS",
    "date": "2026-04-27T04:04:10Z",
    "video_id": "VvlK_HYlF2w",
    "duration": "15 minutes"
  },
  {
    "id": "full-76ers-vs-celtics-game-5",
    "matchup_id": "full-76ers-vs-celtics",
    "game_number": 5,
    "title": "EXTENDED: #7 76ERS at #2 CELTICS | FULL GAME 5 HIGHLIGHTS | April 28, 2026",
    "team_a": "CELTICS",
    "team_b": "76ERS",
    "date": "2026-04-29T04:01:56Z",
    "video_id": "qFKNThyMvDc",
    "duration": "15 minutes"
  },
  {
    "id": "full-76ers-vs-celtics-game-6",
    "matchup_id": "full-76ers-vs-celtics",
    "game_number": 6,
    "title": "EXTENDED: #2 CELTICS at #7 76ERS | FULL GAME 6 HIGHLIGHTS | April 30, 2026",
    "team_a": "CELTICS",
    "team_b": "76ERS",
    "date": "2026-05-01T04:06:50Z",
    "video_id": "3IBOWFI1KUA",
    "duration": "15 minutes"
  },
  {
    "id": "full-76ers-vs-celtics-game-7",
    "matchup_id": "full-76ers-vs-celtics",
    "game_number": 7,
    "title": "EXTENDED: #7 76ERS at #2 CELTICS | FULL GAME 7 HIGHLIGHTS | May 2, 2026",
    "team_a": "CELTICS",
    "team_b": "76ERS",
    "date": "2026-05-03T04:46:55Z",
    "video_id": "m7K0J4wzDn4",
    "duration": "15 minutes"
  },
  {
    "id": "full-magic-vs-pistons-game-1",
    "matchup_id": "full-magic-vs-pistons",
    "game_number": 1,
    "title": "PISTONS vs MAGIC | First Round Game 1 Highlights",
    "team_a": "PISTONS",
    "team_b": "MAGIC",
    "date": "2026-05-15T19:30:00Z",
    "video_id": "qXgiW5Cu_Mw",
    "duration": "15 minutes"
  },
  {
    "id": "full-magic-vs-pistons-game-2",
    "matchup_id": "full-magic-vs-pistons",
    "game_number": 2,
    "title": "PISTONS vs MAGIC | First Round Game 2 Highlights",
    "team_a": "PISTONS",
    "team_b": "MAGIC",
    "date": "2026-05-16T19:30:00Z",
    "video_id": "qXgiW5Cu_Mw",
    "duration": "15 minutes"
  },
  {
    "id": "full-magic-vs-pistons-game-3",
    "matchup_id": "full-magic-vs-pistons",
    "game_number": 3,
    "title": "EXTENDED: #1 PISTONS at #8 MAGIC | FULL GAME 3 HIGHLIGHTS | April 25, 2026",
    "team_a": "PISTONS",
    "team_b": "MAGIC",
    "date": "2026-04-25T22:39:52Z",
    "video_id": "qXgiW5Cu_Mw",
    "duration": "15 minutes"
  },
  {
    "id": "full-magic-vs-pistons-game-4",
    "matchup_id": "full-magic-vs-pistons",
    "game_number": 4,
    "title": "EXTENDED: #1 PISTONS at #8 MAGIC | FULL GAME 4 HIGHLIGHTS | April 27, 2026",
    "team_a": "PISTONS",
    "team_b": "MAGIC",
    "date": "2026-04-28T03:45:17Z",
    "video_id": "NQ1SjL6ScKo",
    "duration": "15 minutes"
  },
  {
    "id": "full-magic-vs-pistons-game-5",
    "matchup_id": "full-magic-vs-pistons",
    "game_number": 5,
    "title": "EXTENDED: #8 MAGIC at #1 PISTONS | FULL GAME 5 HIGHLIGHTS | April 29, 2026",
    "team_a": "PISTONS",
    "team_b": "MAGIC",
    "date": "2026-04-30T02:37:43Z",
    "video_id": "7uWYAXrWWGU",
    "duration": "15 minutes"
  },
  {
    "id": "full-magic-vs-pistons-game-6",
    "matchup_id": "full-magic-vs-pistons",
    "game_number": 6,
    "title": "EXTENDED: #1 PISTONS at #8 MAGIC | FULL GAME 6 HIGHLIGHTS | May 1, 2026",
    "team_a": "PISTONS",
    "team_b": "MAGIC",
    "date": "2026-05-02T03:22:55Z",
    "video_id": "38eP7PtYhKk",
    "duration": "15 minutes"
  },
  {
    "id": "full-magic-vs-pistons-game-7",
    "matchup_id": "full-magic-vs-pistons",
    "game_number": 7,
    "title": "EXTENDED: #8 MAGIC at #1 PISTONS | FULL GAME 7 HIGHLIGHTS | May 3, 2026",
    "team_a": "PISTONS",
    "team_b": "MAGIC",
    "date": "2026-05-03T23:49:38Z",
    "video_id": "pVOPlSiUJ5w",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-raptors-game-1",
    "matchup_id": "full-cavaliers-vs-raptors",
    "game_number": 1,
    "title": "CAVALIERS vs RAPTORS | First Round Game 1 Highlights",
    "team_a": "CAVALIERS",
    "team_b": "RAPTORS",
    "date": "2026-05-17T19:30:00Z",
    "video_id": "0ziLIqPZkK8",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-raptors-game-2",
    "matchup_id": "full-cavaliers-vs-raptors",
    "game_number": 2,
    "title": "#5 RAPTORS at #4 CAVALIERS | FULL GAME 2 HIGHLIGHTS | April 20, 2026",
    "team_a": "CAVALIERS",
    "team_b": "RAPTORS",
    "date": "2026-04-21T14:18:14Z",
    "video_id": "0ziLIqPZkK8",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-raptors-game-3",
    "matchup_id": "full-cavaliers-vs-raptors",
    "game_number": 3,
    "title": "EXTENDED: #4 CAVALIERS at #5 RAPTORS | FULL GAME 3 HIGHLIGHTS | April 23, 2026",
    "team_a": "CAVALIERS",
    "team_b": "RAPTORS",
    "date": "2026-04-24T04:06:00Z",
    "video_id": "b8o3PJxoT1E",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-raptors-game-4",
    "matchup_id": "full-cavaliers-vs-raptors",
    "game_number": 4,
    "title": "EXTENDED: #4 CAVALIERS at #5 RAPTORS | FULL GAME 4 HIGHLIGHTS | April 26, 2026",
    "team_a": "CAVALIERS",
    "team_b": "RAPTORS",
    "date": "2026-04-26T21:33:42Z",
    "video_id": "vt97tq-KYJw",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-raptors-game-5",
    "matchup_id": "full-cavaliers-vs-raptors",
    "game_number": 5,
    "title": "EXTENDED: #5 RAPTORS at #4 CAVALIERS | FULL GAME 5 HIGHLIGHTS | April 29, 2026",
    "team_a": "CAVALIERS",
    "team_b": "RAPTORS",
    "date": "2026-04-30T04:22:56Z",
    "video_id": "r868FbdclrA",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-raptors-game-6",
    "matchup_id": "full-cavaliers-vs-raptors",
    "game_number": 6,
    "title": "EXTENDED: #4 CAVALIERS at #5 RAPTORS | FULL GAME 6 HIGHLIGHTS | May 1, 2026",
    "team_a": "CAVALIERS",
    "team_b": "RAPTORS",
    "date": "2026-05-02T06:17:05Z",
    "video_id": "7bu46CsXGAQ",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-raptors-game-7",
    "matchup_id": "full-cavaliers-vs-raptors",
    "game_number": 7,
    "title": "EXTENDED: #5 RAPTORS at #4 CAVALIERS | FULL GAME 7 HIGHLIGHTS | May 3, 2026",
    "team_a": "CAVALIERS",
    "team_b": "RAPTORS",
    "date": "2026-05-04T04:17:42Z",
    "video_id": "_9r3CEWgH58",
    "duration": "15 minutes"
  },
  {
    "id": "full-hawks-vs-knicks-game-1",
    "matchup_id": "full-hawks-vs-knicks",
    "game_number": 1,
    "title": "#6 HAWKS at #3 KNICKS | FULL GAME 1 HIGHLIGHTS | April 18, 2026",
    "team_a": "KNICKS",
    "team_b": "HAWKS",
    "date": "2026-04-19T01:07:35Z",
    "video_id": "cDpGq-xlE6Y",
    "duration": "15 minutes"
  },
  {
    "id": "full-hawks-vs-knicks-game-2",
    "matchup_id": "full-hawks-vs-knicks",
    "game_number": 2,
    "title": "#6 HAWKS at #3 KNICKS | FULL GAME 2 HIGHLIGHTS | April 20, 2026",
    "team_a": "KNICKS",
    "team_b": "HAWKS",
    "date": "2026-04-21T14:18:14Z",
    "video_id": "frvbdAT5l7c",
    "duration": "15 minutes"
  },
  {
    "id": "full-hawks-vs-knicks-game-3",
    "matchup_id": "full-hawks-vs-knicks",
    "game_number": 3,
    "title": "EXTENDED: #3 KNICKS at #6 HAWKS | FULL GAME 3 HIGHLIGHTS | April 23, 2026",
    "team_a": "KNICKS",
    "team_b": "HAWKS",
    "date": "2026-04-24T03:38:57Z",
    "video_id": "3_RP2akGwYo",
    "duration": "15 minutes"
  },
  {
    "id": "full-hawks-vs-knicks-game-4",
    "matchup_id": "full-hawks-vs-knicks",
    "game_number": 4,
    "title": "EXTENDED: #3 KNICKS at #6 HAWKS | FULL GAME 4 HIGHLIGHTS | April 25, 2026",
    "team_a": "KNICKS",
    "team_b": "HAWKS",
    "date": "2026-04-26T02:33:48Z",
    "video_id": "R-jnmun8HSE",
    "duration": "15 minutes"
  },
  {
    "id": "full-hawks-vs-knicks-game-5",
    "matchup_id": "full-hawks-vs-knicks",
    "game_number": 5,
    "title": "#6 HAWKS at #3 KNICKS | FULL GAME 5 HIGHLIGHTS | April 28, 2026",
    "team_a": "KNICKS",
    "team_b": "HAWKS",
    "date": "2026-04-29T03:24:39Z",
    "video_id": "_gOcjhr7cuE",
    "duration": "15 minutes"
  },
  {
    "id": "full-hawks-vs-knicks-game-6",
    "matchup_id": "full-hawks-vs-knicks",
    "game_number": 6,
    "title": "#3 KNICKS at #6 HAWKS | FULL GAME 6 HIGHLIGHTS | April 30, 2026",
    "team_a": "KNICKS",
    "team_b": "HAWKS",
    "date": "2026-05-01T02:03:51Z",
    "video_id": "pkpKEx-ZSV8",
    "duration": "15 minutes"
  },
  {
    "id": "full-suns-vs-thunder-game-1",
    "matchup_id": "full-suns-vs-thunder",
    "game_number": 1,
    "title": "THUNDER vs SUNS | First Round Game 1 Highlights",
    "team_a": "THUNDER",
    "team_b": "SUNS",
    "date": "2026-05-21T19:30:00Z",
    "video_id": "UZUaJRqqosg",
    "duration": "15 minutes"
  },
  {
    "id": "full-suns-vs-thunder-game-2",
    "matchup_id": "full-suns-vs-thunder",
    "game_number": 2,
    "title": "THUNDER vs SUNS | First Round Game 2 Highlights",
    "team_a": "THUNDER",
    "team_b": "SUNS",
    "date": "2026-05-22T19:30:00Z",
    "video_id": "UZUaJRqqosg",
    "duration": "15 minutes"
  },
  {
    "id": "full-suns-vs-thunder-game-3",
    "matchup_id": "full-suns-vs-thunder",
    "game_number": 3,
    "title": "EXTENDED: #1 THUNDER at #8 SUNS | FULL GAME 3 HIGHLIGHTS | April 25, 2026",
    "team_a": "THUNDER",
    "team_b": "SUNS",
    "date": "2026-04-25T23:58:19Z",
    "video_id": "UZUaJRqqosg",
    "duration": "15 minutes"
  },
  {
    "id": "full-suns-vs-thunder-game-4",
    "matchup_id": "full-suns-vs-thunder",
    "game_number": 4,
    "title": "EXTENDED: #1 THUNDER at #8 SUNS | FULL GAME 4 HIGHLIGHTS | April 27, 2026",
    "team_a": "THUNDER",
    "team_b": "SUNS",
    "date": "2026-04-28T06:00:44Z",
    "video_id": "ZJQQrTD4bow",
    "duration": "15 minutes"
  },
  {
    "id": "full-lakers-vs-rockets-game-1",
    "matchup_id": "full-lakers-vs-rockets",
    "game_number": 1,
    "title": "EXTENDED: #5 ROCKETS at #4 LAKERS | FULL GAME 1 HIGHLIGHTS | April 18, 2026",
    "team_a": "LAKERS",
    "team_b": "ROCKETS",
    "date": "2026-04-19T04:28:42Z",
    "video_id": "5ozETL8OKK4",
    "duration": "15 minutes"
  },
  {
    "id": "full-lakers-vs-rockets-game-2",
    "matchup_id": "full-lakers-vs-rockets",
    "game_number": 2,
    "title": "#5 ROCKETS at #4 LAKERS | FULL GAME 2 HIGHLIGHTS | April 21, 2026",
    "team_a": "LAKERS",
    "team_b": "ROCKETS",
    "date": "2026-04-22T05:34:20Z",
    "video_id": "S4OAzXJWSWs",
    "duration": "15 minutes"
  },
  {
    "id": "full-lakers-vs-rockets-game-3",
    "matchup_id": "full-lakers-vs-rockets",
    "game_number": 3,
    "title": "EXTENDED: #4 LAKERS at #5 ROCKETS | FULL GAME 3 HIGHLIGHTS | April 24, 2026",
    "team_a": "LAKERS",
    "team_b": "ROCKETS",
    "date": "2026-04-25T04:23:20Z",
    "video_id": "Ti9glUWX2hc",
    "duration": "15 minutes"
  },
  {
    "id": "full-lakers-vs-rockets-game-4",
    "matchup_id": "full-lakers-vs-rockets",
    "game_number": 4,
    "title": "EXTENDED: #4 LAKERS at #5 ROCKETS | FULL GAME 4 HIGHLIGHTS | April 26, 2026",
    "team_a": "LAKERS",
    "team_b": "ROCKETS",
    "date": "2026-04-27T05:53:13Z",
    "video_id": "GfloKg6jXCA",
    "duration": "15 minutes"
  },
  {
    "id": "full-lakers-vs-rockets-game-5",
    "matchup_id": "full-lakers-vs-rockets",
    "game_number": 5,
    "title": "EXTENDED: #5 ROCKETS at #4 LAKERS | FULL GAME 5 HIGHLIGHTS | April 29, 2026",
    "team_a": "LAKERS",
    "team_b": "ROCKETS",
    "date": "2026-04-30T05:57:18Z",
    "video_id": "-VwuADzwA3c",
    "duration": "15 minutes"
  },
  {
    "id": "full-lakers-vs-rockets-game-6",
    "matchup_id": "full-lakers-vs-rockets",
    "game_number": 6,
    "title": "EXTENDED: #4 LAKERS at #5 ROCKETS | FULL GAME 6 HIGHLIGHTS | May 1, 2026",
    "team_a": "LAKERS",
    "team_b": "ROCKETS",
    "date": "2026-05-02T05:56:26Z",
    "video_id": "K0IBptZ4bJs",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-trail-blazers-game-1",
    "matchup_id": "full-spurs-vs-trail-blazers",
    "game_number": 1,
    "title": "SPURS vs TRAIL BLAZERS | First Round Game 1 Highlights",
    "team_a": "SPURS",
    "team_b": "TRAIL BLAZERS",
    "date": "2026-05-25T19:30:00Z",
    "video_id": "bt3NwN7k8bY",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-trail-blazers-game-2",
    "matchup_id": "full-spurs-vs-trail-blazers",
    "game_number": 2,
    "title": "SPURS vs TRAIL BLAZERS | First Round Game 2 Highlights",
    "team_a": "SPURS",
    "team_b": "TRAIL BLAZERS",
    "date": "2026-05-26T19:30:00Z",
    "video_id": "bt3NwN7k8bY",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-trail-blazers-game-3",
    "matchup_id": "full-spurs-vs-trail-blazers",
    "game_number": 3,
    "title": "SPURS vs TRAIL BLAZERS | First Round Game 3 Highlights",
    "team_a": "SPURS",
    "team_b": "TRAIL BLAZERS",
    "date": "2026-05-27T19:30:00Z",
    "video_id": "bt3NwN7k8bY",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-trail-blazers-game-4",
    "matchup_id": "full-spurs-vs-trail-blazers",
    "game_number": 4,
    "title": "SPURS vs TRAIL BLAZERS | First Round Game 4 Highlights",
    "team_a": "SPURS",
    "team_b": "TRAIL BLAZERS",
    "date": "2026-05-28T19:30:00Z",
    "video_id": "bt3NwN7k8bY",
    "duration": "15 minutes"
  },
  {
    "id": "full-nuggets-vs-timberwolves-game-1",
    "matchup_id": "full-nuggets-vs-timberwolves",
    "game_number": 1,
    "title": "TIMBERWOLVES vs NUGGETS | First Round Game 1 Highlights",
    "team_a": "TIMBERWOLVES",
    "team_b": "NUGGETS",
    "date": "2026-05-27T19:30:00Z",
    "video_id": "WMDnpbs0bEI",
    "duration": "15 minutes"
  },
  {
    "id": "full-nuggets-vs-timberwolves-game-2",
    "matchup_id": "full-nuggets-vs-timberwolves",
    "game_number": 2,
    "title": "#6 TIMBERWOLVES at #3 NUGGETS | FULL GAME 2 HIGHLIGHTS | April 20, 2026",
    "team_a": "TIMBERWOLVES",
    "team_b": "NUGGETS",
    "date": "2026-04-21T14:18:14Z",
    "video_id": "WMDnpbs0bEI",
    "duration": "15 minutes"
  },
  {
    "id": "full-nuggets-vs-timberwolves-game-3",
    "matchup_id": "full-nuggets-vs-timberwolves",
    "game_number": 3,
    "title": "EXTENDED: #3 NUGGETS at #6 TIMBERWOLVES  | FULL GAME 3 HIGHLIGHTS | April 23, 2026",
    "team_a": "TIMBERWOLVES",
    "team_b": "NUGGETS",
    "date": "2026-04-24T05:42:46Z",
    "video_id": "PBr9wSH9K1o",
    "duration": "15 minutes"
  },
  {
    "id": "full-nuggets-vs-timberwolves-game-4",
    "matchup_id": "full-nuggets-vs-timberwolves",
    "game_number": 4,
    "title": "EXTENDED: #3 NUGGETS at #6 TIMBERWOLVES | FULL GAME 4 HIGHLIGHTS | April 25, 2026",
    "team_a": "TIMBERWOLVES",
    "team_b": "NUGGETS",
    "date": "2026-04-26T04:55:50Z",
    "video_id": "rjVR2_49GGs",
    "duration": "15 minutes"
  },
  {
    "id": "full-nuggets-vs-timberwolves-game-5",
    "matchup_id": "full-nuggets-vs-timberwolves",
    "game_number": 5,
    "title": "EXTENDED: #6 TIMBERWOLVES at #3 NUGGETS | FULL GAME 5 HIGHLIGHTS | April 27, 2026",
    "team_a": "TIMBERWOLVES",
    "team_b": "NUGGETS",
    "date": "2026-04-28T06:46:11Z",
    "video_id": "NPxK7C64drw",
    "duration": "15 minutes"
  },
  {
    "id": "full-nuggets-vs-timberwolves-game-6",
    "matchup_id": "full-nuggets-vs-timberwolves",
    "game_number": 6,
    "title": "EXTENDED: #3 NUGGETS at #6 TIMBERWOLVES | FULL GAME 6 HIGHLIGHTS | April 30, 2026",
    "team_a": "TIMBERWOLVES",
    "team_b": "NUGGETS",
    "date": "2026-05-01T05:32:55Z",
    "video_id": "lDO3TbhA1hE",
    "duration": "15 minutes"
  },
  {
    "id": "full-76ers-vs-knicks-game-1",
    "matchup_id": "full-76ers-vs-knicks",
    "game_number": 1,
    "title": "EXTENDED: #7 76ERS at #3 KNICKS | FULL GAME 1 HIGHLIGHTS | May 4, 2026",
    "team_a": "KNICKS",
    "team_b": "76ERS",
    "date": "2026-05-05T04:10:04Z",
    "video_id": "oDhW6KJmO6I",
    "duration": "15 minutes"
  },
  {
    "id": "full-76ers-vs-knicks-game-2",
    "matchup_id": "full-76ers-vs-knicks",
    "game_number": 2,
    "title": "#7 76ERS at #3 KNICKS | FULL GAME 2 HIGHLIGHTS | May 6, 2026",
    "team_a": "KNICKS",
    "team_b": "76ERS",
    "date": "2026-05-07T03:16:59Z",
    "video_id": "G1ckVKBRF_g",
    "duration": "15 minutes"
  },
  {
    "id": "full-76ers-vs-knicks-game-3",
    "matchup_id": "full-76ers-vs-knicks",
    "game_number": 3,
    "title": "EXTENDED: #3 KNICKS at #7 76ERS | FULL GAME 3 HIGHLIGHTS | May 8, 2026",
    "team_a": "KNICKS",
    "team_b": "76ERS",
    "date": "2026-05-09T03:38:52Z",
    "video_id": "SfJAp0gBPaY",
    "duration": "15 minutes"
  },
  {
    "id": "full-76ers-vs-knicks-game-4",
    "matchup_id": "full-76ers-vs-knicks",
    "game_number": 4,
    "title": "EXTENDED: #3 KNICKS at #7 76ERS | FULL GAME 4 HIGHLIGHTS | May 10, 2026",
    "team_a": "KNICKS",
    "team_b": "76ERS",
    "date": "2026-05-11T00:01:08Z",
    "video_id": "Hm7V4jOxlUI",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-pistons-game-1",
    "matchup_id": "full-cavaliers-vs-pistons",
    "game_number": 1,
    "title": "EXTENDED: #4 CAVALIERS at #1 PISTONS | FULL GAME 1 HIGHLIGHTS | May 5, 2026",
    "team_a": "CAVALIERS",
    "team_b": "PISTONS",
    "date": "2026-05-06T03:12:23Z",
    "video_id": "_YUvuVSHfDk",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-pistons-game-2",
    "matchup_id": "full-cavaliers-vs-pistons",
    "game_number": 2,
    "title": "EXTENDED: #4 CAVALIERS at #1 PISTONS | FULL GAME 2 HIGHLIGHTS | May 7, 2026",
    "team_a": "CAVALIERS",
    "team_b": "PISTONS",
    "date": "2026-05-08T04:11:31Z",
    "video_id": "z0PabNWsFzg",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-pistons-game-3",
    "matchup_id": "full-cavaliers-vs-pistons",
    "game_number": 3,
    "title": "EXTENDED: #1 PISTONS at #4 CAVALIERS | FULL GAME 3 HIGHLIGHTS | May 9, 2026",
    "team_a": "CAVALIERS",
    "team_b": "PISTONS",
    "date": "2026-05-09T23:20:02Z",
    "video_id": "r4sU18PTRYk",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-pistons-game-4",
    "matchup_id": "full-cavaliers-vs-pistons",
    "game_number": 4,
    "title": "EXTENDED: #1 PISTONS at #4 CAVALIERS | FULL GAME 4 HIGHLIGHTS | May 11, 2026",
    "team_a": "CAVALIERS",
    "team_b": "PISTONS",
    "date": "2026-05-12T04:38:29Z",
    "video_id": "LYJSB9ud89E",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-pistons-game-5",
    "matchup_id": "full-cavaliers-vs-pistons",
    "game_number": 5,
    "title": "EXTENDED: #4 CAVALIERS at #1 PISTONS | FULL GAME 5 HIGHLIGHTS | May 13, 2026",
    "team_a": "CAVALIERS",
    "team_b": "PISTONS",
    "date": "2026-05-14T04:01:00Z",
    "video_id": "uN5wbGLvyc4",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-pistons-game-6",
    "matchup_id": "full-cavaliers-vs-pistons",
    "game_number": 6,
    "title": "EXTENDED: #1 PISTONS at #4 CAVALIERS | FULL GAME 6 HIGHLIGHTS | May 15, 2026",
    "team_a": "CAVALIERS",
    "team_b": "PISTONS",
    "date": "2026-05-16T03:19:37Z",
    "video_id": "_8VVXFpvz9o",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-pistons-game-7",
    "matchup_id": "full-cavaliers-vs-pistons",
    "game_number": 7,
    "title": "EXTENDED: #4 CAVALIERS at #1 PISTONS | FULL GAME 7 HIGHLIGHTS | May 17, 2026",
    "team_a": "CAVALIERS",
    "team_b": "PISTONS",
    "date": "2026-05-18T04:25:03Z",
    "video_id": "FI_bEu8JvFA",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-timberwolves-game-1",
    "matchup_id": "full-spurs-vs-timberwolves",
    "game_number": 1,
    "title": "EXTENDED: #6 TIMBERWOLVES at #2 SPURS | FULL GAME 1 HIGHLIGHTS | May 4, 2026",
    "team_a": "SPURS",
    "team_b": "TIMBERWOLVES",
    "date": "2026-05-05T05:33:31Z",
    "video_id": "eavHPMqV5Fw",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-timberwolves-game-2",
    "matchup_id": "full-spurs-vs-timberwolves",
    "game_number": 2,
    "title": "EXTENDED: #6 TIMBERWOLVES at #2 SPURS | FULL GAME 2 HIGHLIGHTS | May 6, 2026",
    "team_a": "SPURS",
    "team_b": "TIMBERWOLVES",
    "date": "2026-05-07T05:37:43Z",
    "video_id": "cOVcKGB2wxY",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-timberwolves-game-3",
    "matchup_id": "full-spurs-vs-timberwolves",
    "game_number": 3,
    "title": "EXTENDED: #2 SPURS at #6 TIMBERWOLVES | FULL GAME 3 HIGHLIGHTS | May 8, 2026",
    "team_a": "SPURS",
    "team_b": "TIMBERWOLVES",
    "date": "2026-05-09T05:36:20Z",
    "video_id": "xJ9Tb_q2PHQ",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-timberwolves-game-4",
    "matchup_id": "full-spurs-vs-timberwolves",
    "game_number": 4,
    "title": "EXTENDED: #2 SPURS at #6 TIMBERWOLVES | FULL GAME 4 HIGHLIGHTS | May 10, 2026",
    "team_a": "SPURS",
    "team_b": "TIMBERWOLVES",
    "date": "2026-05-11T03:14:44Z",
    "video_id": "DBCiw01pfho",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-timberwolves-game-5",
    "matchup_id": "full-spurs-vs-timberwolves",
    "game_number": 5,
    "title": "EXTENDED: #6 TIMBERWOLVES at #2 SPURS | FULL GAME 5 HIGHLIGHTS | May 12, 2026",
    "team_a": "SPURS",
    "team_b": "TIMBERWOLVES",
    "date": "2026-05-13T03:45:39Z",
    "video_id": "6HuTouMQKiw",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-timberwolves-game-6",
    "matchup_id": "full-spurs-vs-timberwolves",
    "game_number": 6,
    "title": "EXTENDED: #2 SPURS at #6 TIMBERWOLVES | FULL GAME 6 HIGHLIGHTS | May 15, 2026",
    "team_a": "SPURS",
    "team_b": "TIMBERWOLVES",
    "date": "2026-05-16T05:50:07Z",
    "video_id": "rtb2lroYns4",
    "duration": "15 minutes"
  },
  {
    "id": "full-lakers-vs-thunder-game-1",
    "matchup_id": "full-lakers-vs-thunder",
    "game_number": 1,
    "title": "EXTENDED: #4 LAKERS at #1 THUNDER | FULL GAME 1 HIGHLIGHTS | May 5, 2026",
    "team_a": "THUNDER",
    "team_b": "LAKERS",
    "date": "2026-05-06T04:44:05Z",
    "video_id": "yXpVuefx36c",
    "duration": "15 minutes"
  },
  {
    "id": "full-lakers-vs-thunder-game-2",
    "matchup_id": "full-lakers-vs-thunder",
    "game_number": 2,
    "title": "EXTENDED: #4 LAKERS at #1 THUNDER | FULL GAME 2 HIGHLIGHTS | May 7, 2026",
    "team_a": "THUNDER",
    "team_b": "LAKERS",
    "date": "2026-05-08T05:39:37Z",
    "video_id": "jwFxOywo-lg",
    "duration": "15 minutes"
  },
  {
    "id": "full-lakers-vs-thunder-game-3",
    "matchup_id": "full-lakers-vs-thunder",
    "game_number": 3,
    "title": "EXTENDED: #1 THUNDER at #4 LAKERS | FULL GAME 3 HIGHLIGHTS | May 9, 2026",
    "team_a": "THUNDER",
    "team_b": "LAKERS",
    "date": "2026-05-10T04:50:51Z",
    "video_id": "y2T0etBQ1ZA",
    "duration": "15 minutes"
  },
  {
    "id": "full-lakers-vs-thunder-game-4",
    "matchup_id": "full-lakers-vs-thunder",
    "game_number": 4,
    "title": "EXTENDED: #1 THUNDER at #4 LAKERS | FULL GAME 4 HIGHLIGHTS | May 11, 2026",
    "team_a": "THUNDER",
    "team_b": "LAKERS",
    "date": "2026-05-12T06:47:05Z",
    "video_id": "7snB3zkwwFQ",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-knicks-game-1",
    "matchup_id": "full-cavaliers-vs-knicks",
    "game_number": 1,
    "title": "EXTENDED: #4 CAVALIERS at #3 KNICKS | FULL GAME 1 HIGHLIGHTS | May 19, 2026",
    "team_a": "KNICKS",
    "team_b": "CAVALIERS",
    "date": "2026-05-20T04:47:51Z",
    "video_id": "sxmyBEKJvYY",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-knicks-game-2",
    "matchup_id": "full-cavaliers-vs-knicks",
    "game_number": 2,
    "title": "EXTENDED: #4 CAVALIERS at #3 KNICKS | FULL GAME 2 HIGHLIGHTS | May 21, 2026",
    "team_a": "KNICKS",
    "team_b": "CAVALIERS",
    "date": "2026-05-22T03:54:51Z",
    "video_id": "YnAUcU5GIR8",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-knicks-game-3",
    "matchup_id": "full-cavaliers-vs-knicks",
    "game_number": 3,
    "title": "EXTENDED: #3 KNICKS at #4 CAVALIERS | FULL GAME 3 HIGHLIGHTS | May 23, 2026",
    "team_a": "KNICKS",
    "team_b": "CAVALIERS",
    "date": "2026-05-24T05:09:11Z",
    "video_id": "_s7y2Chd1HA",
    "duration": "15 minutes"
  },
  {
    "id": "full-cavaliers-vs-knicks-game-4",
    "matchup_id": "full-cavaliers-vs-knicks",
    "game_number": 4,
    "title": "EXTENDED: #3 KNICKS at #4 CAVALIERS | FULL GAME 4 HIGHLIGHTS | May 25, 2026",
    "team_a": "KNICKS",
    "team_b": "CAVALIERS",
    "date": "2026-05-26T04:51:16Z",
    "video_id": "OTEG7jgCQkA",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-thunder-game-1",
    "matchup_id": "full-spurs-vs-thunder",
    "game_number": 1,
    "title": "EXTENDED: #2 SPURS at #1 THUNDER | FULL GAME 1 HIGHLIGHTS | May 18, 2026",
    "team_a": "SPURS",
    "team_b": "THUNDER",
    "date": "2026-05-19T04:52:59Z",
    "video_id": "Aqi9zT9WVgk",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-thunder-game-2",
    "matchup_id": "full-spurs-vs-thunder",
    "game_number": 2,
    "title": "EXTENDED: #2 SPURS at #1 THUNDER | FULL GAME 2 HIGHLIGHTS | May 20, 2026",
    "team_a": "SPURS",
    "team_b": "THUNDER",
    "date": "2026-05-21T04:13:24Z",
    "video_id": "HOG1DLHV_Kc",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-thunder-game-3",
    "matchup_id": "full-spurs-vs-thunder",
    "game_number": 3,
    "title": "#1 THUNDER at #2 SPURS | FULL GAME 3 HIGHLIGHTS | May 22, 2026",
    "team_a": "SPURS",
    "team_b": "THUNDER",
    "date": "2026-05-23T03:43:15Z",
    "video_id": "NgqKzgtRTL4",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-thunder-game-4",
    "matchup_id": "full-spurs-vs-thunder",
    "game_number": 4,
    "title": "EXTENDED: #1 THUNDER at #2 SPURS | FULL GAME 4 HIGHLIGHTS | May 24, 2026",
    "team_a": "SPURS",
    "team_b": "THUNDER",
    "date": "2026-05-25T04:02:29Z",
    "video_id": "5t28EcHYlPk",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-thunder-game-5",
    "matchup_id": "full-spurs-vs-thunder",
    "game_number": 5,
    "title": "EXTENDED: #2 SPURS at #1 THUNDER | FULL GAME 5 HIGHLIGHTS | May 26, 2026",
    "team_a": "SPURS",
    "team_b": "THUNDER",
    "date": "2026-05-27T05:09:46Z",
    "video_id": "E5hG3mDjI7c",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-thunder-game-6",
    "matchup_id": "full-spurs-vs-thunder",
    "game_number": 6,
    "title": "EXTENDED: #1 THUNDER at #2 SPURS | FULL GAME 6 HIGHLIGHTS | May 28, 2026",
    "team_a": "SPURS",
    "team_b": "THUNDER",
    "date": "2026-05-29T03:55:17Z",
    "video_id": "KyuXHZLsZTw",
    "duration": "15 minutes"
  },
  {
    "id": "full-spurs-vs-thunder-game-7",
    "matchup_id": "full-spurs-vs-thunder",
    "game_number": 7,
    "title": "EXTENDED: #2 SPURS at #1 THUNDER | FULL GAME 7 HIGHLIGHTS | May 30, 2026",
    "team_a": "SPURS",
    "team_b": "THUNDER",
    "date": "2026-05-31T04:18:38Z",
    "video_id": "cnO2DWrkOfw",
    "duration": "15 minutes"
  },
  {
    "id": "nba-finals-knicks-vs-spurs-game-1",
    "matchup_id": "nba-finals-knicks-vs-spurs",
    "game_number": 1,
    "title": "EXTENDED: #3 KNICKS at #2 SPURS | NBA FINALS GAME 1 HIGHLIGHTS | June 3, 2026",
    "team_a": "KNICKS",
    "team_b": "SPURS",
    "date": "2026-06-04T04:36:25Z",
    "video_id": "4uemplteguQ",
    "duration": "15 minutes"
  },
  {
    "id": "nba-finals-knicks-vs-spurs-game-2",
    "matchup_id": "nba-finals-knicks-vs-spurs",
    "game_number": 2,
    "title": "EXTENDED: #3 KNICKS at #2 SPURS | NBA FINALS GAME 2 HIGHLIGHTS | June 5, 2026",
    "team_a": "KNICKS",
    "team_b": "SPURS",
    "date": "2026-06-06T04:56:56Z",
    "video_id": "bICn0bOprVI",
    "duration": "15 minutes"
  },
  {
    "id": "nba-finals-knicks-vs-spurs-game-3",
    "matchup_id": "nba-finals-knicks-vs-spurs",
    "game_number": 3,
    "title": "EXTENDED: #2 SPURS at #3 KNICKS | NBA FINALS GAME 3 HIGHLIGHTS | June 8, 2026",
    "team_a": "KNICKS",
    "team_b": "SPURS",
    "date": "2026-06-09T05:01:22Z",
    "video_id": "BHAtdKNPPlU",
    "duration": "15 minutes"
  },
  {
    "id": "nba-finals-knicks-vs-spurs-game-4",
    "matchup_id": "nba-finals-knicks-vs-spurs",
    "game_number": 4,
    "title": "EXTENDED: #2 SPURS at #3 KNICKS | NBA FINALS GAME 4 HIGHLIGHTS | June 10, 2026",
    "team_a": "KNICKS",
    "team_b": "SPURS",
    "date": "2026-06-11T05:49:27Z",
    "video_id": "bt3NwN7k8bY",
    "duration": "15 minutes"
  }
];

  for (const game of games) {
    await run(`
      INSERT INTO games (id, matchup_id, game_number, title, team_a, team_b, date, video_id, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      game.id,
      game.matchup_id,
      game.game_number,
      game.title,
      game.team_a,
      game.team_b,
      game.date,
      game.video_id,
      game.duration
    ]);
  }

  // Seed linear mock tournament data
  console.log('[Seed] Seeding linear mock tournament matchups and games...');
  const linearMatchups = [
    {
      id: 'linear-mock-stage-1',
      title: 'Group A - Matchday 1',
      stageName: 'Group Stage',
      sequence: 1
    },
    {
      id: 'linear-mock-stage-2',
      title: 'Group A - Matchday 2',
      stageName: 'Group Stage',
      sequence: 2
    }
  ];

  for (const m of linearMatchups) {
    await run(`
      INSERT INTO matchups (id, tournament_id, title, stage_name, sequence, feeder_a_id, feeder_b_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      m.id,
      'linear-mock-tournament',
      m.title,
      m.stageName,
      m.sequence,
      null,
      null
    ]);
  }

  const linearGames = [
    {
      id: 'linear-mock-stage-1-game-1',
      matchup_id: 'linear-mock-stage-1',
      game_number: 1,
      title: 'USA vs England | Group Stage Game 1 Highlights',
      team_a: 'USA',
      team_b: 'ENGLAND',
      date: '2026-06-01T18:00:00Z',
      video_id: 'bt3NwN7k8bY',
      duration: '10 minutes'
    },
    {
      id: 'linear-mock-stage-1-game-2',
      matchup_id: 'linear-mock-stage-1',
      game_number: 2,
      title: 'Wales vs Iran | Group Stage Game 2 Highlights',
      team_a: 'WALES',
      team_b: 'IRAN',
      date: '2026-06-02T18:00:00Z',
      video_id: 'bt3NwN7k8bY',
      duration: '12 minutes'
    },
    {
      id: 'linear-mock-stage-2-game-1',
      matchup_id: 'linear-mock-stage-2',
      game_number: 1,
      title: 'USA vs Iran | Group Stage Game 3 Highlights',
      team_a: 'USA',
      team_b: 'IRAN',
      date: '2026-06-05T18:00:00Z',
      video_id: 'bt3NwN7k8bY',
      duration: '11 minutes'
    },
    {
      id: 'linear-mock-stage-2-game-2',
      matchup_id: 'linear-mock-stage-2',
      game_number: 2,
      title: 'England vs Wales | Group Stage Game 4 Highlights',
      team_a: 'ENGLAND',
      team_b: 'WALES',
      date: '2026-06-06T18:00:00Z',
      video_id: 'bt3NwN7k8bY',
      duration: '15 minutes'
    }
  ];

  for (const game of linearGames) {
    await run(`
      INSERT INTO games (id, matchup_id, game_number, title, team_a, team_b, date, video_id, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      game.id,
      game.matchup_id,
      game.game_number,
      game.title,
      game.team_a,
      game.team_b,
      game.date,
      game.video_id,
      game.duration
    ]);
  }

  console.log(`[Seed] Seeded ${matchups.length + linearMatchups.length} matchups and ${games.length + linearGames.length} games.`);
  console.log('[Seed] Database seeding completed successfully.');
};

if (require.main === module) {
  seedData()
    .then(() => {
      db.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Seeding failed:', err);
      db.close();
      process.exit(1);
    });
}

module.exports = {
  seedData
};
