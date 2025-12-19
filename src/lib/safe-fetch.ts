/**
 * Safe Fetch Utility - SSRF Protection
 * Prevents server-side request forgery attacks
 */

import { URL } from 'url';

// Allowed protocols
const ALLOWED_PROTOCOLS = ['https:', 'http:'];

// Blocked IP ranges (private/internal networks)
const BLOCKED_IP_PATTERNS = [
  /^127\./,                    // Loopback
  /^10\./,                     // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private Class B
  /^192\.168\./,               // Private Class C
  /^169\.254\./,               // Link-local
  /^0\./,                      // Current network
  /^::1$/,                     // IPv6 loopback
  /^fc00:/i,                   // IPv6 private
  /^fe80:/i,                   // IPv6 link-local
  /^localhost$/i,              // Localhost hostname
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',   // GCP metadata
  '169.254.169.254',           // AWS/GCP metadata
  'metadata.internal',
];

// Allowed domains for external image fetching
const ALLOWED_IMAGE_DOMAINS = [
  // Google/Gemini
  'storage.googleapis.com',
  'lh3.googleusercontent.com',
  // Cloudflare
  'imagedelivery.net',
  // Supabase
  'supabase.co',
  // Common image CDNs
  'images.unsplash.com',
  'cdn.shopify.com',
  'res.cloudinary.com',
  // Allow same-origin
  process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || '',
].filter(Boolean);

interface SafeFetchOptions {
  maxSizeBytes?: number;
  timeoutMs?: number;
  allowedDomains?: string[];
  requireHttps?: boolean;
}

const DEFAULT_OPTIONS: SafeFetchOptions = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB max
  timeoutMs: 30000,               // 30 second timeout
  allowedDomains: [],             // Empty = allow all (except blocked)
  requireHttps: true,
};

/**
 * Validate a URL for SSRF attacks
 */
export function validateUrl(
  urlString: string,
  options: SafeFetchOptions = {}
): { valid: boolean; error?: string; url?: URL } {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const url = new URL(urlString);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return { valid: false, error: `Protocol not allowed: ${url.protocol}` };
    }

    // Require HTTPS in production
    if (opts.requireHttps && url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      return { valid: false, error: 'HTTPS required' };
    }

    // Check for blocked hostnames
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return { valid: false, error: 'Hostname blocked' };
    }

    // Check for blocked IP patterns
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'Internal IP not allowed' };
      }
    }

    // Check allowed domains (if specified)
    if (opts.allowedDomains && opts.allowedDomains.length > 0) {
      const isAllowed = opts.allowedDomains.some(
        domain => hostname === domain || hostname.endsWith(`.${domain}`)
      );
      if (!isAllowed) {
        return { valid: false, error: 'Domain not in allowlist' };
      }
    }

    return { valid: true, url };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Safe fetch with SSRF protection, timeout, and size limits
 */
export async function safeFetch(
  urlString: string,
  options: SafeFetchOptions & RequestInit = {}
): Promise<Response> {
  const { maxSizeBytes, timeoutMs, allowedDomains, requireHttps, ...fetchOptions } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Validate URL
  const validation = validateUrl(urlString, { allowedDomains, requireHttps });
  if (!validation.valid) {
    throw new Error(`SSRF protection: ${validation.error}`);
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(urlString, {
      ...fetchOptions,
      signal: controller.signal,
      redirect: 'follow',
    });

    // Check content length before reading body
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes!) {
      throw new Error(`Response too large: ${contentLength} bytes (max: ${maxSizeBytes})`);
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Safely fetch an image and return as buffer
 * Only allows image MIME types
 */
export async function safeFetchImage(
  urlString: string,
  options: SafeFetchOptions = {}
): Promise<{ buffer: Buffer; mimeType: string }> {
  const opts = {
    ...DEFAULT_OPTIONS,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB max for images
    allowedDomains: ALLOWED_IMAGE_DOMAINS,
    ...options,
  };

  const response = await safeFetch(urlString, opts);

  // Verify content type is an image
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Invalid content type: ${contentType} (expected image/*)`);
  }

  // Read with size limit
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > opts.maxSizeBytes!) {
    throw new Error(`Image too large: ${arrayBuffer.byteLength} bytes`);
  }

  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType.split(';')[0].trim(),
  };
}

/**
 * Validate image URL without fetching (for user input validation)
 */
export function isValidImageUrl(urlString: string): boolean {
  const validation = validateUrl(urlString, {
    allowedDomains: ALLOWED_IMAGE_DOMAINS,
    requireHttps: process.env.NODE_ENV === 'production',
  });
  return validation.valid;
}
