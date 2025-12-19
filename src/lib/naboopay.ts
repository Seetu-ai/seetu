/**
 * NabooPay API Client
 * Custom implementation since npm package not publicly available
 * Based on NabooPay API documentation
 */

const NABOOPAY_API_URL = 'https://api.naboopay.com/v1';

export enum Wallet {
  WAVE = 'wave',
  ORANGE_MONEY = 'orange_money',
  VISA = 'visa',
  MASTERCARD = 'mastercard',
}

export interface ProductItem {
  name: string;
  price: number;
  quantity: number;
}

export interface TransactionRequest {
  method_of_payment: Wallet[];
  products: ProductItem[];
  success_url?: string;
  error_url?: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}

export interface TransactionResponse {
  order_id: string;
  checkout_url: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  created_at: string;
}

export interface AccountInfo {
  balance: number;
  currency: string;
  email: string;
}

export interface CashoutRequest {
  phone: string;
  amount: number;
  provider: 'wave' | 'orange_money' | 'free_money';
}

class NabooPayClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NABOOPAY_API_KEY || '';
    this.baseUrl = NABOOPAY_API_URL;

    if (!this.apiKey) {
      console.warn('NabooPay API key not configured');
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
      throw new NabooPayError(
        error.message || `HTTP ${response.status}`,
        response.status,
        error
      );
    }

    return response.json();
  }

  // Transaction methods
  transaction = {
    create: async (data: TransactionRequest): Promise<TransactionResponse> => {
      return this.request<TransactionResponse>('/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getOne: async (orderId: string): Promise<TransactionResponse> => {
      return this.request<TransactionResponse>(`/transactions/${orderId}`);
    },

    getAll: async (): Promise<TransactionResponse[]> => {
      return this.request<TransactionResponse[]>('/transactions');
    },
  };

  // Account methods
  account = {
    getInfo: async (): Promise<AccountInfo> => {
      return this.request<AccountInfo>('/account');
    },
  };

  // Cashout methods
  cashout = {
    wave: async (request: Omit<CashoutRequest, 'provider'>): Promise<{ success: boolean }> => {
      return this.request('/cashout', {
        method: 'POST',
        body: JSON.stringify({ ...request, provider: 'wave' }),
      });
    },

    orangeMoney: async (request: Omit<CashoutRequest, 'provider'>): Promise<{ success: boolean }> => {
      return this.request('/cashout', {
        method: 'POST',
        body: JSON.stringify({ ...request, provider: 'orange_money' }),
      });
    },

    freeMoney: async (request: Omit<CashoutRequest, 'provider'>): Promise<{ success: boolean }> => {
      return this.request('/cashout', {
        method: 'POST',
        body: JSON.stringify({ ...request, provider: 'free_money' }),
      });
    },
  };
}

export class NabooPayError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'NabooPayError';
    this.status = status;
    this.details = details;
  }
}

// Singleton instance
let nabooPayInstance: NabooPayClient | null = null;

export function getNabooPayClient(): NabooPayClient {
  if (!nabooPayInstance) {
    nabooPayInstance = new NabooPayClient();
  }
  return nabooPayInstance;
}

// Helper to create a payment for credit purchase
export async function createCreditPurchase(params: {
  packName: string;
  priceFcfa: number;
  orderId: string;
  successUrl: string;
  errorUrl: string;
  callbackUrl: string;
}): Promise<TransactionResponse> {
  const client = getNabooPayClient();

  return client.transaction.create({
    method_of_payment: [Wallet.WAVE, Wallet.ORANGE_MONEY, Wallet.VISA],
    products: [
      {
        name: params.packName,
        price: params.priceFcfa,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    error_url: params.errorUrl,
    callback_url: params.callbackUrl,
    metadata: {
      order_id: params.orderId,
    },
  });
}

/**
 * Verify webhook signature from NabooPay
 * Uses HMAC-SHA256 with webhook secret
 *
 * Expected header format: x-naboopay-signature: t=timestamp,v1=signature
 */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null
): boolean {
  const crypto = require('crypto');

  // Fail closed - no signature = reject
  if (!signatureHeader) {
    console.error('[WEBHOOK] Missing signature header');
    return false;
  }

  const webhookSecret = process.env.NABOOPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[WEBHOOK] NABOOPAY_WEBHOOK_SECRET not configured');
    return false;
  }

  try {
    // Parse signature header (format: t=timestamp,v1=signature)
    const parts = signatureHeader.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      // Fallback: treat entire header as signature (simple HMAC)
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signatureHeader),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.error('[WEBHOOK] Signature mismatch (simple mode)');
      }
      return isValid;
    }

    const timestamp = parseInt(timestampPart.slice(2), 10);
    const signature = signaturePart.slice(3);

    // Prevent replay attacks - reject if older than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const MAX_AGE_SECONDS = 300; // 5 minutes

    if (Math.abs(now - timestamp) > MAX_AGE_SECONDS) {
      console.error('[WEBHOOK] Timestamp too old:', timestamp, 'vs', now);
      return false;
    }

    // Compute expected signature: HMAC-SHA256(timestamp.payload)
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error('[WEBHOOK] Signature mismatch');
    }

    return isValid;
  } catch (error) {
    console.error('[WEBHOOK] Signature verification error:', error);
    return false;
  }
}

/**
 * Verify transaction details match expected values
 * Additional security layer beyond signature
 */
export async function verifyTransactionDetails(
  orderId: string,
  reportedAmount: number
): Promise<{ valid: boolean; error?: string }> {
  try {
    const client = getNabooPayClient();
    const transaction = await client.transaction.getOne(orderId);

    if (!transaction) {
      return { valid: false, error: 'Transaction not found on NabooPay' };
    }

    if (transaction.amount !== reportedAmount) {
      return { valid: false, error: 'Amount mismatch' };
    }

    if (transaction.status !== 'completed') {
      return { valid: false, error: 'Transaction not completed on NabooPay' };
    }

    return { valid: true };
  } catch (error) {
    console.error('[WEBHOOK] Transaction verification error:', error);
    return { valid: false, error: 'Failed to verify with NabooPay API' };
  }
}

export { NabooPayClient };
export default getNabooPayClient;
