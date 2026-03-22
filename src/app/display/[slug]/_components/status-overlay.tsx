'use client';

import { useDisplayStore } from '@/lib/display/use-display-store';

export function StatusOverlay() {
  const debugVisible = useDisplayStore((s) => s.debugVisible);
  const config = useDisplayStore((s) => s.config);
  const playerState = useDisplayStore((s) => s.playerState);
  const activeSlot = useDisplayStore((s) => s.activeSlot);
  const currentContent = useDisplayStore((s) => s.currentContent);
  const nextContent = useDisplayStore((s) => s.nextContent);
  const isOnline = useDisplayStore((s) => s.isOnline);
  const lastHeartbeat = useDisplayStore((s) => s.lastHeartbeat);
  const logs = useDisplayStore((s) => s.logs);

  if (!debugVisible) return null;

  const recentLogs = logs.slice(-10);

  return (
    <div
      className="absolute top-4 left-4 right-4 z-50 bg-black/85 text-white text-xs font-mono p-4 rounded-lg max-h-[80vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-sm font-bold mb-3 text-green-400">
        Debug Panel
      </h3>

      {/* Billboard info */}
      <section className="mb-3">
        <h4 className="text-yellow-400 mb-1">Billboard</h4>
        <p>Name: {config?.billboardName ?? '—'}</p>
        <p>Slug: {config?.slug ?? '—'}</p>
        <p>Slot Duration: {config?.slotDurationSecs ?? '—'}s</p>
      </section>

      {/* Player state */}
      <section className="mb-3">
        <h4 className="text-yellow-400 mb-1">Player</h4>
        <p>
          State:{' '}
          <span
            className={
              playerState === 'playing'
                ? 'text-green-400'
                : playerState === 'error'
                  ? 'text-red-400'
                  : 'text-yellow-300'
            }
          >
            {playerState}
          </span>
        </p>
        <p>Active Slot: {activeSlot}</p>
      </section>

      {/* Content */}
      <section className="mb-3">
        <h4 className="text-yellow-400 mb-1">Content</h4>
        <p>
          Current:{' '}
          {currentContent
            ? `${currentContent.queueId.slice(0, 8)}... (pos ${currentContent.position})`
            : 'none'}
        </p>
        <p>
          Next:{' '}
          {nextContent
            ? `${nextContent.queueId.slice(0, 8)}... (pos ${nextContent.position})`
            : 'none'}
        </p>
        {currentContent && (
          <p className="text-white/50 break-all">
            URL: {currentContent.mediaUrl}
          </p>
        )}
      </section>

      {/* Network */}
      <section className="mb-3">
        <h4 className="text-yellow-400 mb-1">Network</h4>
        <p>
          Status:{' '}
          <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
            {isOnline ? 'online' : 'offline'}
          </span>
        </p>
        {lastHeartbeat && (
          <>
            <p>
              Last Heartbeat:{' '}
              {new Date(lastHeartbeat.lastHeartbeat).toLocaleTimeString()}
            </p>
            <p>
              Queue: {lastHeartbeat.queue.queued} queued /{' '}
              {lastHeartbeat.queue.playing} playing /{' '}
              {lastHeartbeat.queue.completed} completed
            </p>
          </>
        )}
      </section>

      {/* Logs */}
      <section>
        <h4 className="text-yellow-400 mb-1">
          Logs ({logs.length})
        </h4>
        <div className="space-y-0.5">
          {recentLogs.map((entry, i) => (
            <p
              key={i}
              className={
                entry.level === 'error'
                  ? 'text-red-400'
                  : entry.level === 'warn'
                    ? 'text-yellow-300'
                    : 'text-white/70'
              }
            >
              <span className="text-white/40">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>{' '}
              [{entry.level}] {entry.message}
            </p>
          ))}
          {recentLogs.length === 0 && (
            <p className="text-white/30">No logs yet</p>
          )}
        </div>
      </section>
    </div>
  );
}
