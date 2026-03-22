'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { DisplayConfig } from '@/lib/display/types';
import { useDisplayStore } from '@/lib/display/use-display-store';
import {
  fetchCurrentContent,
  fetchNextContent,
  reportPlayed,
  sendHeartbeat,
} from '@/lib/display/display-api';
import { VideoCanvas } from './video-canvas';
import { StatusOverlay } from './status-overlay';
import { OfflineIndicator } from './offline-indicator';

interface DisplayPlayerProps {
  config: DisplayConfig;
  debug?: boolean;
}

export function DisplayPlayer({ config, debug = false }: DisplayPlayerProps) {
  const store = useDisplayStore();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line no-undef
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize store config on mount
  useEffect(() => {
    store.setConfig(config);
    if (debug) {
      store.setDebugVisible(true);
    }
  // eslint-disable-next-line
  }, []);

  // Request wake lock to prevent screen sleep
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        store.log('info', 'Wake lock acquired');
        wakeLockRef.current.addEventListener('release', () => {
          store.log('warn', 'Wake lock released');
        });
      } catch {
        store.log('warn', 'Wake lock request failed');
      }
    }
  // eslint-disable-next-line
  }, []);

  // Re-acquire wake lock on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
        store.log('info', 'Page became visible, resyncing');
        loadCurrentContent();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  // eslint-disable-next-line
  }, []);

  // Online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      store.setOnline(true);
      loadCurrentContent();
    };
    const handleOffline = () => {
      store.setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  // eslint-disable-next-line
  }, []);

  // Cursor auto-hide on mouse movement
  useEffect(() => {
    const handleMouseMove = () => {
      if (containerRef.current) {
        containerRef.current.style.cursor = 'default';
      }
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      cursorTimeoutRef.current = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.cursor = 'none';
        }
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
    };
  }, []);

  // Load current content from API
  const loadCurrentContent = useCallback(async () => {
    try {
      store.log('info', 'Fetching current content');
      const data = await fetchCurrentContent(config.apiKey);

      if (data.content) {
        store.setCurrentContent(data.content);
        store.setPlayerState('playing');
        store.log('info', `Playing: ${data.content.queueId} (pos ${data.content.position})`);

        // Report start
        try {
          await reportPlayed(config.apiKey, data.content.queueId, 'start');
        } catch {
          store.log('warn', 'Failed to report start');
        }

        // Preload next
        preloadNext();
      } else {
        // No content - show default
        store.setCurrentContent(null);
        store.setPlayerState('default_content');
        store.log('info', 'Queue empty, showing default content');
        startDefaultPoll();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      store.log('error', `fetchCurrent failed: ${msg}`);
      store.setPlayerState('error');
    }
  // eslint-disable-next-line
  }, [config.apiKey]);

  // Preload next content
  const preloadNext = useCallback(async () => {
    try {
      const data = await fetchNextContent(config.apiKey);
      if (data.next) {
        store.setNextContent(data.next);
        store.log('info', `Preloaded next: ${data.next.queueId}`);
      } else {
        store.setNextContent(null);
        store.log('info', 'No next content to preload');
      }
    } catch {
      store.log('warn', 'Failed to preload next content');
      store.setNextContent(null);
    }
  // eslint-disable-next-line
  }, [config.apiKey]);

  // Poll for new content when queue is empty
  const startDefaultPoll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const data = await fetchCurrentContent(config.apiKey);
        if (data.content) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          store.setCurrentContent(data.content);
          store.setPlayerState('playing');
          store.log('info', `New content detected: ${data.content.queueId}`);
          try {
            await reportPlayed(config.apiKey, data.content.queueId, 'start');
          } catch {
            store.log('warn', 'Failed to report start');
          }
          preloadNext();
        }
      } catch {
        // Silently continue polling
      }
    }, 15_000); // Poll every 15s when queue is empty
  // eslint-disable-next-line
  }, [config.apiKey]);

  // Handle video ended - transition to next
  const handleVideoEnded = useCallback(async () => {
    const { currentContent, nextContent } = useDisplayStore.getState();

    if (currentContent) {
      // Report completion
      try {
        await reportPlayed(config.apiKey, currentContent.queueId, 'complete');
        store.log('info', `Completed: ${currentContent.queueId}`);
      } catch {
        store.log('warn', 'Failed to report complete');
      }
    }

    if (nextContent) {
      // Transition to next content
      store.setPlayerState('transitioning');
      store.swapSlots();
      store.setPlayerState('playing');
      store.log('info', `Transitioned to: ${nextContent.queueId}`);

      // Report start for new content
      try {
        await reportPlayed(config.apiKey, nextContent.queueId, 'start');
      } catch {
        store.log('warn', 'Failed to report start');
      }

      // Preload the next one
      preloadNext();
    } else {
      // Queue exhausted - go to default
      store.setCurrentContent(null);
      store.setNextContent(null);
      store.setPlayerState('default_content');
      store.log('info', 'Queue exhausted, showing default');
      startDefaultPoll();
    }
  // eslint-disable-next-line
  }, [config.apiKey]);

  // Handle video load error - skip to next
  const handleVideoError = useCallback(() => {
    const { nextContent } = useDisplayStore.getState();
    store.log('error', 'Video load error, attempting skip');

    if (nextContent) {
      store.swapSlots();
      store.setPlayerState('playing');
      preloadNext();
    } else {
      store.setCurrentContent(null);
      store.setPlayerState('default_content');
      startDefaultPoll();
    }
  // eslint-disable-next-line
  }, []);

  // Heartbeat interval
  useEffect(() => {
    const doHeartbeat = async () => {
      try {
        const hb = await sendHeartbeat(config.apiKey, 'online');
        store.setLastHeartbeat(hb);
      } catch {
        store.log('warn', 'Heartbeat failed');
      }
    };

    // Initial heartbeat
    doHeartbeat();

    heartbeatRef.current = setInterval(doHeartbeat, 30_000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  // eslint-disable-next-line
  }, [config.apiKey]);

  // Main initialization
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    requestWakeLock();
    loadCurrentContent();
  // eslint-disable-next-line
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  // Handle tap for fullscreen + triple-tap for debug
  const handleTap = useCallback(() => {
    // Request fullscreen on first tap
    if (containerRef.current && !document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {
        store.log('warn', 'Fullscreen request denied');
      });
    }

    // Triple-tap toggles debug
    tapCountRef.current += 1;
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 500);

    if (tapCountRef.current >= 3) {
      store.toggleDebug();
      tapCountRef.current = 0;
    }
  // eslint-disable-next-line
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black"
      onClick={handleTap}
    >
      <VideoCanvas
        config={config}
        onVideoEnded={handleVideoEnded}
        onVideoError={handleVideoError}
      />
      <OfflineIndicator />
      <StatusOverlay />
    </div>
  );
}
