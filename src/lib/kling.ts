/**
 * Kling AI Video Generation Integration
 * Uses AIML API to access Kling v1.6 Pro Image-to-Video
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface KlingGenerationParams {
  imageUrl: string;
  prompt?: string;
  duration: 5 | 10;  // seconds
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface KlingTaskResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

interface AIMLAPIStartResponse {
  id: string;
  status: string;
}

interface AIMLAPIStatusResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  video?: {
    url: string;
  };
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const AIML_API_URL = 'https://api.aimlapi.com';
const KLING_MODEL = 'kling-video/v1.6/pro/image-to-video';

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

class KlingClient {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.AIMLAPI_KEY;
    if (!apiKey) {
      throw new Error('AIMLAPI_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
  }

  /**
   * Start a video generation task
   */
  async startGeneration(params: KlingGenerationParams): Promise<KlingTaskResponse> {
    try {
      const response = await fetch(`${AIML_API_URL}/v2/generate/video/kling/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: KLING_MODEL,
          image_url: params.imageUrl,
          prompt: params.prompt || 'Subtle natural motion, product showcase, smooth camera movement',
          duration: String(params.duration),
          aspect_ratio: params.aspectRatio || '1:1',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[KLING] API Error:', response.status, errorText);
        throw new Error(`Kling API error: ${response.status}`);
      }

      const data: AIMLAPIStartResponse = await response.json();

      return {
        taskId: data.id,
        status: 'pending',
      };
    } catch (error) {
      console.error('[KLING] Start generation error:', error);
      throw error;
    }
  }

  /**
   * Check the status of a video generation task
   */
  async checkStatus(taskId: string): Promise<KlingTaskResponse> {
    try {
      const response = await fetch(`${AIML_API_URL}/v2/generate/video/kling/generation/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[KLING] Status check error:', response.status, errorText);
        throw new Error(`Kling API error: ${response.status}`);
      }

      const data: AIMLAPIStatusResponse = await response.json();

      // Map AIML status to our status
      let status: KlingTaskResponse['status'] = 'pending';
      if (data.status === 'processing') status = 'processing';
      else if (data.status === 'completed') status = 'completed';
      else if (data.status === 'failed') status = 'failed';

      return {
        taskId: data.id,
        status,
        videoUrl: data.video?.url,
        error: data.error,
      };
    } catch (error) {
      console.error('[KLING] Status check error:', error);
      throw error;
    }
  }

  /**
   * Poll for task completion with timeout
   */
  async waitForCompletion(
    taskId: string,
    options: {
      maxWaitMs?: number;
      pollIntervalMs?: number;
    } = {}
  ): Promise<KlingTaskResponse> {
    const { maxWaitMs = 300000, pollIntervalMs = 5000 } = options;  // 5min max, 5s intervals
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.checkStatus(taskId);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return {
      taskId,
      status: 'failed',
      error: 'Timeout waiting for video generation',
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

let klingClient: KlingClient | null = null;

export function getKlingClient(): KlingClient {
  if (!klingClient) {
    klingClient = new KlingClient();
  }
  return klingClient;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a video from an image
 * This is the main entry point for video generation
 */
export async function generateVideo(params: KlingGenerationParams): Promise<KlingTaskResponse> {
  const client = getKlingClient();
  return client.startGeneration(params);
}

/**
 * Check video generation status
 */
export async function checkVideoStatus(taskId: string): Promise<KlingTaskResponse> {
  const client = getKlingClient();
  return client.checkStatus(taskId);
}

/**
 * Wait for video generation to complete
 */
export async function waitForVideo(
  taskId: string,
  options?: { maxWaitMs?: number; pollIntervalMs?: number }
): Promise<KlingTaskResponse> {
  const client = getKlingClient();
  return client.waitForCompletion(taskId, options);
}

/**
 * Build a product showcase prompt for video generation
 */
export function buildVideoPrompt(productDescription?: string): string {
  const basePrompts = [
    'Subtle elegant motion',
    'Professional product showcase',
    'Smooth camera orbit',
    'Gentle lighting movement',
    'Premium commercial quality',
  ];

  if (productDescription) {
    return `${productDescription}. ${basePrompts.join(', ')}`;
  }

  return basePrompts.join(', ');
}

/**
 * Check if Kling API is configured
 */
export function isKlingConfigured(): boolean {
  return !!process.env.AIMLAPI_KEY;
}
