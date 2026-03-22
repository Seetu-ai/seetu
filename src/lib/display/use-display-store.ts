import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  PlayerState,
  ActiveSlot,
  DisplayContentItem,
  LogEntry,
  DisplayConfig,
  HeartbeatResponse,
} from './types';

const MAX_LOG_ENTRIES = 50;

interface DisplayStoreState {
  // Config (set once on init)
  config: DisplayConfig | null;

  // Playback state machine
  playerState: PlayerState;
  activeSlot: ActiveSlot;
  currentContent: DisplayContentItem | null;
  nextContent: DisplayContentItem | null;

  // Preload readiness
  slotAReady: boolean;
  slotBReady: boolean;

  // Network / heartbeat
  isOnline: boolean;
  lastHeartbeat: HeartbeatResponse | null;

  // Debug
  debugVisible: boolean;
  logs: LogEntry[];
}

interface DisplayStoreActions {
  // Init
  setConfig: (config: DisplayConfig) => void;

  // State transitions
  setPlayerState: (state: PlayerState) => void;
  setCurrentContent: (content: DisplayContentItem | null) => void;
  setNextContent: (content: DisplayContentItem | null) => void;

  // Slot management
  swapSlots: () => void;
  setSlotReady: (slot: ActiveSlot, ready: boolean) => void;

  // Network
  setOnline: (online: boolean) => void;
  setLastHeartbeat: (hb: HeartbeatResponse) => void;

  // Debug
  toggleDebug: () => void;
  setDebugVisible: (visible: boolean) => void;
  log: (level: LogEntry['level'], message: string) => void;
}

export type DisplayStore = DisplayStoreState & DisplayStoreActions;

export const useDisplayStore = create<DisplayStore>()(
  devtools(
    (set) => ({
      // Initial state
      config: null,
      playerState: 'initializing',
      activeSlot: 'A',
      currentContent: null,
      nextContent: null,
      slotAReady: false,
      slotBReady: false,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastHeartbeat: null,
      debugVisible: false,
      logs: [],

      // Actions
      setConfig: (config) => set({ config }),

      setPlayerState: (playerState) =>
        set((state) => {
          const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `State: ${state.playerState} → ${playerState}`,
          };
          return {
            playerState,
            logs: [...state.logs, entry].slice(-MAX_LOG_ENTRIES),
          };
        }),

      setCurrentContent: (currentContent) => set({ currentContent }),
      setNextContent: (nextContent) => set({ nextContent }),

      swapSlots: () =>
        set((state) => {
          const newActiveSlot: ActiveSlot = state.activeSlot === 'A' ? 'B' : 'A';
          return {
            activeSlot: newActiveSlot,
            currentContent: state.nextContent,
            nextContent: null,
            slotAReady: newActiveSlot === 'A' ? state.slotBReady : false,
            slotBReady: newActiveSlot === 'B' ? state.slotAReady : false,
          };
        }),

      setSlotReady: (slot, ready) =>
        set(slot === 'A' ? { slotAReady: ready } : { slotBReady: ready }),

      setOnline: (isOnline) =>
        set((state) => {
          const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: isOnline ? 'info' : 'warn',
            message: isOnline ? 'Network: online' : 'Network: offline',
          };
          return {
            isOnline,
            logs: [...state.logs, entry].slice(-MAX_LOG_ENTRIES),
          };
        }),

      setLastHeartbeat: (lastHeartbeat) => set({ lastHeartbeat }),

      toggleDebug: () => set((state) => ({ debugVisible: !state.debugVisible })),
      setDebugVisible: (debugVisible) => set({ debugVisible }),

      log: (level, message) =>
        set((state) => ({
          logs: [
            ...state.logs,
            { timestamp: new Date().toISOString(), level, message },
          ].slice(-MAX_LOG_ENTRIES),
        })),
    }),
    { name: 'DisplayStore' }
  )
);
