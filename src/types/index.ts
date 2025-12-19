import type {
  User,
  Brand,
  Product,
  Shoot,
  GenerationJob,
  Template,
  TemplatePack,
  CreditLedger,
  Transaction,
  ExportJob,
  BusinessType,
  ShootStatus,
  JobStatus,
  JobMode,
  JobType,
} from '@prisma/client';

// Re-export Prisma types
export type {
  User,
  Brand,
  Product,
  Shoot,
  GenerationJob,
  Template,
  TemplatePack,
  CreditLedger,
  Transaction,
  ExportJob,
  BusinessType,
  ShootStatus,
  JobStatus,
  JobMode,
  JobType,
};

// Extended types with relations
export interface UserWithBrands extends User {
  brands: Brand[];
}

export interface BrandWithProducts extends Brand {
  products: Product[];
}

export interface ShootWithJobs extends Shoot {
  jobs: GenerationJob[];
}

export interface GenerationJobWithRelations extends GenerationJob {
  product?: Product | null;
  template: Template;
}

export interface TemplatePackWithTemplates extends TemplatePack {
  templates: Template[];
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Credit display types
export interface CreditBalance {
  units: number;
  credits: number;
}

export interface CreditHistoryEntry extends CreditLedger {
  deltaCredits: number;
  balanceAfterCredits: number;
}

// Generation params
export interface GenerationParams {
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
  fidelityPercent: number;
  seedOverride?: number;
  mode: JobMode;
}

// Fidelity mapping result
export interface FidelityParams {
  guidanceScale: number;
  negativePromptAdditions: string[];
  promptModifiers: string[];
}

// Template variable types
export interface TemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'select' | 'color' | 'number';
  default?: string | number;
  options?: string[];
  required?: boolean;
}

// Watermark settings
export interface WatermarkSettings {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  scale: number;
}

// User settings
export interface UserSettings {
  watermark?: WatermarkSettings;
  defaultAspectRatio?: string;
  defaultFidelity?: number;
}

// Stats types
export interface UserStats {
  currentMonth: {
    creditsUsed: number;
    transactions: number;
    shoots: number;
    images: number;
  };
  history: {
    month: string;
    creditsUsed: number;
  }[];
}

// Quick Generate types
export interface QuickGenerateRequest {
  productId: string;
  templateId: string;
  aspectRatio: string;
  mode?: JobMode;
}

// Multi-format export types
export interface MultiFormatRequest {
  formats: ('1:1' | '4:5' | '9:16')[];
}

// Session user type
export interface SessionUser {
  id: string;
  authId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

// Permissions type (for role-based access)
export interface Permissions {
  canView: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canPurchaseCredits: boolean;
  canManageTeam: boolean;
  canEditSettings: boolean;
  canDeleteWorkspace: boolean;
  roleName: string;
  roleDescription: string;
}

// ═══════════════════════════════════════════════════════════════
// BRAND DNA TYPES - For AI Generation Pipeline
// ═══════════════════════════════════════════════════════════════

export type SocialSource = 'instagram' | 'tiktok' | 'facebook' | 'photos';

// Lighting styles for ControlNet/LoRA
export type LightingStyle = 'studio_soft' | 'studio_hard' | 'natural_sunlight' | 'golden_hour' | 'neon_night' | 'overcast_diffused';

// Framing/composition styles
export type FramingStyle = 'minimalist_centered' | 'flat_lay' | 'low_angle_lifestyle' | 'close_up_detail' | 'chaotic_lifestyle' | 'editorial_fashion';

// Texture bias for material rendering
export type TextureBias = 'clean_matte' | 'glossy_polished' | 'gritty_film' | 'organic_natural' | 'high_contrast';

// Human presence in photos
export type HumanPresence = 'product_only' | 'hands_only' | 'partial_body' | 'full_body' | 'face_included';

// Voice tone for captions
export type VoiceTone = 'professional' | 'playful' | 'inspiring' | 'luxurious' | 'friendly';

// Language style
export type LanguageStyle = 'fr_sn_urban' | 'fr_sn_wolof_mix' | 'fr_classic' | 'en_casual' | 'en_professional';

export interface BrandPalette {
  primary: string;   // Main brand color hex
  secondary: string; // Secondary brand color hex
  accent: string;    // Accent/pop color hex
  primaryName?: string;
  secondaryName?: string;
  accentName?: string;
}

export interface PhotographySettings {
  lighting: LightingStyle;
  framing: FramingStyle;
  texture_bias: TextureBias;
  human_presence: HumanPresence;
  demographic?: string; // e.g., "Senegalese youth", "African women professionals"
}

export interface VoiceProfile {
  tone: VoiceTone;
  language_style: LanguageStyle;
}

// ═══════════════════════════════════════════════════════════════
// VERBAL DNA TYPES - For Caption Generation
// ═══════════════════════════════════════════════════════════════

export type CaptionStructure = 'storytelling' | 'bullet_points' | 'short_punchline' | 'question_hook' | 'quote_based';
export type AddressStyle = 'tutoiement' | 'vouvoiement' | 'mixed';
export type PrimaryLanguage = 'english' | 'french' | 'french_wolof_mix' | 'wolof_dominant' | 'arabic_mix';

export interface VerbalDNA {
  // 1. Voice & Tone (The "Personality")
  tone: string; // "Warm & Playful", "Professional & Premium", "Hype & Energetic"
  tone_adjectives: string[]; // ["Friendly", "Luxurious", "Casual"]
  address_style: AddressStyle; // Tutoiement vs Vouvoiement (for French)

  // 2. Primary Language Detection (CRITICAL for multilingual markets)
  primary_language: PrimaryLanguage; // The main language they write in
  language_mix: string; // Detailed description: "English with occasional French words"
  wolof_expressions?: string[]; // ["Naka suba", "Jéréjef", "Degglu"]

  // 3. Emoji Fingerprint (Each brand has their specific set)
  emoji_palette: string[]; // Top 5-8 signature emojis
  emoji_frequency: 'heavy' | 'moderate' | 'minimal' | 'none';

  // 4. Structural Habits
  caption_structure: CaptionStructure;
  typical_length: 'short' | 'medium' | 'long'; // short=<50 words, medium=50-100, long=100+
  formatting_quirks: string; // "Uses bullet points", "ALL CAPS for emphasis", "Line breaks between sentences"
  uses_hashtags_in_caption: boolean;

  // 5. Recurring Elements
  signature_hashtags: string[]; // ["DakarFashion", "MadeInSenegal"]
  signature_phrases?: string[]; // Catchphrases they often use: "Link in bio", "DM to order"
  cta_style: string; // "Soft" vs "Aggressive" - How they sell

  // 6. CRITICAL: Few-Shot Exemplars (The most important part!)
  // These are the 3 BEST actual captions that represent their style
  // Used to teach the AI by example - this is what makes captions sound authentic
  exemplars: string[]; // 3 best real captions from their feed

  // 7. All example captions (for reference)
  example_captions: string[]; // All extracted captions

  // 8. Generated Example (proof the AI can mimic them)
  sample_caption?: string;
}

export interface BrandDNA {
  // Source info
  source: SocialSource;
  socialHandle?: string;
  sourceImageUrls: string[];
  analyzedAt: string; // ISO date

  // 1. The Palette (For UI & Image Toning)
  palette: BrandPalette;

  // 2. The Vibe (For Text Prompting) - Visual tokens to inject into prompts
  visual_tokens: string[]; // ["minimalist", "luxury", "warm tones", "high contrast", "african heritage"]

  // 3. The Technicals (For ControlNet/LoRA)
  photography_settings: PhotographySettings;

  // 4. The Voice (For Caption Generation) - Basic settings
  voice_profile: VoiceProfile;

  // 5. Verbal DNA (For Advanced Caption Generation)
  verbal_dna?: VerbalDNA;

  // Summary for display
  vibe_summary: string; // Human readable: "Minimalist Luxury with African Heritage"

  // French analysis summary for user (makes them feel understood)
  analysis_summary_fr?: string; // "Votre marque dégage un style minimaliste et luxueux..."
}

// Backwards compatible alias
export type BrandIdentity = BrandDNA;

// Legacy interface for backwards compatibility
export interface BrandColor {
  hex: string;
  name: string;
}

// Updated user settings to include brand DNA
export interface UserSettingsWithBrand extends UserSettings {
  brandIdentity?: BrandDNA;
}

// Social media scraping response from APIfy
export interface SocialScrapeResult {
  success: boolean;
  platform: SocialSource;
  handle: string;
  profilePicUrl?: string;
  bio?: string;
  postsCount?: number;
  followersCount?: number;
  images: string[];
  captions: string[]; // Post captions for Verbal DNA analysis
  error?: string;
}

// Brand analysis request/response
export interface BrandAnalysisRequest {
  imageUrls: string[];
  source: SocialSource;
  socialHandle?: string;
}

export interface BrandAnalysisResponse {
  success: boolean;
  brandDNA?: BrandDNA;
  error?: string;
}

// Re-export ProductAnalysis from vision
export type { ProductAnalysis } from '@/lib/vision';
