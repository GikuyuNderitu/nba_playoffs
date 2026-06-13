const fs = require('fs');
const path = require('path');

const rawFilePath = path.join(__dirname, '../server/raw_playoffs_videos.json');
const rawItems = JSON.parse(fs.readFileSync(rawFilePath, 'utf8'));

console.log(`Processing ${rawItems.length} raw playlist items...`);

function parseISODuration(duration) {
  if (!duration) return '15 minutes';
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return '15 minutes';
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
  
  return parts.join(', ') || '15 minutes';
}

const gameRegex = /^(?:EXTENDED:\s+)?#(\d+)\s+([A-Z0-9\s]+?)\s+at\s+#(\d+)\s+([A-Z0-9\s]+?)\s*\|\s*([A-Z0-9\s]+?)\s+GAME\s+(\d+)\s+HIGHLIGHTS/i;
const fallbackRegex = /^(?:EXTENDED:\s+)?([A-Z0-9\s#]+?)\s+(?:at|vs)\s+([A-Z0-9\s#]+?)\s*\|\s*([A-Z0-9\s]+?)\s+GAME\s+(\d+)\s+HIGHLIGHTS/i;

const games = [];
let matchedCount = 0;

for (const item of rawItems) {
  const title = item.snippet.title;
  const videoId = item.contentDetails.videoId;
  const date = item.snippet.publishedAt;
  const durationRaw = item.contentDetails.duration;
  const duration = parseISODuration(durationRaw);
  
  let match = title.match(gameRegex);
  if (match) {
    const seedA = parseInt(match[1]);
    const teamA = match[2].trim();
    const seedB = parseInt(match[3]);
    const teamB = match[4].trim();
    const roundName = match[5].trim();
    const gameNumber = parseInt(match[6]);
    const isExtended = title.toLowerCase().startsWith('extended:');
    
    games.push({
      videoId,
      title,
      seedA,
      teamA,
      seedB,
      teamB,
      roundName,
      gameNumber,
      date,
      isExtended,
      duration
    });
    matchedCount++;
  } else {
    match = title.match(fallbackRegex);
    if (match) {
      const teamA = match[1].trim();
      const teamB = match[2].trim();
      const roundName = match[3].trim();
      const gameNumber = parseInt(match[4]);
      const isExtended = title.toLowerCase().startsWith('extended:');
      
      games.push({
        videoId,
        title,
        teamA,
        teamB,
        roundName,
        gameNumber,
        date,
        isExtended,
        duration,
        fallback: true
      });
      matchedCount++;
    }
  }
}

console.log(`Matched ${matchedCount} game videos using regex.`);

// Group games by matchup
const matchups = {};

for (const g of games) {
  const cleanTeam = (name) => name.replace(/^#\d+\s+/, '').trim().toUpperCase();
  const team1 = cleanTeam(g.teamA);
  const team2 = cleanTeam(g.teamB);
  const sortedTeams = [team1, team2].sort();
  const matchupKey = `${g.roundName.replace(/\s+/g, '-')}-${sortedTeams[0]}-vs-${sortedTeams[1]}`.toLowerCase();
  
  if (!matchups[matchupKey]) {
    matchups[matchupKey] = {
      id: matchupKey,
      title: `${sortedTeams[0]} vs ${sortedTeams[1]}`,
      stageName: g.roundName,
      teamA: sortedTeams[0],
      teamB: sortedTeams[1],
      games: {}
    };
  }
  
  const gameKey = g.gameNumber;
  const existing = matchups[matchupKey].games[gameKey];
  if (!existing || (!existing.isExtended && g.isExtended)) {
    matchups[matchupKey].games[gameKey] = g;
  }
}

fs.writeFileSync(path.join(__dirname, '../server/parsed_bracket.json'), JSON.stringify(matchups, null, 2));
console.log('Saved parsed matchups to server/parsed_bracket.json');
