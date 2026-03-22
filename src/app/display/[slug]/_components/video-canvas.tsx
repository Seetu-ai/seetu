'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { DisplayConfig, DisplayContentItem } from '@/lib/display/types';
import { useDisplayStore } from '@/lib/display/use-display-store';

interface VideoCanvasProps {
  config: DisplayConfig;
  onVideoEnded: () => void;
  onVideoError: () => void;
}

function isImageContent(content: DisplayContentItem | null): boolean {
  if (!content) return false;
  if (content.mediaType === 'image') return true;
  // Also detect by URL extension as fallback
  const url = content.mediaUrl?.toLowerCase() || '';
  return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.webp');
}

export function VideoCanvas({
  config,
  onVideoEnded,
  onVideoError,
}: VideoCanvasProps) {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const imageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSlot = useDisplayStore((s) => s.activeSlot);
  const currentContent = useDisplayStore((s) => s.currentContent);
  const nextContent = useDisplayStore((s) => s.nextContent);
  const playerState = useDisplayStore((s) => s.playerState);
  const setSlotReady = useDisplayStore((s) => s.setSlotReady);
  const log = useDisplayStore((s) => s.log);

  const isDefaultContent =
    playerState === 'default_content' || playerState === 'initializing';
  const defaultUrl = config.defaultContentUrl;

  const currentIsImage = isImageContent(currentContent);
  const nextIsImage = isImageContent(nextContent);

  // Determine which video ref goes to which slot
  const activeVideo = activeSlot === 'A' ? videoARef : videoBRef;
  const inactiveVideo = activeSlot === 'A' ? videoBRef : videoARef;

  // Clear image timer on unmount or content change
  useEffect(() => {
    return () => {
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
        imageTimerRef.current = null;
      }
    };
  }, []);

  // Load current VIDEO content into active slot
  useEffect(() => {
    // Skip if current content is an image - handled by the <img> element
    if (currentIsImage) return;

    const video = activeVideo.current;
    if (!video) return;

    if (isDefaultContent && defaultUrl) {
      if (video.src !== defaultUrl) {
        video.src = defaultUrl;
        video.loop = true;
        video.load();
        video.play().catch(() => {
          log('warn', 'Default content autoplay blocked');
        });
      }
      return;
    }

    if (currentContent?.mediaUrl) {
      if (video.src && video.src !== currentContent.mediaUrl) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      video.src = currentContent.mediaUrl;
      video.loop = false;
      video.load();
      video.play().catch(() => {
        log('warn', 'Video autoplay blocked');
      });
    }
  // eslint-disable-next-line
  }, [currentContent?.mediaUrl, currentIsImage, playerState]);

  // Image timer: when current content is an image, fire onVideoEnded after durationSeconds
  useEffect(() => {
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }

    if (!currentIsImage || !currentContent || isDefaultContent) return;

    const duration = (currentContent.durationSeconds || config.slotDurationSecs) * 1000;
    log('info', `Image displayed, timer set for ${duration / 1000}s`);

    imageTimerRef.current = setTimeout(() => {
      log('info', 'Image display timer ended');
      onVideoEnded();
    }, duration);

    return () => {
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
        imageTimerRef.current = null;
      }
    };
  // eslint-disable-next-line
  }, [currentContent?.queueId, currentIsImage, isDefaultContent]);

  // Preload next VIDEO content into inactive slot
  useEffect(() => {
    // If next content is an image, mark as ready immediately (no preloading needed)
    if (nextIsImage && nextContent) {
      const slot = activeSlot === 'A' ? 'B' : 'A';
      setSlotReady(slot, true);
      log('info', `Slot ${slot} ready (image, no preload needed)`);
      return;
    }

    const video = inactiveVideo.current;
    if (!video) return;

    if (nextContent?.mediaUrl) {
      if (video.src !== nextContent.mediaUrl) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.src = nextContent.mediaUrl;
        video.loop = false;
        video.load();
      }
    } else {
      video.pause();
      video.removeAttribute('src');
      video.load();
      setSlotReady(activeSlot === 'A' ? 'B' : 'A', false);
    }
  // eslint-disable-next-line
  }, [nextContent?.mediaUrl, nextIsImage]);

  // Handle video ended on active slot
  const handleEnded = useCallback(() => {
    if (!isDefaultContent) {
      onVideoEnded();
    }
  }, [isDefaultContent, onVideoEnded]);

  // Handle video error
  const handleError = useCallback(() => {
    log('error', 'Video element error');
    onVideoError();
  // eslint-disable-next-line
  }, [onVideoError]);

  // Handle inactive video can play (preload ready)
  const handleCanPlayInactive = useCallback(() => {
    const slot = activeSlot === 'A' ? 'B' : 'A';
    setSlotReady(slot, true);
    log('info', `Slot ${slot} preloaded and ready`);
  // eslint-disable-next-line
  }, [activeSlot]);

  const sharedVideoProps = {
    muted: true,
    playsInline: true,
    preload: 'auto' as const,
    crossOrigin: 'anonymous' as const,
    className:
      'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
  };

  const sharedImageClass =
    'absolute inset-0 w-full h-full object-cover transition-opacity duration-500';

  // Determine what to show for each slot
  const slotAContent = activeSlot === 'A' ? currentContent : nextContent;
  const slotBContent = activeSlot === 'B' ? currentContent : nextContent;
  const slotAIsImage = isImageContent(slotAContent);
  const slotBIsImage = isImageContent(slotBContent);

  return (
    <div className="absolute inset-0">
      {/* Slot A */}
      {slotAIsImage && slotAContent?.mediaUrl ? (
        <img
          src={slotAContent.mediaUrl}
          alt=""
          className={sharedImageClass}
          style={{ opacity: activeSlot === 'A' ? 1 : 0, zIndex: activeSlot === 'A' ? 1 : 0 }}
        />
      ) : (
        <video
          ref={videoARef}
          {...sharedVideoProps}
          style={{ opacity: activeSlot === 'A' ? 1 : 0, zIndex: activeSlot === 'A' ? 1 : 0 }}
          onEnded={activeSlot === 'A' ? handleEnded : undefined}
          onError={activeSlot === 'A' ? handleError : undefined}
          onCanPlay={activeSlot !== 'A' ? handleCanPlayInactive : undefined}
        />
      )}

      {/* Slot B */}
      {slotBIsImage && slotBContent?.mediaUrl ? (
        <img
          src={slotBContent.mediaUrl}
          alt=""
          className={sharedImageClass}
          style={{ opacity: activeSlot === 'B' ? 1 : 0, zIndex: activeSlot === 'B' ? 1 : 0 }}
        />
      ) : (
        <video
          ref={videoBRef}
          {...sharedVideoProps}
          style={{ opacity: activeSlot === 'B' ? 1 : 0, zIndex: activeSlot === 'B' ? 1 : 0 }}
          onEnded={activeSlot === 'B' ? handleEnded : undefined}
          onError={activeSlot === 'B' ? handleError : undefined}
          onCanPlay={activeSlot !== 'B' ? handleCanPlayInactive : undefined}
        />
      )}

      {/* Fallback: if no content and no default, show black with billboard name */}
      {!currentContent && !defaultUrl && playerState !== 'playing' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <p className="text-white/30 text-2xl font-light">
            {config.billboardName}
          </p>
        </div>
      )}
    </div>
  );
}
