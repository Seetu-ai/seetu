/**
 * Billboard Queue for Background Processing
 * Uses BullMQ with Redis for job management
 *
 * Handles:
 * - Content validation (FFprobe)
 * - Content moderation (Gemini)
 * - Content transcoding (FFmpeg)
 */

import { Queue, QueueEvents } from 'bullmq';
import { redis, isRedisConfigured } from '../redis';

// Queue names (no colons - BullMQ restriction)
export const BILLBOARD_QUEUES = {
  VALIDATION: 'seetu-billboard-validation',
  MODERATION: 'seetu-billboard-moderation',
  TRANSCODING: 'seetu-billboard-transcoding',
  BATCH_PROCESSING: 'seetu-billboard-batch',
} as const;

// Job types
export type BillboardJobType = 'validation' | 'moderation' | 'transcoding';

export interface ValidationJobData {
  contentId: string;
  originalUrl: string;
  userId?: string;
  whatsappPhone?: string;
}

export interface ModerationJobData {
  contentId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
}

export interface TranscodingJobData {
  contentId: string;
  originalUrl: string;
  mediaType: 'image' | 'video';
  targetWidth: number;
  targetHeight: number;
  addOverlay?: boolean;
  overlayPath?: string;
}

export interface BatchProcessingJobData {
  phone: string;
}

// In-memory fallback queues for development
const memoryQueues: Record<string, unknown[]> = {
  [BILLBOARD_QUEUES.VALIDATION]: [],
  [BILLBOARD_QUEUES.MODERATION]: [],
  [BILLBOARD_QUEUES.TRANSCODING]: [],
  [BILLBOARD_QUEUES.BATCH_PROCESSING]: [],
};

const memoryProcessors: Record<string, ((job: unknown) => Promise<void>)[]> = {
  [BILLBOARD_QUEUES.VALIDATION]: [],
  [BILLBOARD_QUEUES.MODERATION]: [],
  [BILLBOARD_QUEUES.TRANSCODING]: [],
  [BILLBOARD_QUEUES.BATCH_PROCESSING]: [],
};

// BullMQ queue instances (only if Redis is configured)
let validationQueue: Queue<ValidationJobData> | null = null;
let moderationQueue: Queue<ModerationJobData> | null = null;
let transcodingQueue: Queue<TranscodingJobData> | null = null;
let batchProcessingQueue: Queue<BatchProcessingJobData> | null = null;
let queueEvents: Record<string, QueueEvents> = {};

// In-memory batch timers (fallback for development without Redis)
const memoryBatchTimers: Map<string, NodeJS.Timeout> = new Map();

// Initialize queues if Redis is configured
if (isRedisConfigured() && redis) {
  const defaultJobOptions = {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
  };

  validationQueue = new Queue<ValidationJobData>(BILLBOARD_QUEUES.VALIDATION, {
    connection: redis,
    defaultJobOptions,
  });

  moderationQueue = new Queue<ModerationJobData>(BILLBOARD_QUEUES.MODERATION, {
    connection: redis,
    defaultJobOptions,
  });

  transcodingQueue = new Queue<TranscodingJobData>(BILLBOARD_QUEUES.TRANSCODING, {
    connection: redis,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 2, // Transcoding is expensive, fewer retries
    },
  });

  batchProcessingQueue = new Queue<BatchProcessingJobData>(BILLBOARD_QUEUES.BATCH_PROCESSING, {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true,
    },
  });

  // Create queue events for monitoring
  queueEvents = {
    [BILLBOARD_QUEUES.VALIDATION]: new QueueEvents(BILLBOARD_QUEUES.VALIDATION, { connection: redis }),
    [BILLBOARD_QUEUES.MODERATION]: new QueueEvents(BILLBOARD_QUEUES.MODERATION, { connection: redis }),
    [BILLBOARD_QUEUES.TRANSCODING]: new QueueEvents(BILLBOARD_QUEUES.TRANSCODING, { connection: redis }),
    [BILLBOARD_QUEUES.BATCH_PROCESSING]: new QueueEvents(BILLBOARD_QUEUES.BATCH_PROCESSING, { connection: redis }),
  };
}

/**
 * Enqueue a validation job
 */
export async function enqueueValidation(data: ValidationJobData): Promise<string> {
  if (validationQueue) {
    const job = await validationQueue.add('validate', data, {
      jobId: `validate-${data.contentId}`,
    });
    console.log(`[BILLBOARD_QUEUE] Enqueued validation for ${data.contentId}`);
    return job.id || data.contentId;
  }

  // In-memory fallback
  memoryQueues[BILLBOARD_QUEUES.VALIDATION].push(data);
  processMemoryQueue(BILLBOARD_QUEUES.VALIDATION);
  return data.contentId;
}

/**
 * Enqueue a moderation job
 */
export async function enqueueModeration(data: ModerationJobData): Promise<string> {
  if (moderationQueue) {
    const job = await moderationQueue.add('moderate', data, {
      jobId: `moderate-${data.contentId}`,
    });
    console.log(`[BILLBOARD_QUEUE] Enqueued moderation for ${data.contentId}`);
    return job.id || data.contentId;
  }

  // In-memory fallback
  memoryQueues[BILLBOARD_QUEUES.MODERATION].push(data);
  processMemoryQueue(BILLBOARD_QUEUES.MODERATION);
  return data.contentId;
}

/**
 * Enqueue a transcoding job
 */
export async function enqueueTranscoding(data: TranscodingJobData): Promise<string> {
  if (transcodingQueue) {
    const job = await transcodingQueue.add('transcode', data, {
      jobId: `transcode-${data.contentId}`,
    });
    console.log(`[BILLBOARD_QUEUE] Enqueued transcoding for ${data.contentId}`);
    return job.id || data.contentId;
  }

  // In-memory fallback
  memoryQueues[BILLBOARD_QUEUES.TRANSCODING].push(data);
  processMemoryQueue(BILLBOARD_QUEUES.TRANSCODING);
  return data.contentId;
}

/**
 * Schedule batch processing for a phone number
 * Uses debounce: if a job already exists for this phone, it's removed and a new one is created
 * This ensures we wait for the full batch window before processing
 */
export async function scheduleBatchProcessing(
  phone: string,
  delayMs: number = 3000
): Promise<void> {
  const jobId = `batch-${phone}`;

  if (batchProcessingQueue) {
    // Remove existing job for this phone (reset the timer)
    try {
      const existingJob = await batchProcessingQueue.getJob(jobId);
      if (existingJob) {
        await existingJob.remove();
        console.log(`[BILLBOARD_QUEUE] Reset batch timer for ${phone}`);
      }
    } catch {
      // Job might not exist, that's fine
    }

    // Create new delayed job
    await batchProcessingQueue.add('process-batch', { phone }, {
      delay: delayMs,
      jobId,
    });
    console.log(`[BILLBOARD_QUEUE] Scheduled batch processing for ${phone} in ${delayMs}ms`);
  } else {
    // In-memory fallback for development
    // Clear existing timer if any
    const existingTimer = memoryBatchTimers.get(phone);
    if (existingTimer) {
      clearTimeout(existingTimer);
      console.log(`[BILLBOARD_QUEUE] Reset in-memory batch timer for ${phone}`);
    }

    // Set new timer
    const timer = setTimeout(() => {
      memoryBatchTimers.delete(phone);
      // Process the batch via memory queue
      memoryQueues[BILLBOARD_QUEUES.BATCH_PROCESSING].push({ phone });
      processMemoryQueue(BILLBOARD_QUEUES.BATCH_PROCESSING);
    }, delayMs);

    memoryBatchTimers.set(phone, timer);
    console.log(`[BILLBOARD_QUEUE] Scheduled in-memory batch for ${phone} in ${delayMs}ms`);
  }
}

/**
 * Cancel pending batch processing for a phone number
 */
export async function cancelBatchProcessing(phone: string): Promise<void> {
  const jobId = `batch-${phone}`;

  if (batchProcessingQueue) {
    try {
      const existingJob = await batchProcessingQueue.getJob(jobId);
      if (existingJob) {
        await existingJob.remove();
        console.log(`[BILLBOARD_QUEUE] Cancelled batch processing for ${phone}`);
      }
    } catch {
      // Job might not exist
    }
  } else {
    // In-memory fallback
    const existingTimer = memoryBatchTimers.get(phone);
    if (existingTimer) {
      clearTimeout(existingTimer);
      memoryBatchTimers.delete(phone);
      console.log(`[BILLBOARD_QUEUE] Cancelled in-memory batch for ${phone}`);
    }
  }
}

/**
 * Process memory queue items (for development)
 */
function processMemoryQueue(queueName: string): void {
  const processors = memoryProcessors[queueName];
  const queue = memoryQueues[queueName];

  if (processors.length > 0 && queue.length > 0) {
    setTimeout(async () => {
      const job = queue.shift();
      if (job) {
        try {
          await processors[0](job);
        } catch (error) {
          console.error(`[BILLBOARD_QUEUE] Memory processor error:`, error);
        }
      }
    }, 100);
  }
}

/**
 * Register memory processors for development
 */
export function registerMemoryProcessor(
  queueName: string,
  callback: (job: unknown) => Promise<void>
): void {
  if (!memoryProcessors[queueName]) {
    memoryProcessors[queueName] = [];
  }
  memoryProcessors[queueName].push(callback);
}

/**
 * Get queue instances
 */
export function getValidationQueue(): Queue<ValidationJobData> | null {
  return validationQueue;
}

export function getModerationQueue(): Queue<ModerationJobData> | null {
  return moderationQueue;
}

export function getTranscodingQueue(): Queue<TranscodingJobData> | null {
  return transcodingQueue;
}

export function getBatchProcessingQueue(): Queue<BatchProcessingJobData> | null {
  return batchProcessingQueue;
}

/**
 * Get queue statistics for all billboard queues
 */
export async function getBillboardQueueStats(): Promise<{
  validation: { waiting: number; active: number; completed: number; failed: number };
  moderation: { waiting: number; active: number; completed: number; failed: number };
  transcoding: { waiting: number; active: number; completed: number; failed: number };
  batchProcessing: { waiting: number; active: number; completed: number; failed: number };
}> {
  const getStats = async (queue: Queue | null, memoryQueue: unknown[]) => {
    if (queue) {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);
      return { waiting, active, completed, failed };
    }
    return {
      waiting: memoryQueue.length,
      active: 0,
      completed: 0,
      failed: 0,
    };
  };

  const [validation, moderation, transcoding, batchProcessing] = await Promise.all([
    getStats(validationQueue, memoryQueues[BILLBOARD_QUEUES.VALIDATION]),
    getStats(moderationQueue, memoryQueues[BILLBOARD_QUEUES.MODERATION]),
    getStats(transcodingQueue, memoryQueues[BILLBOARD_QUEUES.TRANSCODING]),
    getStats(batchProcessingQueue, memoryQueues[BILLBOARD_QUEUES.BATCH_PROCESSING]),
  ]);

  return { validation, moderation, transcoding, batchProcessing };
}

/**
 * Clear all billboard queues (for testing/maintenance)
 */
export async function clearAllQueues(): Promise<void> {
  if (validationQueue) await validationQueue.obliterate({ force: true });
  if (moderationQueue) await moderationQueue.obliterate({ force: true });
  if (transcodingQueue) await transcodingQueue.obliterate({ force: true });
  if (batchProcessingQueue) await batchProcessingQueue.obliterate({ force: true });

  // Clear memory queues
  memoryQueues[BILLBOARD_QUEUES.VALIDATION] = [];
  memoryQueues[BILLBOARD_QUEUES.MODERATION] = [];
  memoryQueues[BILLBOARD_QUEUES.TRANSCODING] = [];
  memoryQueues[BILLBOARD_QUEUES.BATCH_PROCESSING] = [];

  // Clear memory batch timers
  for (const timer of memoryBatchTimers.values()) {
    clearTimeout(timer);
  }
  memoryBatchTimers.clear();
}

/**
 * Pause all queues
 */
export async function pauseAllQueues(): Promise<void> {
  if (validationQueue) await validationQueue.pause();
  if (moderationQueue) await moderationQueue.pause();
  if (transcodingQueue) await transcodingQueue.pause();
  if (batchProcessingQueue) await batchProcessingQueue.pause();
}

/**
 * Resume all queues
 */
export async function resumeAllQueues(): Promise<void> {
  if (validationQueue) await validationQueue.resume();
  if (moderationQueue) await moderationQueue.resume();
  if (transcodingQueue) await transcodingQueue.resume();
  if (batchProcessingQueue) await batchProcessingQueue.resume();
}
