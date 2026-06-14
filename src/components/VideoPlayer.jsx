import React, { useEffect, useRef } from 'react';

/**
 * VideoPlayer Component that embeds the YouTube IFrame Player
 * inline and notifies parent when the playback completes (ENDED).
 */
export default function VideoPlayer({ videoId, onVideoEnded }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    const initializeYTPlayer = () => {
      if (!isMounted || !window.YT || !window.YT.Player) return;

      // Clean up previous player reference if it exists
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (err) {
          console.warn('[VideoPlayer] Error destroying player:', err);
        }
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onStateChange: (event) => {
            // window.YT.PlayerState.ENDED is 0
            if (event.data === window.YT.PlayerState.ENDED) {
              if (onVideoEnded) {
                onVideoEnded();
              }
            }
          }
        }
      });
    };

    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (isFullscreen) {
        // Attempt to lock screen orientation to landscape when entering fullscreen
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          screen.orientation.lock('landscape').catch((err) => {
            console.log('[VideoPlayer] Screen orientation lock failed/unsupported:', err);
          });
        }
      } else {
        // Unlock screen orientation when exiting fullscreen
        if (screen.orientation && typeof screen.orientation.unlock === 'function') {
          try {
            screen.orientation.unlock();
          } catch (err) {
            // ignore
          }
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    if (window.YT && window.YT.Player) {
      initializeYTPlayer();
    } else {
      // Inject YouTube IFrame API script if not present
      if (!document.getElementById('youtube-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      }

      // Check periodically for availability of global YT object
      intervalId = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(intervalId);
          initializeYTPlayer();
        }
      }, 100);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (err) {
          // ignore destroy errors on unmount
        }
      }
    };
  }, [videoId]);

  return (
    <div className="relative w-full aspect-video bg-black [&>div]:absolute [&>div]:top-0 [&>div]:left-0 [&>div]:w-full [&>div]:h-full [&>iframe]:absolute [&>iframe]:top-0 [&>iframe]:left-0 [&>iframe]:w-full [&>iframe]:h-full border-0">
      <div ref={containerRef}></div>
    </div>
  );
}
