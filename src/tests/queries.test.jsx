// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getCachedProgress, setCachedProgress, clearCachedProgress } from '../data-access/db';
import { useSessionProgress } from '../data-access/queries';

describe('Frontend Caching & React Query Tests', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await clearCachedProgress('test-session');
  });

  afterEach(async () => {
    await clearCachedProgress('test-session');
  });

  it('should write, read, and clear progress using localforage IndexedDB cache', async () => {
    const progressMap = { 'game-1': 'watched', 'game-2': 'skipped' };
    
    // Write cache
    await setCachedProgress('test-session', progressMap);

    // Read cache
    const cached = await getCachedProgress('test-session');
    expect(cached).toEqual(progressMap);

    // Clear cache
    await clearCachedProgress('test-session');
    const empty = await getCachedProgress('test-session');
    expect(empty).toEqual({});
  });

  it('should fetch progress and save it to IndexedDB cache on success', async () => {
    const apiProgress = { 'game-1': 'watched' };
    
    // Mock successful fetch response
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ progress: apiProgress })
      })
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSessionProgress('test-session'), { wrapper });

    // Wait for the query to resolve
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(apiProgress);
    expect(fetchSpy).toHaveBeenCalledWith('/api/sessions/test-session/progress', {});

    // Verify it got cached to IndexedDB
    const cached = await getCachedProgress('test-session');
    expect(cached).toEqual(apiProgress);

    fetchSpy.mockRestore();
  });

  it('should fall back to IndexedDB progress cache when the API request fails (offline mode)', async () => {
    const offlineProgress = { 'game-2': 'skipped' };
    
    // Pre-populate IndexedDB cache
    await setCachedProgress('test-session', offlineProgress);

    // Mock API fetch to fail (simulating offline/network error)
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSessionProgress('test-session'), { wrapper });

    // Wait for query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Must return the cached progress from localforage instead of throwing/failing!
    expect(result.current.data).toEqual(offlineProgress);
    expect(fetchSpy).toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
