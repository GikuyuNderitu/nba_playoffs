const fs = require('fs');
const path = require('path');

const parsedPath = path.join(__dirname, '../server/parsed_bracket.json');
const matchups = JSON.parse(fs.readFileSync(parsedPath, 'utf8'));

const bracketConfig = {
  'full-76ers-vs-celtics': {
    stage: 'First Round', seq: 1, teamA: 'CELTICS', teamB: '76ERS',
    feedA: null, feedB: null
  },
  'full-magic-vs-pistons': {
    stage: 'First Round', seq: 2, teamA: 'PISTONS', teamB: 'MAGIC',
    feedA: null, feedB: null
  },
  'full-cavaliers-vs-raptors': {
    stage: 'First Round', seq: 3, teamA: 'CAVALIERS', teamB: 'RAPTORS',
    feedA: null, feedB: null
  },
  'full-hawks-vs-knicks': {
    stage: 'First Round', seq: 4, teamA: 'KNICKS', teamB: 'HAWKS',
    feedA: null, feedB: null
  },
  'full-suns-vs-thunder': {
    stage: 'First Round', seq: 5, teamA: 'THUNDER', teamB: 'SUNS',
    feedA: null, feedB: null
  },
  'full-lakers-vs-rockets': {
    stage: 'First Round', seq: 6, teamA: 'LAKERS', teamB: 'ROCKETS',
    feedA: null, feedB: null
  },
  'full-spurs-vs-trail-blazers': {
    stage: 'First Round', seq: 7, teamA: 'SPURS', teamB: 'TRAIL BLAZERS',
    feedA: null, feedB: null
  },
  'full-nuggets-vs-timberwolves': {
    stage: 'First Round', seq: 8, teamA: 'TIMBERWOLVES', teamB: 'NUGGETS',
    feedA: null, feedB: null
  },
  'full-76ers-vs-knicks': {
    stage: 'Conference Semifinals', seq: 9, teamA: 'KNICKS', teamB: '76ERS',
    feedA: 'full-hawks-vs-knicks', feedB: 'full-76ers-vs-celtics'
  },
  'full-cavaliers-vs-pistons': {
    stage: 'Conference Semifinals', seq: 10, teamA: 'CAVALIERS', teamB: 'PISTONS',
    feedA: 'full-cavaliers-vs-raptors', feedB: 'full-magic-vs-pistons'
  },
  'full-spurs-vs-timberwolves': {
    stage: 'Conference Semifinals', seq: 11, teamA: 'SPURS', teamB: 'TIMBERWOLVES',
    feedA: 'full-spurs-vs-trail-blazers', feedB: 'full-nuggets-vs-timberwolves'
  },
  'full-lakers-vs-thunder': {
    stage: 'Conference Semifinals', seq: 12, teamA: 'THUNDER', teamB: 'LAKERS',
    feedA: 'full-lakers-vs-rockets', feedB: 'full-suns-vs-thunder'
  },
  'full-cavaliers-vs-knicks': {
    stage: 'Conference Finals', seq: 13, teamA: 'KNICKS', teamB: 'CAVALIERS',
    feedA: 'full-76ers-vs-knicks', feedB: 'full-cavaliers-vs-pistons'
  },
  'full-spurs-vs-thunder': {
    stage: 'Conference Finals', seq: 14, teamA: 'SPURS', teamB: 'THUNDER',
    feedA: 'full-spurs-vs-timberwolves', feedB: 'full-lakers-vs-thunder'
  },
  'nba-finals-knicks-vs-spurs': {
    stage: 'NBA Finals', seq: 15, teamA: 'KNICKS', teamB: 'SPURS',
    feedA: 'full-cavaliers-vs-knicks', feedB: 'full-spurs-vs-thunder'
  }
};

const finalGames = [];
const finalMatchups = [];

for (const key of Object.keys(bracketConfig)) {
  const conf = bracketConfig[key];
  const m = matchups[key];
  const parsedGames = m ? m.games : {};
  const gameNumbers = Object.keys(parsedGames).map(Number);
  
  let maxGame = gameNumbers.length > 0 ? Math.max(...gameNumbers) : 4;
  
  // Standardize series lengths for known actual results
  if (key === 'full-cavaliers-vs-knicks') maxGame = 4; // Knicks swept 4-0
  if (key === 'full-spurs-vs-thunder') maxGame = 7; // WCF went to 7
  if (key === 'nba-finals-knicks-vs-spurs') maxGame = 4; // Finals currently G1-G4
  if (key === 'full-76ers-vs-knicks') maxGame = 4;
  if (key === 'full-lakers-vs-thunder') maxGame = 4;
  
  // Make sure we have a minimum of 4 games
  if (maxGame < 4) maxGame = 4;

  finalMatchups.push({
    id: key,
    title: `${conf.teamA} vs ${conf.teamB}`,
    stageName: conf.stage,
    sequence: conf.seq,
    feederAId: conf.feedA,
    feederBId: conf.feedB
  });

  // Find a fallback video ID in this matchup to fill in missing games
  let fallbackVideoId = 'bt3NwN7k8bY'; // Absolute fallback
  let fallbackDuration = '15 minutes';
  const firstAvailableGame = Object.values(parsedGames)[0];
  if (firstAvailableGame) {
    fallbackVideoId = firstAvailableGame.videoId;
    fallbackDuration = firstAvailableGame.duration;
  }

  for (let gn = 1; gn <= maxGame; gn++) {
    const pg = parsedGames[gn];
    let videoId = fallbackVideoId;
    let title = `${conf.teamA} vs ${conf.teamB} | ${conf.stage} Game ${gn} Highlights`;
    let duration = fallbackDuration;
    let date = `2026-05-${10 + conf.seq}T19:30:00Z`;

    if (pg) {
      videoId = pg.videoId;
      title = pg.title;
      duration = pg.duration;
      date = pg.date;
    } else {
      const baseDay = 10 + conf.seq * 2 + gn;
      date = `2026-05-${baseDay < 10 ? '0' + baseDay : baseDay}T19:30:00Z`;
    }

    finalGames.push({
      id: `${key}-game-${gn}`,
      matchup_id: key,
      game_number: gn,
      title: title,
      team_a: conf.teamA,
      team_b: conf.teamB,
      date: date,
      video_id: videoId,
      duration: duration
    });
  }
}

// Sort matchups by sequence to prevent FK violations upon insert
finalMatchups.sort((a, b) => a.sequence - b.sequence);

// Generate the seed.js file content
const seedCode = `const { db, run, setupSchema } = require('./db');

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
  await run(\`
    INSERT INTO import_templates (id, name, patterns)
    VALUES (?, ?, ?)
  \`, [
    'nba',
    'NBA Playoff Highlights Template',
    JSON.stringify([
      {
        gameRegex: '^(?:EXTENDED:\\\\s+)?#(\\\\d+)\\\\s+([A-Z0-9\\\\s]+?)\\\\s+at\\\\s+#(\\\\d+)\\\\s+([A-Z0-9\\\\s]+?)\\\\s*\\\\|\\\\s*([A-Z0-9\\\\s]+?)\\\\s+GAME\\\\s+(\\\\d+)\\\\s+HIGHLIGHTS',
        fallbackRegex: '^(?:EXTENDED:\\\\s+)?([A-Z0-9\\\\s#]+?)\\\\s+(?:at|vs)\\\\s+([A-Z0-9\\\\s#]+?)\\\\s*\\\\|\\\\s*([A-Z0-9\\\\s]+?)\\\\s+GAME\\\\s+(\\\\d+)\\\\s+HIGHLIGHTS'
      }
    ])
  ]);

  await run(\`
    INSERT INTO import_templates (id, name, patterns)
    VALUES (?, ?, ?)
  \`, [
    'generic',
    'Generic VS Match Template',
    JSON.stringify([
      {
        gameRegex: '^(?:EXTENDED:\\\\s+)?([A-Z0-9\\\\s#]+?)\\\\s+vs\\\\s+([A-Z0-9\\\\s#]+?)\\\\s*\\\\|\\\\s*([A-Z0-9\\\\s]+?)\\\\s+-\\\\s+Game\\\\s+(\\\\d+)',
        fallbackRegex: '^(?:EXTENDED:\\\\s+)?([A-Z0-9\\\\s#]+?)\\\\s+vs\\\\s+([A-Z0-9\\\\s#]+?)\\\\s*\\\\|\\\\s*([A-Z0-9\\\\s]+?)\\\\s+Game\\\\s+(\\\\d+)'
      }
    ])
  ]);

  // Seed Import Sources
  console.log('[Seed] Seeding import sources...');
  await run(\`
    INSERT INTO import_sources (id, name, source_type, resource, import_template_id)
    VALUES (?, ?, ?, ?, ?)
  \`, [
    'nba-playoffs-2026-source',
    'NBA Playoffs 2026 YouTube Playlist',
    'youtube_playlist',
    'PLlVlyGVtvuVnHNlPZ6vWeEuK2BNMF7c4t',
    'nba'
  ]);

  // 1. Insert Tournaments
  console.log('[Seed] Seeding tournaments...');
  await run(\`
    INSERT INTO tournaments (id, title, description, type, source_id, completed)
    VALUES (?, ?, ?, ?, ?, ?)
  \`, [
    'nba-playoffs-2026',
    'NBA Playoffs | 2025-26 Season',
    'Experience the entire NBA Playoffs bracket from Round 1 through the NBA Finals in strict chronological order, completely spoiler-free.',
    'bracket',
    'nba-playoffs-2026-source',
    0
  ]);

  await run(\`
    INSERT INTO tournaments (id, title, description, type, source_id, completed)
    VALUES (?, ?, ?, ?, ?, ?)
  \`, [
    'linear-mock-tournament',
    'FIFA World Cup Mock Group Stage',
    'Experience a mock soccer tournament group stage timeline, linear and spoiler-free.',
    'linear',
    null,
    0
  ]);

  // 2. Insert Matchups
  console.log('[Seed] Seeding matchups...');
  const matchups = ${JSON.stringify(finalMatchups, null, 2)};
  
  for (const m of matchups) {
    await run(\`
      INSERT INTO matchups (id, tournament_id, title, stage_name, sequence, feeder_a_id, feeder_b_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    \`, [
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
  const games = ${JSON.stringify(finalGames, null, 2)};

  for (const game of games) {
    await run(\`
      INSERT INTO games (id, matchup_id, game_number, title, team_a, team_b, date, video_id, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`, [
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
    await run(\`
      INSERT INTO matchups (id, tournament_id, title, stage_name, sequence, feeder_a_id, feeder_b_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    \`, [
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
    await run(\`
      INSERT INTO games (id, matchup_id, game_number, title, team_a, team_b, date, video_id, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`, [
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

  console.log(\`[Seed] Seeded \${matchups.length + linearMatchups.length} matchups and \${games.length + linearGames.length} games.\`);
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
`;

fs.writeFileSync(path.join(__dirname, '../server/seed.js'), seedCode);
console.log('Successfully wrote full-bracket seed file to server/seed.js');
console.log(`Seeded ${finalMatchups.length} matchups and ${finalGames.length} games.`);
