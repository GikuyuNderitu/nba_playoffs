// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import BracketView from '../components/BracketView';
import MatchupView from '../components/MatchupView';
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
    it('should render canvas and trigger onSelectMatchup on node click', () => {
      const handleSelect = vi.fn();
      const { container } = render(<BracketView matchups={mockMatchups} onSelectMatchup={handleSelect} />);

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();

      // Mock getBoundingClientRect so clientX/Y coordinates map exactly
      canvas.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 1300,
        height: 680
      });

      // East Round 1 Matchup 1 is Celtics vs 76ers (Seq 1)
      // Center is at x=90, y=85. Card width is 160, height is 80.
      // Click at x=90, y=85 (inside card 1 bounds)
      fireEvent.click(canvas, {
        clientX: 90,
        clientY: 85
      });

      expect(handleSelect).toHaveBeenCalledWith(mockMatchups[0]);
    });

    it('should block selection and click actions for locked matchups', () => {
      const handleSelect = vi.fn();
      const { container } = render(<BracketView matchups={mockMatchups} onSelectMatchup={handleSelect} />);

      const canvas = container.querySelector('canvas');
      canvas.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 1300,
        height: 680
      });

      // Semifinals (Seq 9) is locked. Center is x=270, y=170.
      // Click at x=270, y=170 (inside locked card bounds)
      fireEvent.click(canvas, {
        clientX: 270,
        clientY: 170
      });

      expect(handleSelect).not.toHaveBeenCalled();
    });
  });

  describe('MatchupView', () => {
    const mockMatchup = mockMatchups[0];

    it('should list visible games, select active video on click, and trigger progress toggles', () => {
      const handleBack = vi.fn();
      const handleToggle = vi.fn();

      // Mock window.YT and window.YT.Player for VideoPlayer
      const playerConstructorSpy = vi.fn();
      window.YT = {
        PlayerState: { ENDED: 0 },
        Player: function(element, config) {
          playerConstructorSpy(element, config);
          this.destroy = vi.fn();
        },
      };

      render(
        <MatchupView 
          matchup={mockMatchup} 
          onBack={handleBack} 
          onToggleProgress={handleToggle} 
        />
      );

      // Verify titles are displayed
      expect(screen.getByText('Celtics at 76ers Game 1 Highlights')).toBeDefined();
      expect(screen.getByText('Celtics at 76ers Game 2 Highlights')).toBeDefined();

      // Game 2 is unwatched, clicking its SkipControl cycles it to watched
      const game2StatusBtn = screen.getByRole('button', { name: 'Watch status: Unwatched' });
      fireEvent.click(game2StatusBtn);
      expect(handleToggle).toHaveBeenCalledWith('g2', 'watched');

      // Test back button trigger
      const backButton = screen.getByRole('button', { name: '← Back to Bracket' });
      fireEvent.click(backButton);
      expect(handleBack).toHaveBeenCalled();
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
    });
  });
});
