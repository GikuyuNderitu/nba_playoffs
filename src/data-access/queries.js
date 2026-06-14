import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCachedProgress, setCachedProgress } from './db';

// Helper to fetch JSON from API, throws descriptive errors
const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errMsg = `Request failed: ${res.status}`;
    try {
      const errBody = await res.json();
      errMsg = errBody.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  return res.json();
};

/**
 * Hook to retrieve all available tournaments joined with session status.
 */
export function useTournaments(sessionId) {
  return useQuery({
    queryKey: ['tournaments', sessionId],
    queryFn: () => fetchJson(`/api/tournaments?session_id=${sessionId || ''}`)
  });
}

/**
 * Hook to update tournament settings (spoiler-free mode, manual watched status).
 */
export function useUpdateTournamentSettings(sessionId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tournamentId, spoilerFree, isWatched }) =>
      fetchJson(`/api/sessions/${sessionId}/tournaments/${tournamentId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spoilerFree, isWatched })
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['tournament', variables.tournamentId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', variables.tournamentId, sessionId] });
    }
  });
}

/**
 * Hook to retrieve tournament details (matchups and visible games).
 */
export function useTournamentDetails(tournamentId, sessionId) {
  return useQuery({
    queryKey: ['tournament', tournamentId, sessionId],
    queryFn: () => fetchJson(`/api/tournaments/${tournamentId}?session_id=${sessionId || ''}`),
    enabled: !!tournamentId
  });
}

/**
 * Hook to retrieve the chronological dynamic timeline of unlocked games.
 */
export function useTournamentTimeline(tournamentId, sessionId) {
  return useQuery({
    queryKey: ['timeline', tournamentId, sessionId],
    queryFn: () => fetchJson(`/api/tournaments/${tournamentId}/timeline?session_id=${sessionId || ''}`),
    enabled: !!tournamentId
  });
}

/**
 * Hook to retrieve session watch progress with offline IndexedDB fallback.
 */
export function useSessionProgress(sessionId) {
  return useQuery({
    queryKey: ['progress', sessionId],
    queryFn: async () => {
      if (!sessionId) return {};
      try {
        const data = await fetchJson(`/api/sessions/${sessionId}/progress`);
        // Sync cache to IndexedDB
        await setCachedProgress(sessionId, data.progress);
        return data.progress;
      } catch (err) {
        console.warn('[Queries] Network failed, falling back to IndexedDB progress cache:', err.message);
        return await getCachedProgress(sessionId);
      }
    },
    enabled: !!sessionId
  });
}

/**
 * Hook to register a new watch session.
 */
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchJson('/api/sessions', { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.setQueryData(['progress', data.id], {});
    }
  });
}

/**
 * Hook to clone progress from an existing session to a new session.
 */
export function useCloneSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceSessionId) => 
      fetchJson(`/api/sessions/${sourceSessionId}/clone`, { method: 'POST' }),
    onSuccess: (data) => {
      // Invalidate queries so the client picks up the new progress
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    }
  });
}

/**
 * Hook to save or toggle a game's progress status with optimistic UI updates.
 */
export function useUpdateProgress(sessionId, tournamentId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, status }) =>
      fetchJson(`/api/sessions/${sessionId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, status })
      }),
      
    // Optimistic UI updates
    onMutate: async ({ gameId, status }) => {
      // Cancel outgoing queries so they do not overwrite our optimistic updates
      await queryClient.cancelQueries({ queryKey: ['progress', sessionId] });
      await queryClient.cancelQueries({ queryKey: ['tournament', tournamentId, sessionId] });
      await queryClient.cancelQueries({ queryKey: ['timeline', tournamentId, sessionId] });

      // Snapshot current cache states
      const previousProgress = queryClient.getQueryData(['progress', sessionId]) || {};
      const previousTournament = queryClient.getQueryData(['tournament', tournamentId, sessionId]);
      const previousTimeline = queryClient.getQueryData(['timeline', tournamentId, sessionId]);

      // Optimistically update progress in React Query cache
      const nextProgress = { ...previousProgress };
      if (status === 'unwatched') {
        delete nextProgress[gameId];
      } else {
        nextProgress[gameId] = status;
      }
      queryClient.setQueryData(['progress', sessionId], nextProgress);

      // Optimistically cache to IndexedDB
      await setCachedProgress(sessionId, nextProgress);

      // Return context snapshots for rollback
      return { previousProgress, previousTournament, previousTimeline };
    },

    // Rollback to snapshot if mutation fails
    onError: async (err, variables, context) => {
      if (context) {
        queryClient.setQueryData(['progress', sessionId], context.previousProgress);
        queryClient.setQueryData(['tournament', tournamentId, sessionId], context.previousTournament);
        queryClient.setQueryData(['timeline', tournamentId, sessionId], context.previousTimeline);
        await setCachedProgress(sessionId, context.previousProgress);
      }
    },

    // Invalidate and sync after request completes
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', tournamentId, sessionId] });
    }
  });
}
