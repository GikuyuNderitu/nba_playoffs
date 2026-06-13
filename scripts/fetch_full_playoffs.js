require('dotenv').config();
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.YOUTUBE_API_KEY;
const PLAYLIST_ID = 'PLlVlyGVtvuVnHNlPZ6vWeEuK2BNMF7c4t';

if (!API_KEY) {
  console.error('Error: YOUTUBE_API_KEY is missing in .env');
  process.exit(1);
}

async function fetchPlaylistItems(pageToken = '') {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${PLAYLIST_ID}&key=${API_KEY}&pageToken=${pageToken}`;
  
  const response = await fetch(url);
  if (response.status !== 200) {
    const text = await response.text();
    throw new Error(`YouTube API failed with status ${response.status}: ${text}`);
  }
  
  const data = await response.json();
  return {
    items: data.items || [],
    nextPageToken: data.nextPageToken || null
  };
}

async function main() {
  console.log('[Importer] Fetching all playlist items from YouTube Data API...');
  let allItems = [];
  let pageToken = '';
  let page = 1;
  
  try {
    do {
      console.log(`[Importer] Fetching page ${page}...`);
      const { items, nextPageToken } = await fetchPlaylistItems(pageToken);
      console.log(`[Importer] Fetched ${items.length} items.`);
      allItems = allItems.concat(items);
      pageToken = nextPageToken;
      page++;
      
      // Small sleep to be polite
      await new Promise(resolve => setTimeout(resolve, 100));
    } while (pageToken);
    
    console.log(`[Importer] Completed. Total items fetched: ${allItems.length}`);
    
    // Save raw items
    const rawFilePath = path.join(__dirname, '../server/raw_playoffs_videos.json');
    fs.mkdirSync(path.dirname(rawFilePath), { recursive: true });
    fs.writeFileSync(rawFilePath, JSON.stringify(allItems, null, 2));
    console.log(`[Importer] Saved raw items to ${rawFilePath}`);
  } catch (err) {
    console.error('[Importer] Error fetching playlist:', err.message);
    process.exit(1);
  }
}

main();
