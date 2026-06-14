// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseUrlRoute, buildUrl } from '../utils/router';

describe('Router Utility Unit Tests', () => {
  describe('parseUrlRoute', () => {
    it('should parse root path', () => {
      const result = parseUrlRoute('/', '?s=session123&view=timeline');
      expect(result).toEqual({
        s: 'session123',
        tournamentId: '',
        view: 'timeline',
        matchupId: null,
        gameId: null,
        stage: '',
      });
    });

    it('should parse tournament overview path', () => {
      const result = parseUrlRoute('/t/nba-playoffs-2026', '?s=session123');
      expect(result).toEqual({
        s: 'session123',
        tournamentId: 'nba-playoffs-2026',
        view: 'bracket', // default
        matchupId: null,
        gameId: null,
        stage: '',
      });
    });

    it('should parse tournament overview path with timeline view', () => {
      const result = parseUrlRoute('/t/nba-playoffs-2026', '?s=session123&view=timeline');
      expect(result).toEqual({
        s: 'session123',
        tournamentId: 'nba-playoffs-2026',
        view: 'timeline',
        matchupId: null,
        gameId: null,
        stage: '',
      });
    });

    it('should parse direct matchup path (without game)', () => {
      const result = parseUrlRoute('/t/nba-playoffs-2026/m/m1', '?s=session123&stage=First+Round');
      expect(result).toEqual({
        s: 'session123',
        tournamentId: 'nba-playoffs-2026',
        view: 'matchup',
        matchupId: 'm1',
        gameId: null,
        stage: 'First Round',
      });
    });

    it('should parse full matchup and game path', () => {
      const result = parseUrlRoute('/t/nba-playoffs-2026/m/m1/g/g1', '?s=session123&stage=First+Round');
      expect(result).toEqual({
        s: 'session123',
        tournamentId: 'nba-playoffs-2026',
        view: 'matchup',
        matchupId: 'm1',
        gameId: 'g1',
        stage: 'First Round',
      });
    });
  });

  describe('buildUrl', () => {
    it('should build root path with session ID', () => {
      const url = buildUrl({
        tournamentId: '',
        sessionId: 'session123',
      });
      expect(url).toBe('/?s=session123');
    });

    it('should build tournament overview path with defaults', () => {
      const url = buildUrl({
        tournamentId: 'nba-playoffs-2026',
        sessionId: 'session123',
      });
      expect(url).toBe('/t/nba-playoffs-2026?s=session123');
    });

    it('should build tournament overview path with timeline view preserved', () => {
      const url = buildUrl({
        tournamentId: 'nba-playoffs-2026',
        sessionId: 'session123',
        view: 'timeline',
      });
      expect(url).toBe('/t/nba-playoffs-2026?s=session123&view=timeline');
    });

    it('should build full matchup and game path with stage parameter', () => {
      const url = buildUrl({
        tournamentId: 'nba-playoffs-2026',
        matchupId: 'm1',
        gameId: 'g1',
        sessionId: 'session123',
        view: 'matchup',
        stage: 'First Round',
      });
      expect(url).toBe('/t/nba-playoffs-2026/m/m1/g/g1?s=session123&stage=First+Round');
    });
  });
});
