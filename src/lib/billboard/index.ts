/**
 * Billboard Module - Digital Billboard Network for Seetu
 *
 * Enables content display on a network of digital billboards across Dakar.
 * Two entry points: WhatsApp (WATI) for individuals, Seetu platform for brands.
 */

export * from './validation';
export * from './moderation';
export * from './transcoding';
export * from './pricing';
export * from './queue-manager';

// Re-export types for convenience
export type {
  ValidationResult,
  MediaMetadata,
} from './validation';

export type {
  ModerationResult,
  ModerationCategory,
} from './moderation';

export type {
  TranscodeOptions,
  TranscodeResult,
} from './transcoding';

export type {
  PriceCalculation,
  BillboardPricing,
} from './pricing';

export type {
  QueueEntry,
  QueuePosition,
} from './queue-manager';
