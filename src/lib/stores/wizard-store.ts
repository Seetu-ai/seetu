import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type PresentationType = 'product_only' | 'on_model' | 'ghost';
export type SceneType = 'real_place' | 'ai_generated' | 'studio';

export interface ProductAnalysis {
  category: string;
  subcategory: string;
  name: string;
  colors: string[];
  materials: string[];
  style: string;
  description: string;
  suggestedContexts: string[];
  keywords?: string[];
}

export interface SelectedProduct {
  id: string;
  url: string;
  thumbnailUrl: string;
  name?: string;
  analysis?: ProductAnalysis;
  note?: string; // User's modification note: "Make it blue"
}

export interface SelectedModelAsset {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  priceUnits: number;
  modelGender: string | null;
  modelAgeRange: string | null;
  creatorName: string;
}

export interface SelectedLocationAsset {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  priceUnits: number;
  locationCity: string | null;
  locationType: string | null;
  creatorName: string;
}

export interface PresentationState {
  type: PresentationType;
  note?: string; // "Model smiling, casual pose"
  modelAsset?: SelectedModelAsset; // Selected marketplace model
}

export interface SceneState {
  type: SceneType;
  backgroundId?: string;
  backgroundUrl?: string;
  backgroundName?: string;
  note?: string; // "Night time, rainy"
  locationAsset?: SelectedLocationAsset; // Selected marketplace location
}

export interface MoodboardState {
  url?: string;
  note?: string; // "Copy golden hour lighting, Vogue aesthetic"
}

export interface CanvasState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface GeneratedImage {
  url: string;
  caption?: string;
  createdAt: string;
}

export interface WizardState {
  // Session
  sessionId: string | null;
  workspaceSlug: string | null;

  // Brand Selection
  selectedBrandId: string | null;

  // Step 1: Products
  products: SelectedProduct[];
  activeProductIndex: number;

  // Step 2: Presentation
  presentation: PresentationState;

  // Step 3: Scene
  scene: SceneState;

  // Step 4: Moodboard
  moodboard: MoodboardState;

  // Canvas
  canvas: CanvasState;

  // Wizard Navigation
  currentStep: number; // 1-4
  completedSteps: number[];

  // Generation
  isGenerating: boolean;
  generatedImages: GeneratedImage[];
  iterationFeedback: string; // Feedback for regeneration

  // Brand Style Toggle
  useBrandStyle: boolean; // Whether to inject Brand DNA into prompts

  // Actions
  setWorkspace: (slug: string) => void;
  setSessionId: (id: string) => void;
  setSelectedBrand: (brandId: string | null) => void;

  // Product actions
  addProduct: (product: Omit<SelectedProduct, 'note'>) => void;
  removeProduct: (id: string) => void;
  setActiveProduct: (index: number) => void;
  updateProductName: (id: string, name: string) => void;
  updateProductNote: (id: string, note: string) => void;
  updateProductAnalysis: (id: string, analysis: ProductAnalysis) => void;

  // Presentation actions
  setPresentation: (type: PresentationType) => void;
  setPresentationNote: (note: string) => void;
  setModelAsset: (asset: SelectedModelAsset | undefined) => void;

  // Scene actions
  setSceneType: (type: SceneType) => void;
  setBackground: (id: string, url: string, name: string, locationAsset?: SelectedLocationAsset) => void;
  setLocationAsset: (asset: SelectedLocationAsset | undefined) => void;
  setSceneNote: (note: string) => void;

  // Moodboard actions
  setMoodboardUrl: (url: string) => void;
  setMoodboardNote: (note: string) => void;

  // Canvas actions
  updateCanvas: (state: Partial<CanvasState>) => void;

  // Navigation actions
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  markStepComplete: (step: number) => void;

  // Generation actions
  setGenerating: (status: boolean) => void;
  addGeneratedImage: (url: string, caption?: string) => void;
  clearGeneratedImages: () => void;
  setIterationFeedback: (feedback: string) => void;

  // Brand style actions
  setUseBrandStyle: (use: boolean) => void;

  // Utility
  reset: () => void;
  getModifiers: () => Record<string, string>;
  getBrief: () => WizardBrief;
}

// The structured brief sent to the backend
export interface WizardBrief {
  product: {
    id: string;
    url: string;
    analysis?: ProductAnalysis;
    note?: string;
  } | null;
  presentation: PresentationState;
  scene: SceneState;
  moodboard: MoodboardState;
  canvas: CanvasState;
  iterationFeedback?: string; // Feedback from previous generation
  previousImageUrl?: string; // URL of the image to improve
  selectedBrandId?: string; // Selected brand for style/caption generation
  modelAssetId?: string; // Selected marketplace model asset ID
  locationAssetId?: string; // Selected marketplace location asset ID
}

// ═══════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════

const initialState = {
  sessionId: null,
  workspaceSlug: null,
  selectedBrandId: null,
  products: [],
  activeProductIndex: 0,
  presentation: {
    type: 'product_only' as PresentationType,
    note: undefined,
  },
  scene: {
    type: 'studio' as SceneType,
    backgroundId: undefined,
    backgroundUrl: undefined,
    backgroundName: undefined,
    note: undefined,
  },
  moodboard: {
    url: undefined,
    note: undefined,
  },
  canvas: {
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
  },
  currentStep: 1,
  completedSteps: [],
  isGenerating: false,
  generatedImages: [],
  iterationFeedback: '',
  useBrandStyle: true, // Enable brand style by default
};

// ═══════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════

export const useWizardStore = create<WizardState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Session
        setWorkspace: (slug) => set({ workspaceSlug: slug }),
        setSessionId: (id) => set({ sessionId: id }),
        setSelectedBrand: (brandId) => set({ selectedBrandId: brandId }),

        // Product actions
        addProduct: (product) =>
          set((state) => ({
            products: [...state.products, { ...product, note: undefined }],
            activeProductIndex: state.products.length,
            generatedImages: [], // Clear old generations when adding new product
          })),

        removeProduct: (id) =>
          set((state) => ({
            products: state.products.filter((p) => p.id !== id),
            activeProductIndex: Math.max(0, state.activeProductIndex - 1),
            generatedImages: [], // Clear generations when removing product
          })),

        setActiveProduct: (index) =>
          set((state) => ({
            activeProductIndex: index,
            generatedImages: state.activeProductIndex !== index ? [] : state.generatedImages, // Clear if switching products
          })),

        updateProductName: (id, name) =>
          set((state) => ({
            products: state.products.map((p) =>
              p.id === id ? { ...p, name } : p
            ),
          })),

        updateProductNote: (id, note) =>
          set((state) => ({
            products: state.products.map((p) =>
              p.id === id ? { ...p, note } : p
            ),
          })),

        updateProductAnalysis: (id, analysis) =>
          set((state) => ({
            products: state.products.map((p) =>
              p.id === id ? { ...p, analysis, name: analysis.name } : p
            ),
          })),

        // Presentation actions
        setPresentation: (type) =>
          set((state) => ({
            presentation: {
              ...state.presentation,
              type,
              // Clear model asset if not on_model
              modelAsset: type === 'on_model' ? state.presentation.modelAsset : undefined,
            },
          })),

        setPresentationNote: (note) =>
          set((state) => ({
            presentation: { ...state.presentation, note },
          })),

        setModelAsset: (asset) =>
          set((state) => ({
            presentation: { ...state.presentation, modelAsset: asset },
          })),

        // Scene actions
        setSceneType: (type) =>
          set((state) => ({
            scene: {
              ...state.scene,
              type,
              // Clear location asset if switching scene type
              locationAsset: undefined,
            },
          })),

        setBackground: (id, url, name, locationAsset) =>
          set((state) => ({
            scene: {
              ...state.scene,
              backgroundId: id,
              backgroundUrl: url,
              backgroundName: name,
              locationAsset: locationAsset,
            },
          })),

        setLocationAsset: (asset) =>
          set((state) => ({
            scene: { ...state.scene, locationAsset: asset },
          })),

        setSceneNote: (note) =>
          set((state) => ({
            scene: { ...state.scene, note },
          })),

        // Moodboard actions
        setMoodboardUrl: (url) =>
          set((state) => ({
            moodboard: { ...state.moodboard, url },
          })),

        setMoodboardNote: (note) =>
          set((state) => ({
            moodboard: { ...state.moodboard, note },
          })),

        // Canvas actions
        updateCanvas: (canvasState) =>
          set((state) => ({
            canvas: { ...state.canvas, ...canvasState },
          })),

        // Navigation actions
        goToStep: (step) => set({ currentStep: step }),

        nextStep: () =>
          set((state) => {
            const next = Math.min(state.currentStep + 1, 5);
            return {
              currentStep: next,
              completedSteps: state.completedSteps.includes(state.currentStep)
                ? state.completedSteps
                : [...state.completedSteps, state.currentStep],
            };
          }),

        prevStep: () =>
          set((state) => ({
            currentStep: Math.max(state.currentStep - 1, 1),
          })),

        markStepComplete: (step) =>
          set((state) => ({
            completedSteps: state.completedSteps.includes(step)
              ? state.completedSteps
              : [...state.completedSteps, step],
          })),

        // Generation actions
        setGenerating: (status) => set({ isGenerating: status }),

        addGeneratedImage: (url, caption) =>
          set((state) => ({
            generatedImages: [
              ...state.generatedImages,
              { url, caption, createdAt: new Date().toISOString() },
            ],
          })),

        clearGeneratedImages: () => set({ generatedImages: [] }),

        setIterationFeedback: (feedback) => set({ iterationFeedback: feedback }),

        // Brand style actions
        setUseBrandStyle: (use) => set({ useBrandStyle: use }),

        // Utility
        reset: () => set(initialState),

        getModifiers: () => {
          const state = get();
          const modifiers: Record<string, string> = {};

          const activeProduct = state.products[state.activeProductIndex];
          if (activeProduct?.note) {
            modifiers.product_note = activeProduct.note;
          }
          if (state.presentation.note) {
            modifiers.presentation_note = state.presentation.note;
          }
          if (state.scene.note) {
            modifiers.scene_note = state.scene.note;
          }
          if (state.moodboard.note) {
            modifiers.style_note = state.moodboard.note;
          }

          return modifiers;
        },

        getBrief: () => {
          const state = get();
          const activeProduct = state.products[state.activeProductIndex];
          const latestImage = state.generatedImages[state.generatedImages.length - 1];

          return {
            product: activeProduct
              ? {
                  id: activeProduct.id,
                  url: activeProduct.url,
                  analysis: activeProduct.analysis,
                  note: activeProduct.note,
                }
              : null,
            presentation: state.presentation,
            scene: state.scene,
            moodboard: state.moodboard,
            canvas: state.canvas,
            iterationFeedback: state.iterationFeedback || undefined,
            previousImageUrl: latestImage?.url || undefined,
            selectedBrandId: state.selectedBrandId || undefined,
            modelAssetId: state.presentation.modelAsset?.id || undefined,
            locationAssetId: state.scene.locationAsset?.id || undefined,
          };
        },
      }),
      {
        name: 'seetu-wizard-storage',
        partialize: (state) => ({
          // Persist wizard state and generated images
          products: state.products,
          presentation: state.presentation,
          scene: state.scene,
          moodboard: state.moodboard,
          canvas: state.canvas,
          currentStep: state.currentStep,
          completedSteps: state.completedSteps,
          generatedImages: state.generatedImages,
          selectedBrandId: state.selectedBrandId,
        }),
      }
    ),
    { name: 'WizardStore' }
  )
);
