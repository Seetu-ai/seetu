/**
 * Wave API Client
 *
 * Integration with Wave Checkout API for mobile money payments in Senegal
 * Documentation: https://docs.wave.com/checkout
 */

const WAVE_API_URL = 'https://api.wave.com';

export interface WaveCheckoutRequest {
  amount: string;
  currency: string;
  success_url: string;
  error_url: string;
  client_reference?: string;
}

export interface WaveCheckoutSession {
  id: string;
  wave_launch_url: string;
  transaction_id: string | null;
  checkout_status: 'open' | 'complete' | 'expired';
  payment_status: 'processing' | 'cancelled' | 'succeeded' | null;
  amount: string;
  currency: string;
  client_reference: string | null;
  when_created: string;
  when_completed: string | null;
  when_expires: string;
}

export class WaveError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'WaveError';
    this.status = status;
    this.details = details;
  }
}

class WaveClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.WAVE_API_KEY || '';
    this.baseUrl = WAVE_API_URL;

    if (!this.apiKey) {
      console.warn('[WAVE] API key not configured');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[WAVE] API error:', response.status, error);
      throw new WaveError(
        error.message || `Wave API error: ${response.status}`,
        response.status,
        error
      );
    }

    return response.json();
  }

  /**
   * Create a checkout session
   */
  async createCheckoutSession(params: {
    amountCfa: number;
    clientReference: string;
    successUrl: string;
    errorUrl: string;
  }): Promise<WaveCheckoutSession> {
    const body: WaveCheckoutRequest = {
      amount: params.amountCfa.toString(),
      currency: 'XOF',
      success_url: params.successUrl,
      error_url: params.errorUrl,
      client_reference: params.clientReference,
    };

    console.log('[WAVE] Creating checkout session:', params.clientReference);

    const session = await this.request<WaveCheckoutSession>(
      '/v1/checkout/sessions',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    console.log('[WAVE] Checkout session created:', session.id);
    return session;
  }

  /**
   * Get checkout session by ID
   */
  async getCheckoutSession(sessionId: string): Promise<WaveCheckoutSession> {
    return this.request<WaveCheckoutSession>(
      `/v1/checkout/sessions/${sessionId}`
    );
  }

  /**
   * Search checkout sessions by client reference
   */
  async searchByClientReference(clientReference: string): Promise<WaveCheckoutSession[]> {
    const response = await this.request<{ items: WaveCheckoutSession[] }>(
      `/v1/checkout/sessions/search?client_reference=${encodeURIComponent(clientReference)}`
    );
    return response.items || [];
  }

  /**
   * Check if payment was successful
   */
  async isPaymentSuccessful(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getCheckoutSession(sessionId);
      return session.checkout_status === 'complete' && session.payment_status === 'succeeded';
    } catch {
      return false;
    }
  }

  /**
   * Check if Wave API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Singleton instance
let waveInstance: WaveClient | null = null;

export function getWaveClient(): WaveClient {
  if (!waveInstance) {
    waveInstance = new WaveClient();
  }
  return waveInstance;
}

export { WaveClient };
export default getWaveClient;
