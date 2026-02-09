/**
 * Kling AI Video Generation Integration
 * Uses the official Kling API with JWT authentication (Access Key + Secret Key)
 * Docs: https://app.klingai.com/global/dev/document-api
 */

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface KlingGenerationParams {
  imageUrl: string;
  prompt?: string;
  duration: 5 | 10;  // seconds
  mode?: 'std' | 'pro';  // std = standard, pro = higher quality
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface KlingTaskResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

interface KlingAPIResponse {
  code: number;
  message: string;
  request_id: string;
  data?: {
    task_id: string;
    task_status: string;
    task_status_msg?: string;
    task_result?: {
      videos?: Array<{
        id: string;
        url: string;
        duration: string;
      }>;
    };
    created_at?: number;
    updated_at?: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const KLING_API_BASE = 'https://api.klingai.com';
const JWT_EXPIRY_SECONDS = 1800; // 30 minutes

// ═══════════════════════════════════════════════════════════════
// JWT TOKEN GENERATION
// ═══════════════════════════════════════════════════════════════

function base64UrlEncode(data: Buffer): string {
  return data.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateJWT(accessKey: string, secretKey: string): string {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload = {
    iss: accessKey,
    exp: now + JWT_EXPIRY_SECONDS,
    nbf: now - 5,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload)));

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(signingInput)
    .digest();

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

class KlingClient {
  private accessKey: string;
  private secretKey: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;
    if (!accessKey || !secretKey) {
      throw new Error('KLING_ACCESS_KEY and KLING_SECRET_KEY environment variables are required');
    }
    this.accessKey = accessKey;
    this.secretKey = secretKey;
  }

  private getToken(): string {
    const now = Math.floor(Date.now() / 1000);
    // Refresh token 60 seconds before expiry
    if (this.cachedToken && this.tokenExpiresAt > now + 60) {
      return this.cachedToken;
    }
    this.cachedToken = generateJWT(this.accessKey, this.secretKey);
    this.tokenExpiresAt = now + JWT_EXPIRY_SECONDS;
    return this.cachedToken;
  }

  /**
   * Start a video generation task (image-to-video)
   */
  async startGeneration(params: KlingGenerationParams): Promise<KlingTaskResponse> {
    const token = this.getToken();

    try {
      const response = await fetch(`${KLING_API_BASE}/v1/videos/image2video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_name: 'kling-v1-6',
          image: params.imageUrl,
          prompt: params.prompt || 'Subtle natural motion, product showcase, smooth camera movement',
          mode: params.mode || 'std',
          duration: String(params.duration),
          cfg_scale: 0.5,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[KLING] API Error:', response.status, errorText);
        throw new Error(`Kling API error: ${response.status} - ${errorText}`);
      }

      const data: KlingAPIResponse = await response.json();

      if (data.code !== 0 || !data.data?.task_id) {
        console.error('[KLING] API returned error:', data);
        throw new Error(`Kling API error: ${data.message || 'Unknown error'}`);
      }

      return {
        taskId: data.data.task_id,
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
    const token = this.getToken();

    try {
      const response = await fetch(`${KLING_API_BASE}/v1/videos/image2video/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[KLING] Status check error:', response.status, errorText);
        throw new Error(`Kling API error: ${response.status}`);
      }

      const data: KlingAPIResponse = await response.json();

      if (data.code !== 0) {
        console.error('[KLING] Status check returned error:', data);
        throw new Error(`Kling API error: ${data.message || 'Unknown error'}`);
      }

      // Map Kling task_status to our status
      const taskStatus = data.data?.task_status;
      let status: KlingTaskResponse['status'] = 'pending';

      if (taskStatus === 'processing') {
        status = 'processing';
      } else if (taskStatus === 'succeed') {
        status = 'completed';
      } else if (taskStatus === 'failed') {
        status = 'failed';
      }

      // Extract video URL from completed task
      const videoUrl = data.data?.task_result?.videos?.[0]?.url;

      return {
        taskId,
        status,
        videoUrl: status === 'completed' ? videoUrl : undefined,
        error: status === 'failed' ? (data.data?.task_status_msg || 'Video generation failed') : undefined,
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
  return !!(process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY);
}
