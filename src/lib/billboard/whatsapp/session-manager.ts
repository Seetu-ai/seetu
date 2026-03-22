/**
 * WhatsApp Session Manager
 *
 * State machine for managing WhatsApp billboard booking conversations
 *
 * States:
 * - START: Initial state, waiting for media
 * - AWAITING_MEDIA: Sent welcome, waiting for media upload
 * - AWAITING_BILLBOARD: Media validated, waiting for billboard selection
 * - AWAITING_PAYMENT: Billboards selected, waiting for payment
 * - CONFIRMED: Payment complete, order in queue
 * - EXPIRED: Session timed out
 */

import { prisma } from '../../prisma';
import { WhatsAppSessionState, Prisma } from '@prisma/client';

// Helper type for JSON-compatible session data
type JsonSessionData = Prisma.InputJsonValue;

// Session expires after 30 minutes of inactivity
const SESSION_TIMEOUT_MINUTES = 30;

export interface PendingMedia {
  contentId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  receivedAt: string; // ISO string for JSON compatibility
}

export interface SessionData {
  contentId?: string;
  contentIds?: string[]; // For batch processing
  selectedBillboardIds?: string[];
  paymentId?: string;
  messageCount?: number;
  lastMediaUrl?: string;
  pendingMedia?: PendingMedia[];
  batchStartedAt?: string; // ISO string for JSON compatibility
  scheduledFor?: string; // ISO string or null for "now"
  awaitingDateInput?: boolean; // Flag for when user picked "Programmer" and we're waiting for free-text date
}

export interface OcrData {
  fullName: string | null;
  idNumber: string | null;
  dateOfBirth: string | null;
  documentType: string | null;
}

export interface Session {
  id: string;
  phone: string;
  name: string | null;
  state: WhatsAppSessionState;
  data: SessionData;
  currentContentId: string | null;
  expiresAt: Date;
  isVerified: boolean;
  idDocPath: string | null;
  verifiedAt: Date | null;
  idFullName: string | null;
  idNumber: string | null;
  idDateOfBirth: string | null;
  idDocumentType: string | null;
}

/**
 * Get or create a session for a phone number
 */
export async function getOrCreateSession(
  phone: string,
  name?: string
): Promise<Session> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MINUTES * 60 * 1000);

  // Try to find existing session
  let session = await prisma.whatsAppSession.findUnique({
    where: { phone },
  });

  if (session) {
    // Check if expired
    if (session.expiresAt < now) {
      // Reset expired session
      session = await prisma.whatsAppSession.update({
        where: { phone },
        data: {
          state: 'START',
          sessionData: {},
          currentContentId: null,
          lastMessageAt: now,
          expiresAt,
          name: name || session.name,
        },
      });
    } else {
      // Update last activity
      session = await prisma.whatsAppSession.update({
        where: { phone },
        data: {
          lastMessageAt: now,
          expiresAt,
          name: name || session.name,
        },
      });
    }
  } else {
    // Create new session
    session = await prisma.whatsAppSession.create({
      data: {
        phone,
        name,
        state: 'START',
        sessionData: {},
        lastMessageAt: now,
        expiresAt,
      },
    });
  }

  return {
    id: session.id,
    phone: session.phone,
    name: session.name,
    state: session.state,
    data: session.sessionData as SessionData,
    currentContentId: session.currentContentId,
    expiresAt: session.expiresAt,
    isVerified: session.isVerified,
    idDocPath: session.idDocPath,
    verifiedAt: session.verifiedAt,
    idFullName: session.idFullName,
    idNumber: session.idNumber,
    idDateOfBirth: session.idDateOfBirth,
    idDocumentType: session.idDocumentType,
  };
}

/**
 * Update session state
 */
export async function updateSessionState(
  phone: string,
  state: WhatsAppSessionState,
  data?: Partial<SessionData>
): Promise<Session> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MINUTES * 60 * 1000);

  // Get current session to merge data
  const current = await prisma.whatsAppSession.findUnique({
    where: { phone },
  });

  const currentData = (current?.sessionData as SessionData) || {};
  const mergedData = { ...currentData, ...data };

  const session = await prisma.whatsAppSession.update({
    where: { phone },
    data: {
      state,
      sessionData: mergedData as unknown as JsonSessionData,
      currentContentId: data?.contentId || current?.currentContentId,
      lastMessageAt: now,
      expiresAt,
    },
  });

  return {
    id: session.id,
    phone: session.phone,
    name: session.name,
    state: session.state,
    data: session.sessionData as SessionData,
    currentContentId: session.currentContentId,
    expiresAt: session.expiresAt,
    isVerified: session.isVerified,
    idDocPath: session.idDocPath,
    verifiedAt: session.verifiedAt,
    idFullName: session.idFullName,
    idNumber: session.idNumber,
    idDateOfBirth: session.idDateOfBirth,
    idDocumentType: session.idDocumentType,
  };
}

/**
 * Set session content ID
 */
export async function setSessionContent(
  phone: string,
  contentId: string
): Promise<void> {
  const current = await prisma.whatsAppSession.findUnique({ where: { phone } });
  const currentData = (current?.sessionData as SessionData) || {};

  await prisma.whatsAppSession.update({
    where: { phone },
    data: {
      currentContentId: contentId,
      sessionData: { ...currentData, contentId } as unknown as JsonSessionData,
    },
  });
}

/**
 * Set selected billboards in session
 */
export async function setSelectedBillboards(
  phone: string,
  billboardIds: string[]
): Promise<void> {
  const current = await prisma.whatsAppSession.findUnique({
    where: { phone },
  });

  const currentData = (current?.sessionData as SessionData) || {};

  await prisma.whatsAppSession.update({
    where: { phone },
    data: {
      sessionData: {
        ...currentData,
        selectedBillboardIds: billboardIds,
      } as unknown as JsonSessionData,
    },
  });
}

/**
 * Set payment ID in session
 */
export async function setPaymentId(
  phone: string,
  paymentId: string
): Promise<void> {
  const current = await prisma.whatsAppSession.findUnique({
    where: { phone },
  });

  const currentData = (current?.sessionData as SessionData) || {};

  await prisma.whatsAppSession.update({
    where: { phone },
    data: {
      sessionData: {
        ...currentData,
        paymentId,
      } as unknown as JsonSessionData,
    },
  });
}

/**
 * Reset session to start state
 */
export async function resetSession(phone: string): Promise<Session> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MINUTES * 60 * 1000);

  const session = await prisma.whatsAppSession.update({
    where: { phone },
    data: {
      state: 'START',
      sessionData: {},
      currentContentId: null,
      lastMessageAt: now,
      expiresAt,
    },
  });

  return {
    id: session.id,
    phone: session.phone,
    name: session.name,
    state: session.state,
    data: {},
    currentContentId: null,
    expiresAt: session.expiresAt,
    isVerified: session.isVerified,
    idDocPath: session.idDocPath,
    verifiedAt: session.verifiedAt,
    idFullName: session.idFullName,
    idNumber: session.idNumber,
    idDateOfBirth: session.idDateOfBirth,
    idDocumentType: session.idDocumentType,
  };
}

/**
 * Mark session as expired
 */
export async function expireSession(phone: string): Promise<void> {
  await prisma.whatsAppSession.update({
    where: { phone },
    data: {
      state: 'EXPIRED',
    },
  });
}

/**
 * Mark a WhatsApp advertiser as identity-verified
 */
export async function markVerified(phone: string, idDocPath: string, ocrData?: OcrData | null): Promise<void> {
  await prisma.whatsAppSession.update({
    where: { phone },
    data: {
      isVerified: true,
      idDocPath,
      verifiedAt: new Date(),
      ...(ocrData && {
        idFullName: ocrData.fullName,
        idNumber: ocrData.idNumber,
        idDateOfBirth: ocrData.dateOfBirth,
        idDocumentType: ocrData.documentType,
      }),
    },
  });
}

/**
 * Find if an ID number is already used by another phone number
 * Returns the duplicate phone or null
 */
export async function findDuplicateIdNumber(idNumber: string, excludePhone: string): Promise<string | null> {
  const existing = await prisma.whatsAppSession.findFirst({
    where: {
      idNumber,
      phone: { not: excludePhone },
      isVerified: true,
    },
    select: { phone: true },
  });
  return existing?.phone || null;
}

/**
 * Get session by phone
 */
export async function getSession(phone: string): Promise<Session | null> {
  const session = await prisma.whatsAppSession.findUnique({
    where: { phone },
  });

  if (!session) return null;

  return {
    id: session.id,
    phone: session.phone,
    name: session.name,
    state: session.state,
    data: session.sessionData as SessionData,
    currentContentId: session.currentContentId,
    expiresAt: session.expiresAt,
    isVerified: session.isVerified,
    idDocPath: session.idDocPath,
    verifiedAt: session.verifiedAt,
    idFullName: session.idFullName,
    idNumber: session.idNumber,
    idDateOfBirth: session.idDateOfBirth,
    idDocumentType: session.idDocumentType,
  };
}

/**
 * Get session by content ID
 */
export async function getSessionByContentId(contentId: string): Promise<Session | null> {
  const session = await prisma.whatsAppSession.findFirst({
    where: {
      currentContentId: contentId,
    },
  });

  if (!session) return null;

  return {
    id: session.id,
    phone: session.phone,
    name: session.name,
    state: session.state,
    data: session.sessionData as SessionData,
    currentContentId: session.currentContentId,
    expiresAt: session.expiresAt,
    isVerified: session.isVerified,
    idDocPath: session.idDocPath,
    verifiedAt: session.verifiedAt,
    idFullName: session.idFullName,
    idNumber: session.idNumber,
    idDateOfBirth: session.idDateOfBirth,
    idDocumentType: session.idDocumentType,
  };
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const now = new Date();

  const result = await prisma.whatsAppSession.updateMany({
    where: {
      expiresAt: { lt: now },
      state: { not: 'EXPIRED' },
    },
    data: {
      state: 'EXPIRED',
    },
  });

  return result.count;
}

/**
 * Delete old expired sessions (older than 7 days)
 */
export async function deleteOldSessions(daysOld: number = 7): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);

  const result = await prisma.whatsAppSession.deleteMany({
    where: {
      state: 'EXPIRED',
      expiresAt: { lt: cutoff },
    },
  });

  return result.count;
}

/**
 * Check if state transition is valid
 */
export function isValidTransition(
  currentState: WhatsAppSessionState,
  newState: WhatsAppSessionState
): boolean {
  const validTransitions: Record<WhatsAppSessionState, WhatsAppSessionState[]> = {
    START: ['AWAITING_VERIFICATION', 'AWAITING_MEDIA', 'START'],
    AWAITING_VERIFICATION: ['AWAITING_MEDIA', 'START', 'EXPIRED'],
    AWAITING_MEDIA: ['AWAITING_BILLBOARD', 'START', 'EXPIRED'],
    AWAITING_BILLBOARD: ['AWAITING_SCHEDULE', 'AWAITING_PAYMENT', 'AWAITING_MEDIA', 'START', 'EXPIRED'],
    AWAITING_SCHEDULE: ['AWAITING_PAYMENT', 'AWAITING_BILLBOARD', 'START', 'EXPIRED'],
    AWAITING_PAYMENT: ['CONFIRMED', 'AWAITING_BILLBOARD', 'START', 'EXPIRED'],
    CONFIRMED: ['START'], // Can start a new order
    EXPIRED: ['START'], // Can restart
  };

  return validTransitions[currentState]?.includes(newState) || false;
}

/**
 * Get human-readable state description (French)
 */
export function getStateDescription(state: WhatsAppSessionState): string {
  const descriptions: Record<WhatsAppSessionState, string> = {
    START: 'Démarrage',
    AWAITING_VERIFICATION: "Vérification d'identité",
    AWAITING_MEDIA: "En attente d'image/vidéo",
    AWAITING_BILLBOARD: 'Sélection des panneaux',
    AWAITING_SCHEDULE: "Choix de l'horaire",
    AWAITING_PAYMENT: 'En attente de paiement',
    CONFIRMED: 'Commande confirmée',
    EXPIRED: 'Session expirée',
  };

  return descriptions[state] || state;
}

// ═══════════════════════════════════════════════════════════════
// BATCH MEDIA MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Add a pending media item to the session
 * Uses a transaction with row-level locking to prevent race conditions
 * when multiple images arrive simultaneously
 */
export async function addPendingMedia(
  phone: string,
  media: Omit<PendingMedia, 'receivedAt'> & { receivedAt: Date }
): Promise<PendingMedia[]> {
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 100;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Use interactive transaction with row locking to prevent race condition
      // when multiple images arrive simultaneously
      const result = await prisma.$transaction(async (tx) => {
        // Lock the row for update using raw query
        // This ensures only one concurrent call can modify pendingMedia at a time
        // Note: Table name is "whatsapp_sessions" as defined by @@map in schema
        await tx.$queryRaw`SELECT id FROM whatsapp_sessions WHERE phone = ${phone} FOR UPDATE`;

        const current = await tx.whatsAppSession.findUnique({
          where: { phone },
        });

        const currentData = (current?.sessionData as SessionData) || {};
        const pendingMedia = currentData.pendingMedia || [];

        // Add new media to the pending list (convert Date to ISO string for JSON storage)
        const newMedia: PendingMedia = {
          ...media,
          receivedAt: media.receivedAt.toISOString(),
        };
        pendingMedia.push(newMedia);

        // Set batchStartedAt if this is the first media in the batch (ISO string for JSON storage)
        const batchStartedAt = currentData.batchStartedAt || new Date().toISOString();

        await tx.whatsAppSession.update({
          where: { phone },
          data: {
            sessionData: {
              ...currentData,
              pendingMedia,
              batchStartedAt,
            } as unknown as JsonSessionData,
          },
        });

        return pendingMedia;
      }, {
        timeout: 10000, // 10 second timeout
      });

      console.log(`[SESSION_MANAGER] Added pending media for ${phone}, total count: ${result.length}`);
      return result;
    } catch (error) {
      // Check if it's a serialization failure (P2010 with code 40001)
      const isSerializationError =
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2010';

      if (isSerializationError && attempt < MAX_RETRIES) {
        // Wait with exponential backoff + jitter before retrying
        const delay = RETRY_DELAY_MS * attempt + Math.random() * 50;
        console.log(`[SESSION_MANAGER] Serialization conflict for ${phone}, retry ${attempt}/${MAX_RETRIES} after ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Re-throw if not a serialization error or max retries reached
      throw error;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Max retries exceeded');
}

/**
 * Get pending media for a phone number
 */
export async function getPendingMedia(phone: string): Promise<PendingMedia[]> {
  const session = await prisma.whatsAppSession.findUnique({
    where: { phone },
  });

  if (!session) return [];

  const data = session.sessionData as SessionData;
  return data.pendingMedia || [];
}

/**
 * Clear pending media from session
 */
export async function clearPendingMedia(phone: string): Promise<void> {
  const current = await prisma.whatsAppSession.findUnique({
    where: { phone },
  });

  if (!current) return;

  const currentData = (current.sessionData as SessionData) || {};

  await prisma.whatsAppSession.update({
    where: { phone },
    data: {
      sessionData: {
        ...currentData,
        pendingMedia: [],
        batchStartedAt: undefined,
      } as unknown as JsonSessionData,
    },
  });
}

/**
 * Check if a batch is in progress for this phone
 */
export async function isBatchInProgress(phone: string): Promise<boolean> {
  const pendingMedia = await getPendingMedia(phone);
  return pendingMedia.length > 0;
}

/**
 * Set content IDs in session (for batch)
 */
export async function setContentIds(
  phone: string,
  contentIds: string[]
): Promise<void> {
  const current = await prisma.whatsAppSession.findUnique({
    where: { phone },
  });

  const currentData = (current?.sessionData as SessionData) || {};

  await prisma.whatsAppSession.update({
    where: { phone },
    data: {
      sessionData: {
        ...currentData,
        contentIds,
        // Keep first contentId for backwards compatibility
        contentId: contentIds[0],
      } as unknown as JsonSessionData,
      currentContentId: contentIds[0],
    },
  });
}
