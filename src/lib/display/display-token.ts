/**
 * Display Token Utility
 * Generates and verifies short-lived HMAC tokens for billboard display authentication.
 * Replaces raw API key exposure in client-side JavaScript.
 */

import crypto from 'crypto';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSecret(): string {
  return process.env.DISPLAY_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

/**
 * Generate a short-lived HMAC display token for a billboard.
 * Format: billboardId:timestamp:hmac
 */
export function generateDisplayToken(billboardId: string): string {
  const secret = getSecret();
  const timestamp = Date.now().toString();
  const payload = `${billboardId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}:${hmac}`;
}

/**
 * Verify a display token and extract the billboardId.
 * Returns valid=false if the token is malformed, expired, or has an invalid HMAC.
 */
export function verifyDisplayToken(token: string): { valid: boolean; billboardId?: string } {
  const parts = token.split(':');
  if (parts.length !== 3) {
    return { valid: false };
  }

  const [billboardId, timestampStr, providedHmac] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) {
    return { valid: false };
  }

  // Check expiry
  if (Date.now() - timestamp > TOKEN_TTL_MS) {
    return { valid: false };
  }

  // Verify HMAC
  const secret = getSecret();
  const payload = `${billboardId}:${timestampStr}`;
  const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(providedHmac, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
    return { valid: false };
  }

  return { valid: true, billboardId };
}
