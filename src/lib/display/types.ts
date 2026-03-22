// Types matching the display API response shapes

export interface DisplayContentItem {
  queueId: string;
  contentId: string;
  mediaUrl: string;
  mediaType: string;
  durationSeconds: number;
  position: number;
  status?: string;
  scheduledFor?: string;
}

export interface CurrentContentResponse {
  billboardId: string;
  billboardName: string;
  content: DisplayContentItem | null;
  defaultContent: string | null;
  slotDurationSecs: number;
  message?: string;
}

export interface NextContentResponse {
  billboardId: string;
  billboardName: string;
  next: DisplayContentItem | null;
  message?: string;
}

export interface PlayedResponse {
  queueId: string;
  status: string;
  proofUrl?: string | null;
  message: string;
  next?: {
    queueId: string;
    contentId: string;
    mediaUrl: string;
  } | null;
}

export interface HeartbeatResponse {
  billboardId: string;
  billboardName: string;
  status: string;
  lastHeartbeat: string;
  queue: {
    queued: number;
    playing: number;
    completed: number;
  };
  serverTime: string;
}

export type PlayerState =
  | 'initializing'
  | 'playing'
  | 'transitioning'
  | 'default_content'
  | 'error';

export type ActiveSlot = 'A' | 'B';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface DisplayConfig {
  billboardId: string;
  billboardName: string;
  slug: string;
  apiKey: string;
  displayToken?: string;
  defaultContentUrl: string | null;
  slotDurationSecs: number;
}
