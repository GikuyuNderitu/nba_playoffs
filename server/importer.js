const { run, all, get } = require('./db');

const presets = {
  nba: {
    gameRegex: /^(?:EXTENDED:\s+)?#(\d+)\s+([A-Z0-9\s]+?)\s+at\s+#(\d+)\s+([A-Z0-9\s]+?)\s*\|\s*([A-Z0-9\s]+?)\s+GAME\s+(\d+)\s+HIGHLIGHTS/i,
    fallbackRegex: /^(?:EXTENDED:\s+)?([A-Z0-9\s#]+?)\s+(?:at|vs)\s+([A-Z0-9\s#]+?)\s*\|\s*([A-Z0-9\s]+?)\s+GAME\s+(\d+)\s+HIGHLIGHTS/i
  },
  generic: {
    gameRegex: /^(?:EXTENDED:\s+)?([A-Z0-9\s#]+?)\s+vs\s+([A-Z0-9\s#]+?)\s*\|\s*([A-Z0-9\s]+?)\s+-\s+Game\s+(\d+)/i,
    fallbackRegex: /^(?:EXTENDED:\s+)?([A-Z0-9\s#]+?)\s+vs\s+([A-Z0-9\s#]+?)\s*\|\s*([A-Z0-9\s]+?)\s+Game\s+(\d+)/i
  }
};

async function parseAndImportPlaylist({
  playlistId,
  tournamentId,
  title,
  description,
  type = 'bracket',
  presetName = 'nba',
  sourceId = null
}) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not configured in environment');
  }

  // 1. Fetch all items from YouTube API (paginated)
  console.log(`[Importer] Fetching playlist ${playlistId}...`);
  let allItems = [];
  let pageToken = '';
  
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}&pageToken=${pageToken}`;
    const response = await fetch(url);
    if (response.status !== 200) {
      const errText = await response.text();
      throw new Error(`YouTube API error: ${response.status} - ${errText}`);
    }
    const data = await response.json();
    allItems = allItems.concat(data.items || []);
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  console.log(`[Importer] Fetched ${allItems.length} items. Parsing...`);

  // 2. Fetch Import Template from DB or fall back to static presets
  const templateRow = await get('SELECT * FROM import_templates WHERE id = ?', [presetName]);
  let patterns = [];
  if (templateRow) {
    try {
      patterns = JSON.parse(templateRow.patterns);
    } catch (e) {
      console.warn('[Importer] Failed to parse template patterns from database:', e.message);
    }
  }

  if (patterns.length === 0) {
    const hardcoded = presets[presetName] || presets.nba;
    patterns = [
      {
        gameRegex: hardcoded.gameRegex.source,
        fallbackRegex: hardcoded.fallbackRegex ? hardcoded.fallbackRegex.source : null
      }
    ];
  }

  const compiledPatterns = patterns.map(p => ({
    gameRegex: new RegExp(p.gameRegex, 'i'),
    fallbackRegex: p.fallbackRegex ? new RegExp(p.fallbackRegex, 'i') : null
  }));

  const games = [];

  for (const item of allItems) {
    const videoTitle = item.snippet.title;
    const videoId = item.contentDetails.videoId;
    const date = item.snippet.publishedAt || new Date().toISOString();
    const isExtended = videoTitle.toLowerCase().startsWith('extended:');

    let match = null;
    let isFallback = false;
    for (const p of compiledPatterns) {
      match = videoTitle.match(p.gameRegex);
      if (match) {
        break;
      }
      if (p.fallbackRegex) {
        match = videoTitle.match(p.fallbackRegex);
        if (match) {
          isFallback = true;
          break;
        }
      }
    }

    if (match) {
      let teamA, teamB, roundName, gameNumber;
      if (!isFallback && match.length >= 7) {
        teamA = match[2].trim().toUpperCase();
        teamB = match[4].trim().toUpperCase();
        roundName = match[5].trim();
        gameNumber = parseInt(match[6]);
      } else {
        teamA = match[1].replace(/^#\d+\s+/, '').trim().toUpperCase();
        teamB = match[2].replace(/^#\d+\s+/, '').trim().toUpperCase();
        roundName = match[3].trim();
        gameNumber = parseInt(match[4]);
      }

      games.push({
        videoId,
        title: videoTitle,
        teamA,
        teamB,
        roundName,
        gameNumber,
        date,
        isExtended,
        duration: '15 minutes'
      });
    }
  }

  if (games.length === 0) {
    throw new Error('No game videos matched the selected import template in this playlist');
  }

  // 3. Group and de-duplicate games
  const matchupsMap = new Map();
  for (const g of games) {
    const sortedTeams = [g.teamA, g.teamB].sort();
    const stageKey = g.roundName.replace(/\s+/g, '-').toLowerCase();
    const matchupId = `${stageKey}-${sortedTeams[0]}-vs-${sortedTeams[1]}`.toLowerCase();

    if (!matchupsMap.has(matchupId)) {
      matchupsMap.set(matchupId, {
        id: matchupId,
        title: `${sortedTeams[0]} vs ${sortedTeams[1]}`,
        stageName: g.roundName,
        teamA: sortedTeams[0],
        teamB: sortedTeams[1],
        games: new Map()
      });
    }

    const m = matchupsMap.get(matchupId);
    const existing = m.games.get(g.gameNumber);
    if (!existing || (!existing.isExtended && g.isExtended)) {
      m.games.set(g.gameNumber, g);
    }
  }

  const parsedMatchups = Array.from(matchupsMap.values()).map(m => {
    return {
      ...m,
      games: Array.from(m.games.values()).sort((a, b) => a.gameNumber - b.gameNumber)
    };
  });

  // 4. Assign stage levels and sequence numbers
  function getStageLevel(stageName) {
    const s = stageName.toLowerCase();
    if (s.includes('first') || s.includes('round 1')) return 1;
    if (s.includes('semifinal') || s.includes('semis')) return 2;
    if (s.includes('conference final') || s.includes('conf. final')) return 3;
    if (s.includes('final')) return 4;
    return 5;
  }

  parsedMatchups.sort((a, b) => getStageLevel(a.stageName) - getStageLevel(b.stageName));
  for (let i = 0; i < parsedMatchups.length; i++) {
    parsedMatchups[i].sequence = i + 1;
    parsedMatchups[i].stageLevel = getStageLevel(parsedMatchups[i].stageName);
  }

  // 5. Reconstruct feeder relationships dynamically based on team progression
  for (const m of parsedMatchups) {
    m.feederAId = null;
    m.feederBId = null;

    if (m.stageLevel > 1) {
      const precedingMatchups = parsedMatchups.filter(pm => pm.stageLevel < m.stageLevel);
      
      const feederA = precedingMatchups.find(pm => pm.teamA === m.teamA || pm.teamB === m.teamA);
      if (feederA) m.feederAId = feederA.id;

      const feederB = precedingMatchups.find(pm => pm.teamA === m.teamB || pm.teamB === m.teamB);
      if (feederB) m.feederBId = feederB.id;
    }
  }

  // 6. Write to database transactionally (using idempotent upserts)
  console.log(`[Importer] Saving tournament ${tournamentId} to database...`);
  
  await run('BEGIN TRANSACTION');
  try {
    // Insert/Update Tournament
    await run(`
      INSERT INTO tournaments (id, title, description, type, source_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        type = excluded.type,
        source_id = excluded.source_id
    `, [tournamentId, title, description, type, sourceId]);

    // Fetch existing matchups and games to calculate deletions later
    const existingMatchups = await all('SELECT * FROM matchups WHERE tournament_id = ?', [tournamentId]);
    const existingMatchupIds = existingMatchups.map(m => m.id);

    let existingGames = [];
    if (existingMatchupIds.length > 0) {
      const placeholders = existingMatchupIds.map(() => '?').join(',');
      existingGames = await all(`SELECT * FROM games WHERE matchup_id IN (${placeholders})`, existingMatchupIds);
    }

    const importedMatchupIds = new Set(parsedMatchups.map(m => m.id));
    const importedGameIds = new Set();
    for (const m of parsedMatchups) {
      for (const g of m.games) {
        importedGameIds.add(`${m.id}-game-${g.gameNumber}`);
      }
    }

    // Upsert new matchups and games
    for (const m of parsedMatchups) {
      await run(`
        INSERT INTO matchups (id, tournament_id, title, stage_name, sequence, feeder_a_id, feeder_b_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          stage_name = excluded.stage_name,
          sequence = excluded.sequence,
          feeder_a_id = excluded.feeder_a_id,
          feeder_b_id = excluded.feeder_b_id
      `, [m.id, tournamentId, m.title, m.stageName, m.sequence, m.feederAId, m.feederBId]);

      for (const g of m.games) {
        const gameId = `${m.id}-game-${g.gameNumber}`;
        await run(`
          INSERT INTO games (id, matchup_id, game_number, title, team_a, team_b, date, video_id, duration)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            team_a = excluded.team_a,
            team_b = excluded.team_b,
            date = excluded.date,
            video_id = excluded.video_id,
            duration = excluded.duration
        `, [gameId, m.id, g.gameNumber, g.title, g.teamA, g.teamB, g.date, g.videoId, g.duration]);
      }
    }

    // Delete orphaned games
    const gamesToDelete = existingGames.filter(eg => !importedGameIds.has(eg.id));
    if (gamesToDelete.length > 0) {
      const deletePlaceholders = gamesToDelete.map(() => '?').join(',');
      await run(`DELETE FROM games WHERE id IN (${deletePlaceholders})`, gamesToDelete.map(g => g.id));
    }

    // Delete orphaned matchups
    const matchupsToDelete = existingMatchups.filter(em => !importedMatchupIds.has(em.id));
    if (matchupsToDelete.length > 0) {
      const deletePlaceholders = matchupsToDelete.map(() => '?').join(',');
      await run(`DELETE FROM matchups WHERE id IN (${deletePlaceholders})`, matchupsToDelete.map(m => m.id));
    }

    await run('COMMIT');
    console.log(`[Importer] Successfully imported ${parsedMatchups.length} matchups and ${parsedMatchups.flatMap(m => m.games).length} games.`);
    
    return {
      matchupCount: parsedMatchups.length,
      gameCount: parsedMatchups.flatMap(m => m.games).length
    };
  } catch (err) {
    await run('ROLLBACK');
    console.error('[Importer] Database transaction failed, rolled back:', err.message);
    throw err;
  }
}

module.exports = {
  parseAndImportPlaylist
};
