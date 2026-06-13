import localforage from 'localforage';

localforage.config({
  name: 'nba-playoffs-viewer',
  storeName: 'progress_cache',
  description: 'Stores offline watch session progress for a spoiler-free experience'
});

/**
 * Retrieves the cached progress map for a given watch session ID.
 * @param {string} sessionId
 * @returns {Promise<Record<string, string>>}
 */
export async function getCachedProgress(sessionId) {
  try {
    return (await localforage.getItem(`progress_${sessionId}`)) || {};
  } catch (err) {
    console.error('[IndexedDB] Failed to read progress cache:', err);
    return {};
  }
}

/**
 * Caches the progress map for a given watch session ID.
 * @param {string} sessionId
 * @param {Record<string, string>} progressMap
 * @returns {Promise<void>}
 */
export async function setCachedProgress(sessionId, progressMap) {
  try {
    await localforage.setItem(`progress_${sessionId}`, progressMap);
  } catch (err) {
    console.error('[IndexedDB] Failed to write progress cache:', err);
  }
}

/**
 * Clears the progress cache for a given watch session ID.
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function clearCachedProgress(sessionId) {
  try {
    await localforage.removeItem(`progress_${sessionId}`);
  } catch (err) {
    console.error('[IndexedDB] Failed to clear progress cache:', err);
  }
}

export default localforage;
