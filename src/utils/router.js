/**
 * Parses the current URL pathname and search parameters into structured routing state.
 * 
 * Supports paths:
 * - / (root) -> tournamentId: '', view: search.view || 'bracket'
 * - /t/:tournamentId -> tournamentId, view: search.view || 'bracket'
 * - /t/:tournamentId/m/:matchupId -> tournamentId, matchupId, view: 'matchup'
 * - /t/:tournamentId/m/:matchupId/g/:gameId -> tournamentId, matchupId, gameId, view: 'matchup'
 * 
 * @param {string} pathname - The window.location.pathname
 * @param {string} search - The window.location.search
 * @returns {object} Parsed route state
 */
export function parseUrlRoute(pathname, search) {
  const searchParams = new URLSearchParams(search);
  const sessionId = searchParams.get('s') || '';
  const viewParam = searchParams.get('view') || 'bracket';
  const stage = searchParams.get('stage') || '';

  let tournamentId = '';
  let matchupId = null;
  let gameId = null;
  let viewOverride = null;

  // Pattern 3: /t/:tournamentId/m/:matchupId/g/:gameId
  const gameMatch = pathname.match(/^\/t\/([^\/]+)\/m\/([^\/]+)\/g\/([^\/]+)\/?$/);
  if (gameMatch) {
    tournamentId = gameMatch[1];
    matchupId = gameMatch[2];
    gameId = gameMatch[3];
    viewOverride = 'matchup';
  } else {
    // Pattern 2: /t/:tournamentId/m/:matchupId
    const matchupMatch = pathname.match(/^\/t\/([^\/]+)\/m\/([^\/]+)\/?$/);
    if (matchupMatch) {
      tournamentId = matchupMatch[1];
      matchupId = matchupMatch[2];
      viewOverride = 'matchup';
    } else {
      // Pattern 1: /t/:tournamentId
      const tournamentMatch = pathname.match(/^\/t\/([^\/]+)\/?$/);
      if (tournamentMatch) {
        tournamentId = tournamentMatch[1];
      }
    }
  }

  return {
    s: sessionId,
    tournamentId,
    view: viewOverride || viewParam,
    matchupId,
    gameId,
    stage,
  };
}

/**
 * Builds a RESTful URL string from routing parameters.
 * 
 * @param {object} params
 * @param {string} params.tournamentId - The ID of the tournament
 * @param {string|null} [params.matchupId] - The ID of the matchup
 * @param {string|null} [params.gameId] - The ID of the game
 * @param {string} [params.sessionId] - The current watch session ID
 * @param {string} [params.view] - The display mode ('bracket' | 'timeline' | 'matchup')
 * @param {string|null} [params.stage] - The name of the tournament stage (for metadata/context)
 * @returns {string} The constructed URL path and query string
 */
export function buildUrl({ tournamentId, matchupId, gameId, sessionId, view, stage }) {
  if (!tournamentId) {
    const params = new URLSearchParams();
    if (sessionId) params.set('s', sessionId);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  }

  let path = `/t/${tournamentId}`;
  if (matchupId) {
    path += `/m/${matchupId}`;
    if (gameId) {
      path += `/g/${gameId}`;
    }
  }

  const params = new URLSearchParams();
  if (sessionId) {
    params.set('s', sessionId);
  }

  // Preserve tournament view (bracket/timeline) so clicking "Back" restores it
  if (view && view !== 'bracket' && view !== 'matchup') {
    params.set('view', view);
  }

  // Preserve stage query parameter if in matchup view
  if (matchupId && stage) {
    params.set('stage', stage);
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
