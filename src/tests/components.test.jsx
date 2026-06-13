// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import BracketView from '../components/BracketView';
import MatchupDetails from '../components/MatchupDetails';
import TimelineView from '../components/TimelineView';
import VideoPlayer from '../components/VideoPlayer';

describe('Spoiler-Free UI Components Unit Tests', () => {
  afterEach(() => {
    cleanup();
  });
  const mockMatchups = [
    {
      id: 'first-round-76ers-vs-celtics',
      title: 'CELTICS vs 76ERS',
      stageName: 'First Round',
      sequence: 1,
      feederAId: null,
      feederBId: null,
      contenderA: 'CELTICS',
      contenderB: '76ERS',
      isLocked: false,
      games: [
        { id: 'g1', game_number: 1, title: 'Celtics at 76ers Game 1 Highlights', status: 'watched', team_a: 'CELTICS', team_b: '76ERS', duration: '15m', date: '2026-04-19' },
        { id: 'g2', game_number: 2, title: 'Celtics at 76ers Game 2 Highlights', status: 'unwatched', team_a: 'CELTICS', team_b: '76ERS', duration: '15m', date: '2026-04-21' }
      ]
    },
    {
      id: 'first-round-hawks-vs-knicks',
      title: 'KNICKS vs HAWKS',
      stageName: 'First Round',
      sequence: 4,
      feederAId: null,
      feederBId: null,
      contenderA: 'KNICKS',
      contenderB: 'HAWKS',
      isLocked: false,
      games: [
        { id: 'k1', game_number: 1, title: 'Knicks at Hawks Game 1 Highlights', status: 'watched', team_a: 'KNICKS', team_b: 'HAWKS', duration: '15m', date: '2026-04-18' }
      ]
    },
    {
      id: 'semis-76ers-vs-knicks',
      title: 'KNICKS vs 76ERS',
      stageName: 'Semifinals',
      sequence: 9,
      feederAId: 'first-round-hawks-vs-knicks',
      feederBId: 'first-round-76ers-vs-celtics',
      contenderA: 'Winner of KNICKS vs HAWKS',
      contenderB: 'Winner of CELTICS vs 76ERS',
      isLocked: true,
      games: []
    }
  ];

  describe('BracketView', () => {
    it('should render unlocked matchups with actual contenders and support selection', () => {
      const handleSelect = vi.fn();
      render(<BracketView matchups={mockMatchups} onSelectMatchup={handleSelect} />);

      // Verify contender names are rendered
      expect(screen.getByText('CELTICS')).toBeDefined();
      expect(screen.getByText('76ERS')).toBeDefined();

      // Verify selecting card calls the handler
      const celticsCard = screen.getByText('CELTICS').closest('.matchup-card');
      fireEvent.click(celticsCard);
      expect(handleSelect).toHaveBeenCalledWith(mockMatchups[0]);
    });

    it('should render locked matchups with placeholders and block click actions', () => {
      const handleSelect = vi.fn();
      render(<BracketView matchups={mockMatchups} onSelectMatchup={handleSelect} />);

      // Verify placeholders are rendered
      expect(screen.getByText('Winner of KNICKS vs HAWKS')).toBeDefined();
      expect(screen.getByText('Winner of CELTICS vs 76ERS')).toBeDefined();

      // Verify lock overlay exists
      expect(screen.getByText('🔒 Locked')).toBeDefined();

      // Verify clicking locked card does not call handler
      const lockedCard = screen.getByText('Winner of KNICKS vs HAWKS').closest('.matchup-card');
      fireEvent.click(lockedCard);
      expect(handleSelect).not.toHaveBeenCalled();
    });

    it('should display a trophy icon next to the series winner for resolved matchups', () => {
      // Setup a resolved matchup (all games watched/skipped)
      const resolvedMatchups = [
        {
          id: 'first-round-hawks-vs-knicks',
          title: 'KNICKS vs HAWKS',
          stageName: 'First Round',
          sequence: 4,
          feederAId: null,
          feederBId: null,
          contenderA: 'KNICKS',
          contenderB: 'HAWKS',
          isLocked: false,
          games: [{ id: 'k1', game_number: 1, title: 'Game 1', status: 'watched', team_a: 'KNICKS', team_b: 'HAWKS', duration: '15m', date: '2026-04-18' }]
        },
        {
          id: 'semis-76ers-vs-knicks',
          title: 'KNICKS vs 76ERS',
          stageName: 'Semifinals',
          sequence: 9,
          feederAId: 'first-round-hawks-vs-knicks',
          feederBId: 'first-round-76ers-vs-celtics',
          contenderA: 'KNICKS', // KNICKS advanced since F1 is resolved
          contenderB: 'Winner of CELTICS vs 76ERS',
          isLocked: false,
          games: []
        }
      ];

      render(<BracketView matchups={resolvedMatchups} onSelectMatchup={vi.fn()} />);
      
      // Winner of first-round-hawks-vs-knicks is KNICKS (intersection of f1 and child f1-winner contenderA)
      // Verify trophy icon is displayed next to KNICKS in the first round card
      const trophy = screen.getByTitle('Series Winner');
      expect(trophy).toBeDefined();
      expect(trophy.closest('.contender').textContent).toContain('KNICKS');
    });
  });

  describe('MatchupDetails', () => {
    const mockMatchup = mockMatchups[0];

    it('should list visible games and trigger callbacks for play and toggle progress', () => {
      const handleClose = vi.fn();
      const handlePlay = vi.fn();
      const handleToggle = vi.fn();

      render(
        <MatchupDetails 
          matchup={mockMatchup} 
          onClose={handleClose} 
          onPlayGame={handlePlay} 
          onToggleProgress={handleToggle} 
        />
      );

      // Verify titles are displayed
      expect(screen.getByText('Celtics at 76ers Game 1 Highlights')).toBeDefined();
      expect(screen.getByText('Celtics at 76ers Game 2 Highlights')).toBeDefined();

      // Test play button trigger
      const playButtons = screen.getAllByRole('button', { name: '▶' });
      fireEvent.click(playButtons[0]);
      expect(handlePlay).toHaveBeenCalledWith(mockMatchup.games[0]);

      // Test progress toggle triggers
      // Game 2 is unwatched, clicking cycles it to watched
      const game2StatusBtn = screen.getByRole('button', { name: 'Watch status: Unwatched' });
      fireEvent.click(game2StatusBtn);
      expect(handleToggle).toHaveBeenCalledWith('g2', 'watched');

      // Game 1 is watched, clicking cycles it to skipped
      const game1StatusBtn = screen.getByRole('button', { name: 'Watch status: Watched' });
      fireEvent.click(game1StatusBtn);
      expect(handleToggle).toHaveBeenCalledWith('g1', 'skipped');

      // Test close button trigger
      const closeButton = screen.getByRole('button', { name: 'Close details' });
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('TimelineView', () => {
    const mockTimelineGames = [
      { id: 'g1', game_number: 1, title: 'Celtics at 76ers Game 1', status: 'watched', matchup_id: 'full-76ers-vs-celtics', duration: '15m', date: '2026-04-19T10:00:00Z' },
      { id: 'k1', game_number: 1, title: 'Knicks at Hawks Game 1', status: 'watched', matchup_id: 'full-hawks-vs-knicks', duration: '15m', date: '2026-04-18T10:00:00Z' }
    ];

    it('should render unlocked timeline games grouped under formatted date headers', () => {
      const handlePlay = vi.fn();
      const handleToggle = vi.fn();

      render(
        <TimelineView 
          games={mockTimelineGames} 
          onPlayGame={handlePlay} 
          onToggleProgress={handleToggle} 
        />
      );

      // Verify date headers are rendered
      expect(screen.getByText(/Saturday, April 18, 2026/i)).toBeDefined();
      expect(screen.getByText(/Sunday, April 19, 2026/i)).toBeDefined();

      // Verify game titles are rendered
      expect(screen.getByText('Celtics at 76ers Game 1')).toBeDefined();
      expect(screen.getByText('Knicks at Hawks Game 1')).toBeDefined();

      // Verify matchup tags are formatted
      expect(screen.getByText('76ERS VS CELTICS')).toBeDefined();
      expect(screen.getByText('HAWKS VS KNICKS')).toBeDefined();
    });
  });

  describe('VideoPlayer', () => {
    it('should load YouTube IFrame API and trigger onVideoEnded when playback ends', () => {
      const handleEnded = vi.fn();
      const handleClose = vi.fn();

      // Mock window.YT and window.YT.Player
      let onStateChangeCallback = null;
      const playerConstructorSpy = vi.fn();
      const PlayerMock = function(element, config) {
        playerConstructorSpy(element, config);
        onStateChangeCallback = config.events.onStateChange;
        this.destroy = vi.fn();
      };

      window.YT = {
        PlayerState: { ENDED: 0 },
        Player: PlayerMock,
      };

      render(
        <VideoPlayer 
          videoId="mock-video-123" 
          onVideoEnded={handleEnded} 
          onClose={handleClose} 
        />
      );

      // Verify Player constructor was called with the div element and video info
      expect(playerConstructorSpy).toHaveBeenCalled();
      const firstCallArgs = playerConstructorSpy.mock.calls[0];
      expect(firstCallArgs[1].videoId).toBe('mock-video-123');

      // Trigger the ENDED state change
      expect(onStateChangeCallback).not.toBeNull();
      onStateChangeCallback({ data: window.YT.PlayerState.ENDED });

      // Verify the handler was called
      expect(handleEnded).toHaveBeenCalled();

      // Trigger the close button
      const closeButton = screen.getByRole('button', { name: 'Close Player' });
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
