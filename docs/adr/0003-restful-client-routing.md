# 3. Custom RESTful Client-Side Routing

For representing page navigation and specific video matchups via clean, bookmarkable paths, we decided to implement a custom RESTful client-side router in `src/utils/router.js` rather than installing third-party routing packages like `react-router-dom` or `@tanstack/react-router`.

## Context & Rationale
1. **Simplicity and Bundle Size:** The application has extremely simple routing requirements—basically two view contexts: the tournament overview (with bracket or timeline views) and the specific matchup-game detail view. A custom router handles this in less than 40 lines of code without any external library overhead.
2. **React 19 Compatibility:** The application is built on React 19. Relying on third-party routing libraries could introduce peer dependency resolution issues or version mismatches during builds.
3. **Robust State Sync:** The application relies heavily on query parameter variables for watcher progress (`?s=sessionId`) and active page view toggles (`?view=bracket` or `?view=timeline`). A custom utility allows us to easily merge path variables and query strings into a single unified history update logic.

## Routing Schema
- **Tournament View:** `/t/:tournamentId` (defaults to bracket view, can be configured with `?view=timeline` or `?view=bracket` query params)
- **Matchup & Game View:** `/t/:tournamentId/m/:matchupId/g/:gameId` (automatically resolves to the first unwatched game if only `/t/:tournamentId/m/:matchupId` is requested)
- **Session Progress:** Carried dynamically via the `?s=sessionId` query parameter across all paths.
