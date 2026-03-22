/**
 * WhatsApp Message Handler
 *
 * Routes incoming WhatsApp messages to appropriate handlers
 * based on session state and message content
 */

import { getWatiClient, WatiMessage } from './wati-client';
import {
  getOrCreateSession,
  updateSessionState,
  setSessionContent,
  setSelectedBillboards,
  setPaymentId,
  resetSession,
  addPendingMedia,
  getPendingMedia,
  markVerified,
  findDuplicateIdNumber,
  Session,
  SessionData,
  OcrData,
} from './session-manager';
import { scheduleBatchProcessing } from '../../queues/billboard-queue';
import * as templates from './templates';
import { prisma } from '../../prisma';
import { getBillboardPricing, calculatePrice, formatPriceCFA } from '../pricing';
import { getContentQueuePositions } from '../queue-manager';
import { uploadBuffer, uploadWhatsAppIdDoc, BUCKETS } from '../../storage';
import { createBillboardPayment } from '../payments';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Gemini for natural language understanding
const genAI = process.env.GOOGLE_AI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  : null;

interface HandlerResult {
  success: boolean;
  error?: string;
}

/**
 * Main message handler - routes based on state
 */
export async function handleIncomingMessage(
  message: WatiMessage
): Promise<HandlerResult> {
  const wati = getWatiClient();

  try {
    // Get or create session
    const contact = await wati.getContact(message.phone);
    const session = await getOrCreateSession(message.phone, contact?.name);

    console.log(
      `[WA_HANDLER] Message from ${message.phone} (state: ${session.state}): ${message.type}`
    );

    // Check for special commands first
    const commandResult = await handleSpecialCommands(message, session);
    if (commandResult) return commandResult;

    // Route based on session state
    switch (session.state) {
      case 'START':
        if (!session.isVerified) {
          return await handleVerificationState(message, session);
        }
        return await handleMediaState(message, session);

      case 'AWAITING_VERIFICATION':
        return await handleVerificationState(message, session);

      case 'AWAITING_MEDIA':
        return await handleMediaState(message, session);

      case 'AWAITING_BILLBOARD':
        return await handleBillboardSelection(message, session);

      case 'AWAITING_SCHEDULE':
        return await handleScheduleSelection(message, session);

      case 'AWAITING_PAYMENT':
        return await handlePaymentState(message, session);

      case 'CONFIRMED':
        // If user sends media, process it directly for new order
        if (message.type === 'image' || message.type === 'video') {
          await updateSessionState(message.phone, 'AWAITING_MEDIA');
          return await handleMediaState(message, session);
        }
        // Otherwise prompt for new order
        await wati.sendMessage({
          phone: message.phone,
          message: 'Envoyez une image ou vidéo pour une nouvelle pub.',
        });
        await updateSessionState(message.phone, 'AWAITING_MEDIA');
        return { success: true };

      case 'EXPIRED':
        // Restart session
        await wati.sendMessage({
          phone: message.phone,
          message: templates.SESSION_EXPIRED,
        });
        await resetSession(message.phone);
        return { success: true };

      default:
        await wati.sendMessage({
          phone: message.phone,
          message: templates.UNKNOWN_COMMAND,
        });
        return { success: true };
    }
  } catch (error) {
    console.error('[WA_HANDLER] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle special commands (aide, annuler, statut, support)
 */
async function handleSpecialCommands(
  message: WatiMessage,
  session: Session
): Promise<HandlerResult | null> {
  if (message.type !== 'text' || !message.text) return null;

  const text = message.text.toLowerCase().trim();
  const wati = getWatiClient();

  if (text === 'aide' || text === 'help') {
    await wati.sendMessage({
      phone: message.phone,
      message: templates.HELP_MESSAGE,
    });
    return { success: true };
  }

  if (text === 'annuler' || text === 'cancel') {
    await resetSession(message.phone);
    await wati.sendMessage({
      phone: message.phone,
      message: templates.ORDER_CANCELLED,
    });
    return { success: true };
  }

  if (text === 'statut' || text === 'status') {
    if (session.currentContentId) {
      const positions = await getContentQueuePositions(session.currentContentId);
      const content = await prisma.billboardContent.findUnique({
        where: { id: session.currentContentId },
        select: { status: true },
      });

      await wati.sendMessage({
        phone: message.phone,
        message: templates.formatContentStatus(
          content?.status || 'unknown',
          session.currentContentId,
          positions.map(p => ({
            billboardName: p.billboardName,
            position: p.position,
          }))
        ),
      });
    } else {
      await wati.sendMessage({
        phone: message.phone,
        message: 'Aucune commande en cours.',
      });
    }
    return { success: true };
  }

  if (text === 'support') {
    await wati.sendMessage({
      phone: message.phone,
      message: templates.SUPPORT_CONTACT,
    });
    return { success: true };
  }

  if (text === 'reprendre') {
    // Resume from payment if pending
    if (session.state === 'AWAITING_PAYMENT' && session.data.paymentId) {
      const payment = await prisma.billboardPayment.findUnique({
        where: { id: session.data.paymentId },
        select: { checkoutUrl: true, status: true },
      });

      if (payment?.status === 'pending' && payment.checkoutUrl) {
        await wati.sendMessage({
          phone: message.phone,
          message: `${templates.PAYMENT_PROMPT}\n\n${templates.formatPaymentLink(payment.checkoutUrl)}`,
        });
        return { success: true };
      }
    }

    // Otherwise restart
    await resetSession(message.phone);
    await wati.sendMessage({
      phone: message.phone,
      message: templates.WELCOME_MESSAGE,
    });
    return { success: true };
  }

  return null; // Not a special command
}

/**
 * Handle identity verification state
 * First-time users must send a photo of their CNI/Passport
 */
async function handleVerificationState(
  message: WatiMessage,
  session: Session
): Promise<HandlerResult> {
  const wati = getWatiClient();

  // If state is START, transition to AWAITING_VERIFICATION
  if (session.state === 'START') {
    await updateSessionState(message.phone, 'AWAITING_VERIFICATION');

    // If user already sent an image as their first message, process it immediately
    if (message.type === 'image') {
      return await processIdDocument(message, session);
    }

    // Otherwise ask for ID photo
    await wati.sendMessage({
      phone: message.phone,
      message: templates.VERIFICATION_REQUEST,
    });
    return { success: true };
  }

  // State is AWAITING_VERIFICATION — expect an image
  if (message.type === 'image') {
    return await processIdDocument(message, session);
  }

  // Not an image — send invalid format message
  await wati.sendMessage({
    phone: message.phone,
    message: templates.VERIFICATION_INVALID_FORMAT,
  });
  return { success: true };
}

/**
 * Process an ID document photo (download, upload to private storage, mark verified)
 */
async function processIdDocument(
  message: WatiMessage,
  session: Session
): Promise<HandlerResult> {
  const wati = getWatiClient();

  if (!message.mediaUrl) {
    await wati.sendMessage({
      phone: message.phone,
      message: templates.VERIFICATION_INVALID_FORMAT,
    });
    return { success: true };
  }

  try {
    // Download image from WATI (same pattern as media download)
    const watiApiToken = process.env.WATI_API_TOKEN || '';
    const fetchHeaders: Record<string, string> = {};

    if (message.mediaUrl.includes('wati.io')) {
      fetchHeaders['Authorization'] = `Bearer ${watiApiToken}`;
    }

    console.log('[WA_HANDLER] Downloading ID doc from:', message.mediaUrl.substring(0, 80) + '...');
    const response = await fetch(message.mediaUrl, { headers: fetchHeaders });

    if (!response.ok) {
      console.error('[WA_HANDLER] ID doc download failed:', response.status, response.statusText);
      throw new Error(`Failed to download ID doc: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Verify the image is actually an ID document using Gemini Vision
    const isValidId = await verifyIdDocumentWithVision(buffer, contentType);
    if (!isValidId) {
      console.log(`[WA_HANDLER] ID doc rejected for ${message.phone} — not a valid ID`);
      await wati.sendMessage({
        phone: message.phone,
        message: templates.VERIFICATION_NOT_ID,
      });
      return { success: true };
    }

    // OCR-extract structured data (second Gemini call)
    // If this fails, user still gets verified — OCR fields stay null
    const ocrData = await extractIdDocumentData(buffer, contentType);

    // Duplicate ID check: if we extracted an ID number, check it's not already used
    if (ocrData?.idNumber) {
      const duplicatePhone = await findDuplicateIdNumber(ocrData.idNumber, message.phone);
      if (duplicatePhone) {
        console.log(`[WA_HANDLER] Duplicate ID number ${ocrData.idNumber} for ${message.phone} (already used by ${duplicatePhone})`);
        await wati.sendMessage({
          phone: message.phone,
          message: templates.VERIFICATION_DUPLICATE_ID,
        });
        return { success: true };
      }
    }

    // Upload to private storage
    const upload = await uploadWhatsAppIdDoc(buffer, message.phone, contentType);

    // Mark user as verified (with OCR data if available)
    await markVerified(message.phone, upload.path, ocrData);

    console.log(`[WA_HANDLER] User ${message.phone} identity verified, doc: ${upload.path}, ocr: ${ocrData ? JSON.stringify(ocrData) : 'null'}`);

    // Send success message
    await wati.sendMessage({
      phone: message.phone,
      message: templates.VERIFICATION_SUCCESS,
    });

    // Transition to AWAITING_MEDIA
    await updateSessionState(message.phone, 'AWAITING_MEDIA');

    return { success: true };
  } catch (error) {
    console.error('[WA_HANDLER] ID doc processing error:', error);
    await wati.sendMessage({
      phone: message.phone,
      message: 'Erreur lors du traitement de votre document. Veuillez réessayer.',
    });
    return { success: false, error: 'ID doc processing failed' };
  }
}

/**
 * Verify an image is a valid identity document using Gemini Vision
 *
 * SECURITY: This function is FAIL-CLOSED. If anything goes wrong
 * (Gemini error, safety block, unparseable response, etc.), it returns false.
 * Only returns true when Gemini explicitly confirms is_valid_id: true.
 */
async function verifyIdDocumentWithVision(
  buffer: Buffer,
  contentType: string
): Promise<boolean> {
  if (!genAI) {
    console.error('[WA_HANDLER] Gemini not configured — cannot verify ID doc, rejecting');
    return false;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
      // Disable all safety filters so Gemini can analyze ANY image
      // (weapons, violence, etc.) and tell us it's NOT an ID,
      // rather than throwing a safety error that we'd have to reject blindly.
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const base64Image = buffer.toString('base64');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: contentType,
          data: base64Image,
        },
      },
      `You are a strict identity document validator. Analyze this image and determine if it is a genuine government-issued identity document.

ACCEPT only:
- National ID card (CNI) from any country
- Passport
- Consular card
- Driver's license
- Any official government-issued ID with a photo

REJECT everything else, including but not limited to:
- Screenshots of any kind
- Photos of people without a document
- Weapons, objects, animals, food, landscapes
- Ads, products, logos, memes
- Business cards, invoices, receipts
- Blurry images where nothing is identifiable
- Any image that is NOT a physical identity document

You MUST respond with ONLY this exact JSON (no other text):
{"is_valid_id": true, "document_type": "cni"}
or
{"is_valid_id": false, "reason": "not an identity document"}

When in doubt, REJECT. Only accept if you are confident this is a real government ID.`,
    ]);

    const text = result.response.text().trim();
    console.log('[WA_HANDLER] ID doc raw response:', text);

    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[WA_HANDLER] ID doc validation result:', parsed);
        return parsed.is_valid_id === true;
      } catch {
        console.warn('[WA_HANDLER] Malformed JSON in response, falling back to text scan');
      }
    }

    // Fallback: scan raw text for the boolean value (handles truncated JSON)
    if (/"is_valid_id"\s*:\s*true/i.test(text)) {
      console.log('[WA_HANDLER] ID doc accepted (text scan fallback)');
      return true;
    }
    if (/"is_valid_id"\s*:\s*false/i.test(text)) {
      console.log('[WA_HANDLER] ID doc rejected (text scan fallback)');
      return false;
    }

    // FAIL-CLOSED: could not determine result → reject
    console.warn('[WA_HANDLER] Could not parse ID doc response — rejecting (fail-closed)');
    return false;
  } catch (error) {
    // FAIL-CLOSED: any error (including safety blocks) → reject
    console.error('[WA_HANDLER] ID doc vision validation error — rejecting (fail-closed):', error);
    return false;
  }
}

/**
 * Normalize an ID number for deduplication
 * Strips spaces, dashes, dots and uppercases
 */
function normalizeIdNumber(raw: string): string {
  return raw.replace(/[\s-.]/g, '').toUpperCase();
}

/**
 * OCR-extract structured data from an ID document using Gemini Vision
 * Returns null on any error (graceful degradation — user still gets verified)
 */
async function extractIdDocumentData(
  buffer: Buffer,
  contentType: string
): Promise<OcrData | null> {
  if (!genAI) {
    console.warn('[WA_HANDLER] Gemini not configured — skipping OCR extraction');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const base64Image = buffer.toString('base64');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: contentType,
          data: base64Image,
        },
      },
      `You are an OCR specialist. Extract the following fields from this identity document image.

Return ONLY this JSON (no other text):
{
  "fullName": "FULL NAME as written on the document or null",
  "idNumber": "Document ID/number as written on the document or null",
  "dateOfBirth": "Date of birth as written (any format) or null",
  "documentType": "cni | passport | driver_license | consular_card | other"
}

Rules:
- Extract text EXACTLY as printed on the document
- If a field is not visible or not readable, use null
- For idNumber, include all characters (letters and digits)
- For documentType, use the closest match from the list above
- Do NOT invent or guess data — only extract what is clearly visible`,
    ]);

    const text = result.response.text().trim();
    console.log('[WA_HANDLER] OCR raw response:', text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[WA_HANDLER] No JSON found in OCR response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const ocrData: OcrData = {
      fullName: parsed.fullName || null,
      idNumber: parsed.idNumber ? normalizeIdNumber(parsed.idNumber) : null,
      dateOfBirth: parsed.dateOfBirth || null,
      documentType: parsed.documentType || null,
    };

    console.log('[WA_HANDLER] OCR extracted:', ocrData);
    return ocrData;
  } catch (error) {
    console.error('[WA_HANDLER] OCR extraction error (graceful degradation):', error);
    return null;
  }
}

// Batch processing delay in milliseconds (3 seconds)
const BATCH_DELAY_MS = 3000;

/**
 * Handle media upload state
 * Uses batch processing to group multiple images sent in quick succession
 */
async function handleMediaState(
  message: WatiMessage,
  session: Session
): Promise<HandlerResult> {
  const wati = getWatiClient();

  // If first contact, send welcome
  if (session.state === 'START') {
    await updateSessionState(message.phone, 'AWAITING_MEDIA');

    // Check if this message already contains media
    if (message.type !== 'image' && message.type !== 'video') {
      await wati.sendMessage({
        phone: message.phone,
        message: templates.WELCOME_MESSAGE,
      });
      return { success: true };
    }
  }

  // Check for media
  if (message.type !== 'image' && message.type !== 'video') {
    await wati.sendMessage({
      phone: message.phone,
      message: templates.WELCOME_MESSAGE,
    });
    return { success: true };
  }

  if (!message.mediaUrl) {
    await wati.sendMessage({
      phone: message.phone,
      message: templates.MEDIA_VALIDATION_ERROR("Impossible de télécharger le fichier"),
    });
    return { success: true };
  }

  try {
    // Download media from WATI - requires authentication for WATI file URLs
    const watiApiToken = process.env.WATI_API_TOKEN || '';
    const fetchHeaders: Record<string, string> = {};

    // Add auth for WATI URLs (they require Bearer token)
    if (message.mediaUrl.includes('wati.io')) {
      fetchHeaders['Authorization'] = `Bearer ${watiApiToken}`;
    }

    console.log('[WA_HANDLER] Downloading media from:', message.mediaUrl.substring(0, 80) + '...');
    const response = await fetch(message.mediaUrl, { headers: fetchHeaders });

    if (!response.ok) {
      console.error('[WA_HANDLER] Media download failed:', response.status, response.statusText);
      throw new Error(`Failed to download media: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') ||
      (message.type === 'video' ? 'video/mp4' : 'image/jpeg');
    const extension = message.type === 'video' ? 'mp4' : 'jpg';
    const filename = `billboard-whatsapp-${message.phone}-${Date.now()}.${extension}`;

    const upload = await uploadBuffer(
      BUCKETS.UPLOADS,
      buffer,
      filename,
      contentType
    );

    // Create content record (starts as pending_validation for moderation pipeline)
    const content = await prisma.billboardContent.create({
      data: {
        whatsappPhone: message.phone,
        whatsappName: session.name,
        mediaType: message.type,
        originalUrl: upload.url,
        status: 'pending_validation',
      },
    });

    // Add to pending media batch
    await addPendingMedia(message.phone, {
      contentId: content.id,
      mediaUrl: upload.url,
      mediaType: message.type as 'image' | 'video',
      receivedAt: new Date(),
    });

    // No per-file acknowledgment — batch processor sends one final message
    // Schedule batch processing (with debounce - resets timer if more media arrives)
    await scheduleBatchProcessing(message.phone, BATCH_DELAY_MS);

    console.log(`[WA_HANDLER] Added media to batch for ${message.phone}`);

    return { success: true };
  } catch (error) {
    console.error('[WA_HANDLER] Media upload error:', error);
    await wati.sendMessage({
      phone: message.phone,
      message: '❌ Erreur. Réessayez avec une autre image/vidéo.',
    });
    return { success: false, error: 'Media upload failed' };
  }
}

/**
 * Parse billboard selection using LLM (natural language understanding)
 */
async function parseBillboardSelectionWithLLM(
  userMessage: string,
  billboards: Array<{ id: string; name: string; address: string; pricePerSlot: number }>
): Promise<string[]> {
  if (!genAI) {
    console.warn('[WA_HANDLER] Gemini not configured, falling back to simple matching');
    return simpleBillboardMatch(userMessage, billboards);
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 500,
      responseMimeType: 'application/json',
    },
  });

  const billboardList = billboards.map((b, i) => `${i + 1}. "${b.name}" (${b.address})`).join('\n');

  const prompt = `Tu es un assistant qui aide à sélectionner des panneaux publicitaires.

PANNEAUX DISPONIBLES:
${billboardList}

MESSAGE DU CLIENT: "${userMessage}"

TÂCHE: Identifie quels panneaux le client veut sélectionner. Le client peut:
- Nommer directement: "Sea Plaza", "le panneau de la corniche"
- Dire "tous", "all", "tous les panneaux"
- Donner des numéros: "1", "le premier", "1 et 3"
- Utiliser des mots-clés: partie du nom, quartier, etc.

Retourne un JSON avec les IDs des panneaux sélectionnés:
{"selected_ids": ["id1", "id2"], "understood": true, "clarification": null}

Si tu ne comprends pas ou si aucun panneau ne correspond:
{"selected_ids": [], "understood": false, "clarification": "Message de clarification en français"}

PANNEAUX AVEC IDS:
${billboards.map(b => `- id: "${b.id}", name: "${b.name}"`).join('\n')}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    console.log('[WA_HANDLER] LLM billboard selection:', parsed);

    if (parsed.understood && parsed.selected_ids?.length > 0) {
      return parsed.selected_ids;
    }
    return [];
  } catch (error) {
    console.error('[WA_HANDLER] LLM parsing error:', error);
    return simpleBillboardMatch(userMessage, billboards);
  }
}

/**
 * Simple fallback billboard matching (without LLM)
 */
function simpleBillboardMatch(
  userMessage: string,
  billboards: Array<{ id: string; name: string; address: string }>
): string[] {
  const msg = userMessage.toLowerCase().trim();

  // Check for "all" / "tous"
  if (msg === 'tous' || msg === 'all' || msg.includes('tous les panneaux')) {
    return billboards.map(b => b.id);
  }

  // Check for number references
  const numberMatch = msg.match(/\d+/g);
  if (numberMatch) {
    const indices = numberMatch.map(n => parseInt(n) - 1);
    return indices
      .filter(i => i >= 0 && i < billboards.length)
      .map(i => billboards[i].id);
  }

  // Try to match by name
  const matches: string[] = [];
  for (const b of billboards) {
    const nameLower = b.name.toLowerCase();
    const addressLower = b.address.toLowerCase();
    if (nameLower.includes(msg) || msg.includes(nameLower) ||
        addressLower.includes(msg) || msg.includes(addressLower)) {
      matches.push(b.id);
    }
  }

  return matches;
}

/**
 * Handle billboard selection state
 */
async function handleBillboardSelection(
  message: WatiMessage,
  session: Session
): Promise<HandlerResult> {
  const wati = getWatiClient();

  // Need text or list_reply for selection
  if (message.type !== 'text' && message.type !== 'list_reply') {
    await sendBillboardList(message.phone);
    return { success: true };
  }

  // Get available billboards
  const billboards = await prisma.billboard.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, address: true, pricePerSlot: true },
  });

  let selectedIds: string[] = [];

  // Handle list reply (from interactive list)
  if (message.type === 'list_reply' && (message.listId || message.listTitle)) {
    console.log('[WA_HANDLER] List reply received:', { listId: message.listId, listTitle: message.listTitle });

    // WATI assigns its own IDs (0-0, 0-1) so we must use listTitle for matching
    const listTitle = message.listTitle || '';

    // Check for "all" selection
    if (listTitle.toLowerCase().includes('tous')) {
      selectedIds = billboards.map(b => b.id);
    } else {
      // Match by name (WATI returns the row title)
      const byName = billboards.find(b =>
        b.name.toLowerCase() === listTitle.toLowerCase() ||
        b.name.toLowerCase().includes(listTitle.toLowerCase()) ||
        listTitle.toLowerCase().includes(b.name.toLowerCase())
      );
      if (byName) {
        selectedIds = [byName.id];
        console.log('[WA_HANDLER] Matched billboard by title:', byName.name, byName.id);
      } else {
        console.log('[WA_HANDLER] No billboard matched for title:', listTitle);
      }
    }
  } else {
    // Handle text input - use LLM or simple matching
    const userSelection = message.text || '';
    if (!userSelection.trim()) {
      await sendBillboardList(message.phone);
      return { success: true };
    }
    console.log('[WA_HANDLER] Parsing billboard selection:', userSelection);
    selectedIds = await parseBillboardSelectionWithLLM(userSelection, billboards);
  }

  const selectedBillboards = billboards.filter(b => selectedIds.includes(b.id));

  if (selectedBillboards.length === 0) {
    await sendBillboardList(message.phone);
    return { success: true };
  }

  // Update session with selected billboards
  const billboardIds = selectedBillboards.map(b => b.id);
  await setSelectedBillboards(message.phone, billboardIds);

  // Get content IDs from session (batch or single)
  const contentIds = session.data.contentIds || (session.currentContentId ? [session.currentContentId] : []);

  if (contentIds.length === 0) {
    await wati.sendMessage({
      phone: message.phone,
      message: '❌ Erreur. Envoyez "reprendre" pour recommencer.',
    });
    return { success: false, error: 'No content ID in session' };
  }

  // Send schedule prompt with buttons (ETA shown after payment, not before)
  const billboardNames = selectedBillboards.map(b => b.name).join(', ');
  const scheduleMessage = templates.formatSchedulePrompt(billboardNames);

  await wati.sendButtons({
    phone: message.phone,
    body: scheduleMessage,
    buttons: [
      { type: 'reply', reply: { id: 'schedule_now', title: 'Maintenant' } },
      { type: 'reply', reply: { id: 'schedule_later', title: 'Programmer' } },
    ],
  });

  await updateSessionState(message.phone, 'AWAITING_SCHEDULE');

  return { success: true };
}

/**
 * Handle schedule selection state (Maintenant / Programmer)
 */
async function handleScheduleSelection(
  message: WatiMessage,
  session: Session
): Promise<HandlerResult> {
  const wati = getWatiClient();

  // Get selected billboard IDs and content IDs from session
  const billboardIds = session.data.selectedBillboardIds || [];
  const contentIds = session.data.contentIds || (session.currentContentId ? [session.currentContentId] : []);

  if (billboardIds.length === 0 || contentIds.length === 0) {
    await wati.sendMessage({
      phone: message.phone,
      message: '❌ Erreur. Envoyez "reprendre" pour recommencer.',
    });
    return { success: false, error: 'Missing session data' };
  }

  // Get billboard names for messages
  const billboards = await prisma.billboard.findMany({
    where: { id: { in: billboardIds } },
    select: { id: true, name: true },
  });
  const billboardNames = billboards.map(b => b.name).join(', ');

  // Determine user intent from button reply, text, or list reply
  const buttonId = (message.type === 'button_reply' && message.buttonId) ? message.buttonId.toLowerCase() : '';
  const buttonText = (message.type === 'button_reply' && message.buttonText) ? message.buttonText.toLowerCase() : '';
  const text = (message.type === 'text' && message.text) ? message.text.toLowerCase().trim() : '';
  const listTitle = (message.type === 'list_reply' && message.listTitle) ? message.listTitle.toLowerCase() : '';

  const isNow = buttonId.includes('now') || buttonId.includes('maintenant') ||
    buttonText.includes('maintenant') || text === 'maintenant' ||
    listTitle.includes('maintenant');

  const isLater = buttonId.includes('later') || buttonId.includes('programmer') ||
    buttonText.includes('programmer') || text === 'programmer' ||
    listTitle.includes('programmer');

  // Handle "Maintenant"
  if (isNow) {
    await wati.sendMessage({
      phone: message.phone,
      message: templates.SCHEDULE_NOW_CONFIRMATION,
    });

    // Clear scheduledFor and proceed to payment
    await updateSessionState(message.phone, 'AWAITING_SCHEDULE', { scheduledFor: undefined, awaitingDateInput: false });
    return await proceedToPayment(message.phone, session);
  }

  // Handle "Programmer"
  if (isLater) {
    await updateSessionState(message.phone, 'AWAITING_SCHEDULE', { awaitingDateInput: true });
    await wati.sendMessage({
      phone: message.phone,
      message: templates.SCHEDULE_DATE_PROMPT,
    });
    return { success: true };
  }

  // Handle free-text date input (when awaitingDateInput is true)
  if (session.data.awaitingDateInput && (message.type === 'text' && message.text)) {
    const parsed = parseFrenchDateTime(message.text.trim());

    if (!parsed) {
      await wati.sendMessage({
        phone: message.phone,
        message: templates.SCHEDULE_DATE_INVALID,
      });
      return { success: true };
    }

    const now = new Date();
    if (parsed <= now) {
      await wati.sendMessage({
        phone: message.phone,
        message: templates.SCHEDULE_DATE_PAST,
      });
      return { success: true };
    }

    const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (parsed > maxDate) {
      await wati.sendMessage({
        phone: message.phone,
        message: templates.SCHEDULE_DATE_TOO_FAR,
      });
      return { success: true };
    }

    // Valid date — store and proceed to payment
    await updateSessionState(message.phone, 'AWAITING_SCHEDULE', {
      scheduledFor: parsed.toISOString(),
      awaitingDateInput: false,
    });

    await wati.sendMessage({
      phone: message.phone,
      message: templates.formatScheduleLaterConfirmation(parsed, billboardNames),
    });

    return await proceedToPayment(message.phone, session, parsed);
  }

  // Unrecognized input — re-send buttons
  await wati.sendButtons({
    phone: message.phone,
    body: 'Choisissez une option:',
    buttons: [
      { type: 'reply', reply: { id: 'schedule_now', title: 'Maintenant' } },
      { type: 'reply', reply: { id: 'schedule_later', title: 'Programmer' } },
    ],
  });

  return { success: true };
}

/**
 * Proceed to payment — extracted from handleBillboardSelection
 * Creates payment and sends CTA button
 */
async function proceedToPayment(
  phone: string,
  session: Session,
  scheduledFor?: Date
): Promise<HandlerResult> {
  const wati = getWatiClient();

  const billboardIds = session.data.selectedBillboardIds || [];
  const contentIds = session.data.contentIds || (session.currentContentId ? [session.currentContentId] : []);

  if (billboardIds.length === 0 || contentIds.length === 0) {
    await wati.sendMessage({
      phone,
      message: '❌ Erreur. Envoyez "reprendre" pour recommencer.',
    });
    return { success: false, error: 'Missing session data for payment' };
  }

  // Calculate price
  const billboardSlots: Record<string, number> = {};
  billboardIds.forEach(id => {
    billboardSlots[id] = 1;
  });
  const pricing = await calculatePrice(billboardSlots);
  const totalAmount = pricing.totalCfa * contentIds.length;

  // Get billboard names
  const selectedBillboards = await prisma.billboard.findMany({
    where: { id: { in: billboardIds } },
    select: { id: true, name: true },
  });

  try {
    const payment = await createBillboardPayment({
      contentIds,
      billboardIds,
      amountCfa: totalAmount,
      whatsappPhone: phone,
      scheduledFor,
    });

    await setPaymentId(phone, payment.id);
    await updateSessionState(phone, 'AWAITING_PAYMENT');

    // Build recap message
    const billboardNames = selectedBillboards.map(b => b.name).join(', ');
    const contentWord = contentIds.length === 1 ? 'contenu' : 'contenus';
    const recapBody = `📋 *Récapitulatif*\n\n` +
      `📁 ${contentIds.length} ${contentWord}\n` +
      `📺 ${selectedBillboards.length > 1 ? 'Panneaux' : 'Panneau'}: ${billboardNames}\n` +
      `💰 Total: ${totalAmount} F CFA` +
      (pricing.discount > 0 ? ` (${pricing.discountReason})` : '') +
      (contentIds.length > 1 ? `\n\n_${pricing.totalCfa} F × ${contentIds.length} ${contentWord}_` : '');

    // Send CTA button for payment
    await wati.sendCTAButton({
      phone,
      body: recapBody,
      footer: 'Paiement sécurisé via Wave',
      buttonText: 'Payer maintenant',
      url: payment.checkoutUrl,
      templateName: 'payment',
      templateParams: {
        billboardName: billboardNames,
        price: totalAmount.toString(),
        paymentId: payment.id,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[WA_HANDLER] Payment creation failed:', error);
    await wati.sendMessage({
      phone,
      message: '❌ Erreur de paiement. Réessayez ou envoyez "support".',
    });
    return { success: false, error: 'Payment creation failed' };
  }
}

/**
 * Parse French date/time input into a Date
 * Handles: "maintenant", "demain 14h", "demain 14h30", "lundi 9h",
 *          "28/01 18h", "28/01 18:00", "28 jan 18h", "28 janvier 18h"
 * Returns null if unparseable
 */
function parseFrenchDateTime(input: string): Date | null {
  const text = input.toLowerCase().trim();

  if (text === 'maintenant' || text === 'now') {
    return new Date();
  }

  const now = new Date();

  // Extract time part — handles "14h", "14h30", "14:00", "9h"
  const timeMatch = text.match(/(\d{1,2})\s*[h:]\s*(\d{2})?/);
  if (!timeMatch) return null;

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2] || '0', 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  // Parse the date part
  let targetDate: Date | null = null;

  // "demain"
  if (text.includes('demain')) {
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1);
  }
  // "aujourd'hui" or "aujourdhui"
  else if (text.includes("aujourd")) {
    targetDate = new Date(now);
  }
  // Day of week
  else {
    const frenchDays: Record<string, number> = {
      'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4,
      'vendredi': 5, 'samedi': 6, 'dimanche': 0,
    };

    for (const [dayName, dayIndex] of Object.entries(frenchDays)) {
      if (text.includes(dayName)) {
        targetDate = new Date(now);
        const currentDay = targetDate.getDay();
        let daysAhead = dayIndex - currentDay;
        if (daysAhead <= 0) daysAhead += 7;
        targetDate.setDate(targetDate.getDate() + daysAhead);
        break;
      }
    }
  }

  // DD/MM format: "28/01"
  if (!targetDate) {
    const ddmmMatch = text.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
    if (ddmmMatch) {
      const day = parseInt(ddmmMatch[1], 10);
      const month = parseInt(ddmmMatch[2], 10) - 1; // JS months are 0-based
      targetDate = new Date(now.getFullYear(), month, day);
      // If the date is in the past, assume next year
      if (targetDate < now) {
        targetDate.setFullYear(targetDate.getFullYear() + 1);
      }
    }
  }

  // "DD mois" format: "28 jan", "28 janvier"
  if (!targetDate) {
    const frenchMonths: Record<string, number> = {
      'jan': 0, 'janvier': 0, 'fév': 1, 'fevrier': 1, 'février': 1,
      'mar': 2, 'mars': 2, 'avr': 3, 'avril': 3,
      'mai': 4, 'jun': 5, 'juin': 5, 'jul': 6, 'juillet': 6,
      'aoû': 7, 'aout': 7, 'août': 7, 'sep': 8, 'septembre': 8,
      'oct': 9, 'octobre': 9, 'nov': 10, 'novembre': 10, 'déc': 11, 'decembre': 11, 'décembre': 11,
    };

    for (const [monthName, monthIndex] of Object.entries(frenchMonths)) {
      if (text.includes(monthName)) {
        const dayMatch = text.match(/(\d{1,2})\s+/);
        if (dayMatch) {
          const day = parseInt(dayMatch[1], 10);
          targetDate = new Date(now.getFullYear(), monthIndex, day);
          if (targetDate < now) {
            targetDate.setFullYear(targetDate.getFullYear() + 1);
          }
        }
        break;
      }
    }
  }

  if (!targetDate) return null;

  targetDate.setHours(hours, minutes, 0, 0);
  return targetDate;
}

/**
 * Handle payment state
 */
async function handlePaymentState(
  message: WatiMessage,
  session: Session
): Promise<HandlerResult> {
  const wati = getWatiClient();

  // Check if user wants to retry payment or cancel
  if (message.type === 'text' && message.text) {
    const text = message.text.toLowerCase().trim();

    if (text === 'payer' || text === 'reprendre') {
      // Resend payment link
      if (session.data.paymentId) {
        const payment = await prisma.billboardPayment.findUnique({
          where: { id: session.data.paymentId },
          select: { checkoutUrl: true, status: true },
        });

        if (payment?.status === 'pending' && payment.checkoutUrl) {
          await wati.sendMessage({
            phone: message.phone,
            message: `${templates.PAYMENT_PROMPT}\n\n${templates.formatPaymentLink(payment.checkoutUrl)}`,
          });
          return { success: true };
        }
      }
    }
  }

  // Default: remind about payment
  await wati.sendMessage({
    phone: message.phone,
    message: `Votre commande est en attente de paiement.\n\nRépondez "payer" pour recevoir le lien de paiement, ou "annuler" pour annuler la commande.`,
  });

  return { success: true };
}

/**
 * Send billboard list to user using interactive list
 */
async function sendBillboardList(phone: string): Promise<void> {
  const wati = getWatiClient();

  const billboards = await prisma.billboard.findMany({
    where: {
      isActive: true,
      status: { not: 'maintenance' },
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      address: true,
      pricePerSlot: true,
      slotDurationSecs: true,
      _count: {
        select: {
          queueItems: {
            where: { status: 'queued' },
          },
        },
      },
    },
  });

  if (billboards.length === 0) {
    await wati.sendMessage({
      phone,
      message: 'Aucun panneau disponible. Réessayez plus tard.',
    });
    return;
  }

  // Use interactive list for billboard selection
  const listResult = await wati.sendList({
    phone,
    body: '✅ Fichier reçu! Choisissez où diffuser votre pub:',
    buttonText: 'Voir les panneaux',
    sections: [
      {
        title: 'Panneaux disponibles',
        rows: [
          // Add "All billboards" option first
          {
            id: 'all',
            title: '📺 Tous les panneaux',
            description: `${billboards.length} panneaux - Meilleure visibilité`,
          },
          // Add individual billboards
          ...billboards.map((b) => ({
            id: b.id,
            title: b.name,
            description: `${b.address} • ${b.pricePerSlot} F`,
          })),
        ],
      },
    ],
  });

  // Fallback to text if list fails
  if (!listResult.success) {
    let message = '✅ Fichier reçu! Choisissez un panneau:\n\n';
    billboards.forEach((b, i) => {
      message += `${i + 1}. ${b.name} - ${b.pricePerSlot} F\n`;
    });
    message += '\nRépondez avec le numéro ou "tous"';
    await wati.sendMessage({ phone, message });
  }
}

/**
 * Handle validation complete callback
 * Called by worker when validation passes
 */
export async function onValidationComplete(
  contentId: string,
  success: boolean,
  error?: string
): Promise<void> {
  const content = await prisma.billboardContent.findUnique({
    where: { id: contentId },
    select: { whatsappPhone: true },
  });

  if (!content?.whatsappPhone) return;

  const wati = getWatiClient();
  const phone = content.whatsappPhone;

  if (!success) {
    await wati.sendMessage({
      phone,
      message: templates.MEDIA_VALIDATION_ERROR(error || 'Validation échouée'),
    });
    return;
  }

  // Validation passed, wait for moderation
  // (moderation will trigger next step)
}

/**
 * Handle moderation complete callback
 * Called by worker when moderation completes
 */
export async function onModerationComplete(
  contentId: string,
  approved: boolean,
  reviewRequired: boolean,
  rejectionReason?: string
): Promise<void> {
  const content = await prisma.billboardContent.findUnique({
    where: { id: contentId },
    select: { whatsappPhone: true },
  });

  if (!content?.whatsappPhone) return;

  const wati = getWatiClient();
  const phone = content.whatsappPhone;

  if (!approved && !reviewRequired) {
    await wati.sendMessage({
      phone,
      message: templates.MEDIA_MODERATION_REJECTED(rejectionReason || 'Contenu non conforme'),
    });
    await resetSession(phone);
    return;
  }

  if (reviewRequired) {
    await wati.sendMessage({
      phone,
      message: templates.MEDIA_MODERATION_PENDING,
    });
    return;
  }

  // Moderation passed, send billboard selection
  await updateSessionState(phone, 'AWAITING_BILLBOARD');
  await wati.sendMessage({
    phone,
    message: templates.MEDIA_VALIDATION_SUCCESS,
  });
  await sendBillboardList(phone);
}

/**
 * Handle payment complete callback
 * Called by webhook when payment succeeds
 * Now supports batch processing with multiple content IDs
 */
export async function onPaymentComplete(
  contentId: string,
  paymentId: string
): Promise<void> {
  // Get payment to retrieve all content IDs (for batch)
  const payment = await prisma.billboardPayment.findUnique({
    where: { id: paymentId },
    select: { contentIds: true },
  });

  const contentIds = payment?.contentIds?.length ? payment.contentIds : [contentId];

  // Get first content for phone number
  const content = await prisma.billboardContent.findUnique({
    where: { id: contentIds[0] },
    select: { whatsappPhone: true },
  });

  if (!content?.whatsappPhone) return;

  const wati = getWatiClient();
  const phone = content.whatsappPhone;

  // Get queue positions for all contents
  const allPositions: Array<{
    billboardName: string;
    position: number;
    estimatedTime: Date | null;
  }> = [];

  for (const cId of contentIds) {
    const positions = await getContentQueuePositions(cId);
    allPositions.push(...positions.map(p => ({
      billboardName: p.billboardName,
      position: p.position,
      estimatedTime: p.estimatedPlayTime,
    })));
  }

  await updateSessionState(phone, 'CONFIRMED');

  // Send appropriate success message based on batch size
  if (contentIds.length > 1) {
    await wati.sendMessage({
      phone,
      message: `✅ Paiement confirmé pour ${contentIds.length} contenus !\n\nVos publicités sont en cours de traitement et seront diffusées bientôt.`,
    });
  } else {
    await wati.sendMessage({
      phone,
      message: templates.PAYMENT_SUCCESS,
    });
  }

  if (allPositions.length > 0) {
    await wati.sendMessage({
      phone,
      message: templates.formatQueueConfirmation(allPositions),
    });
  }
}

/**
 * Handle playback proof delivery
 * Called when content finishes playing
 */
export async function onPlaybackComplete(
  contentId: string,
  billboardName: string,
  proofUrl: string,
  playedAt: Date
): Promise<void> {
  const content = await prisma.billboardContent.findUnique({
    where: { id: contentId },
    select: { whatsappPhone: true },
  });

  if (!content?.whatsappPhone) return;

  const wati = getWatiClient();

  // Send proof
  await wati.sendMedia({
    phone: content.whatsappPhone,
    mediaUrl: proofUrl,
    caption: templates.formatPlaybackProof(billboardName, proofUrl, playedAt),
    mediaType: 'image',
  });
}

/**
 * Handle playback complete notification (text-only, no proof image)
 * Called when content finishes playing but no proof URL is available
 */
export async function onPlaybackCompleteNotify(
  contentId: string,
  billboardName: string,
  playedAt: Date
): Promise<void> {
  const content = await prisma.billboardContent.findUnique({
    where: { id: contentId },
    select: { whatsappPhone: true },
  });

  if (!content?.whatsappPhone) return;

  const wati = getWatiClient();
  await wati.sendMessage({
    phone: content.whatsappPhone,
    message: templates.formatPlaybackNotification(billboardName, playedAt),
  });
}
