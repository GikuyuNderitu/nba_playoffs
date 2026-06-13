const { db, run, setupSchema } = require('./db');

const seedData = async () => {
  console.log('[Seed] Starting database seeding...');
  
  // Make sure schema exists
  await setupSchema();

  // Clean existing data
  console.log('[Seed] Cleaning existing data...');
  await run('DELETE FROM progress');
  await run('DELETE FROM watch_sessions');
  await run('DELETE FROM games');
  await run('DELETE FROM matchups');
  await run('DELETE FROM tournaments');

  // 1. Insert Tournament
  console.log('[Seed] Seeding tournaments...');
  await run(`
    INSERT INTO tournaments (id, title, description, type)
    VALUES (?, ?, ?, ?)
  `, [
    'nba-playoffs-2026',
    'NBA Playoffs | 2025-26 Season',
    'Experience the Eastern and Western Conference Finals followed by the NBA Finals in strict chronological order, completely spoiler-free.',
    'bracket'
  ]);

  // 2. Insert Matchups
  console.log('[Seed] Seeding matchups...');
  
  // ECF
  await run(`
    INSERT INTO matchups (id, tournament_id, title, stage_name, sequence, feeder_a_id, feeder_b_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    'ecf-2026-knicks-cavaliers',
    'nba-playoffs-2026',
    'Knicks vs Cavaliers',
    'Conference Finals',
    1,
    null,
    null
  ]);

  // WCF
  await run(`
    INSERT INTO matchups (id, tournament_id, title, stage_name, sequence, feeder_a_id, feeder_b_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    'wcf-2026-spurs-thunder',
    'nba-playoffs-2026',
    'Spurs vs Thunder',
    'Conference Finals',
    2,
    null,
    null
  ]);

  // Finals (Feeds from ECF and WCF)
  await run(`
    INSERT INTO matchups (id, tournament_id, title, stage_name, sequence, feeder_a_id, feeder_b_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    'finals-2026-knicks-spurs',
    'nba-playoffs-2026',
    'Knicks vs Spurs',
    'NBA Finals',
    3,
    'ecf-2026-knicks-cavaliers',
    'wcf-2026-spurs-thunder'
  ]);

  // 3. Insert Games
  console.log('[Seed] Seeding games...');

  const games = [
    // --- Eastern Conference Finals (Knicks vs Cavaliers) ---
    {
      id: 'ecf-game-1',
      matchup_id: 'ecf-2026-knicks-cavaliers',
      game_number: 1,
      title: 'Game 1: Cavaliers at Knicks | Eastern Conference Finals',
      team_a: 'Knicks',
      team_b: 'Cavaliers',
      date: '2026-05-17T19:30:00Z',
      video_id: '9zQREzDgnVE',
      duration: '10 minutes'
    },
    {
      id: 'ecf-game-2',
      matchup_id: 'ecf-2026-knicks-cavaliers',
      game_number: 2,
      title: 'Game 2: Cavaliers at Knicks | Eastern Conference Finals',
      team_a: 'Knicks',
      team_b: 'Cavaliers',
      date: '2026-05-19T19:30:00Z',
      video_id: '9zQREzDgnVE',
      duration: '10 minutes'
    },
    {
      id: 'ecf-game-3',
      matchup_id: 'ecf-2026-knicks-cavaliers',
      game_number: 3,
      title: 'EXTENDED Game 3: Knicks at Cavaliers | Eastern Conference Finals Highlights',
      team_a: 'Knicks',
      team_b: 'Cavaliers',
      date: '2026-05-23T20:30:00Z',
      video_id: '_s7y2Chd1HA',
      duration: '55 minutes'
    },
    {
      id: 'ecf-game-4',
      matchup_id: 'ecf-2026-knicks-cavaliers',
      game_number: 4,
      title: 'EXTENDED Game 4: Knicks at Cavaliers | Eastern Conference Finals Highlights',
      team_a: 'Knicks',
      team_b: 'Cavaliers',
      date: '2026-05-25T20:30:00Z',
      video_id: 'OTEG7jgCQkA',
      duration: '78 minutes'
    },

    // --- Western Conference Finals (Spurs vs Thunder) ---
    {
      id: 'wcf-game-1',
      matchup_id: 'wcf-2026-spurs-thunder',
      game_number: 1,
      title: 'Game 1: Spurs at Thunder | Western Conference Finals',
      team_a: 'Spurs',
      team_b: 'Thunder',
      date: '2026-05-18T20:30:00Z',
      video_id: 'UrK4HkFjBNI',
      duration: '36 minutes'
    },
    {
      id: 'wcf-game-2',
      matchup_id: 'wcf-2026-spurs-thunder',
      game_number: 2,
      title: 'Game 2: Spurs at Thunder | Western Conference Finals',
      team_a: 'Spurs',
      team_b: 'Thunder',
      date: '2026-05-20T20:30:00Z',
      video_id: 'UrK4HkFjBNI',
      duration: '36 minutes'
    },
    {
      id: 'wcf-game-3',
      matchup_id: 'wcf-2026-spurs-thunder',
      game_number: 3,
      title: 'Game 3: Thunder at Spurs | Western Conference Finals Highlights',
      team_a: 'Spurs',
      team_b: 'Thunder',
      date: '2026-05-22T20:30:00Z',
      video_id: 'NgqKzgtRTL4',
      duration: '15 minutes'
    },
    {
      id: 'wcf-game-4',
      matchup_id: 'wcf-2026-spurs-thunder',
      game_number: 4,
      title: 'EXTENDED Game 4: Thunder at Spurs | Western Conference Finals Highlights',
      team_a: 'Spurs',
      team_b: 'Thunder',
      date: '2026-05-24T20:30:00Z',
      video_id: '5t28EcHYlPk',
      duration: '45 minutes'
    },
    {
      id: 'wcf-game-5',
      matchup_id: 'wcf-2026-spurs-thunder',
      game_number: 5,
      title: 'EXTENDED Game 5: Spurs at Thunder | Western Conference Finals Highlights',
      team_a: 'Spurs',
      team_b: 'Thunder',
      date: '2026-05-26T20:30:00Z',
      video_id: 'E5hG3mDjI7c',
      duration: '45 minutes'
    },
    {
      id: 'wcf-game-6',
      matchup_id: 'wcf-2026-spurs-thunder',
      game_number: 6,
      title: 'EXTENDED Game 6: Thunder at Spurs | Western Conference Finals Highlights',
      team_a: 'Spurs',
      team_b: 'Thunder',
      date: '2026-05-28T20:30:00Z',
      video_id: 'KyuXHZLsZTw',
      duration: '36 minutes'
    },
    {
      id: 'wcf-game-7',
      matchup_id: 'wcf-2026-spurs-thunder',
      game_number: 7,
      title: 'EXTENDED Game 7: Spurs at Thunder | Western Conference Finals Highlights',
      team_a: 'Spurs',
      team_b: 'Thunder',
      date: '2026-05-30T20:30:00Z',
      video_id: 'cnO2DWrkOfw',
      duration: '45 minutes'
    },

    // --- NBA Finals (Knicks vs Spurs) ---
    {
      id: 'finals-game-1',
      matchup_id: 'finals-2026-knicks-spurs',
      game_number: 1,
      title: 'EXTENDED Game 1: Knicks at Spurs | NBA Finals Highlights',
      team_a: 'Knicks',
      team_b: 'Spurs',
      date: '2026-06-03T21:00:00Z',
      video_id: '4uemplteguQ',
      duration: '52 minutes'
    },
    {
      id: 'finals-game-2',
      matchup_id: 'finals-2026-knicks-spurs',
      game_number: 2,
      title: 'EXTENDED Game 2: Knicks at Spurs | NBA Finals Highlights',
      team_a: 'Knicks',
      team_b: 'Spurs',
      date: '2026-06-05T21:00:00Z',
      video_id: 'bICn0bOprVI',
      duration: '53 minutes'
    },
    {
      id: 'finals-game-3',
      matchup_id: 'finals-2026-knicks-spurs',
      game_number: 3,
      title: 'EXTENDED Game 3: Spurs at Knicks | NBA Finals Highlights',
      team_a: 'Knicks',
      team_b: 'Spurs',
      date: '2026-06-08T21:00:00Z',
      video_id: 'BHAtdKNPPlU',
      duration: '50 minutes'
    },
    {
      id: 'finals-game-4',
      matchup_id: 'finals-2026-knicks-spurs',
      game_number: 4,
      title: 'EXTENDED Game 4: Spurs at Knicks | NBA Finals Highlights',
      team_a: 'Knicks',
      team_b: 'Spurs',
      date: '2026-06-10T21:00:00Z',
      video_id: 'bt3NwN7k8bY',
      duration: '58 minutes'
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

  console.log(`[Seed] Seeded ${games.length} games.`);
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
