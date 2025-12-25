# SEETU Mobile App Specification

## 1. Overview

**App Name**: Seetu
**Tagline**: Studio Photo IA pour l'Afrique
**Primary Market**: Senegal (French-speaking West Africa)
**Platform**: iOS + Android (React Native + Expo)

### Goals
1. Allow users to generate professional product photos on mobile
2. Enable creators (models, photographers, location owners) to manage assets
3. Provide a seamless mobile-first experience for African entrepreneurs

---

## 2. Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | React Native + Expo SDK 52+ | Cross-platform, Expo ecosystem |
| Navigation | Expo Router (file-based) | Matches Next.js mental model |
| State | Zustand | Same as web, code sharing |
| Data Fetching | TanStack Query (React Query) | Better mobile caching than SWR |
| Auth | Supabase Auth + Expo SecureStore | Native token storage |
| Storage | Expo FileSystem + Supabase Storage | Offline image caching |
| Camera | Expo Camera + ImagePicker | Product photo capture |
| Notifications | Expo Notifications + Supabase Realtime | Generation alerts |
| Payments | NabooPay WebView / Deep Link | Wave, Orange Money |
| Analytics | Expo Analytics + Mixpanel | Usage tracking |

---

## 3. App Structure

```
seetu-mobile/
├── app/                      # Expo Router screens
│   ├── (auth)/               # Auth screens (not logged in)
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/               # Main app (logged in)
│   │   ├── index.tsx         # Home / Dashboard
│   │   ├── studio.tsx        # AI Studio
│   │   ├── gallery.tsx       # My Generations
│   │   ├── creator.tsx       # Creator Dashboard
│   │   └── profile.tsx       # Settings & Profile
│   ├── studio/               # Studio flow screens
│   │   ├── products.tsx      # Step 1: Select/Upload Product
│   │   ├── presentation.tsx  # Step 2: Presentation Type
│   │   ├── scene.tsx         # Step 3: Background/Location
│   │   ├── generate.tsx      # Step 4: Generate & Results
│   │   └── result/[id].tsx   # View generation result
│   ├── creator/              # Creator screens
│   │   ├── register.tsx      # Become a creator
│   │   ├── assets/           # Asset management
│   │   │   ├── index.tsx     # List assets
│   │   │   ├── new.tsx       # Create asset
│   │   │   └── [id].tsx      # Asset detail
│   │   └── earnings.tsx      # Earnings & payouts
│   └── _layout.tsx           # Root layout
├── components/
│   ├── ui/                   # Shared UI components
│   ├── studio/               # Studio-specific components
│   └── creator/              # Creator-specific components
├── lib/
│   ├── api/                  # API client functions
│   ├── stores/               # Zustand stores (shared with web)
│   ├── supabase.ts           # Supabase client
│   └── utils.ts              # Helpers
├── hooks/                    # Custom hooks
├── constants/                # App constants
└── assets/                   # Images, fonts
```

---

## 4. Screens & Features

### 4.1 Authentication

| Screen | Features |
|--------|----------|
| **Login** | Email/password, Magic link, Biometric unlock |
| **Signup** | Email, Password, Name, Business type selector |
| **Forgot Password** | Email reset flow |

**Auth Flow**:
```
App Launch
    │
    ├─ Has valid token? ─── Yes ──→ (tabs)/index
    │
    └─ No ──→ (auth)/login
```

### 4.2 Home Dashboard

| Section | Content |
|---------|---------|
| **Header** | User avatar, Credits balance, Notifications bell |
| **Quick Actions** | "New Photo" CTA, Recent products |
| **Recent Generations** | Horizontal scroll of last 10 images |
| **Credits Card** | Balance + "Buy Credits" button |

### 4.3 AI Studio (Core Feature)

**4-Step Wizard** (matches web):

| Step | Screen | Features |
|------|--------|----------|
| 1 | **Products** | Camera capture, Gallery picker, Recent products |
| 2 | **Presentation** | Product only / On model / Ghost mannequin |
| 3 | **Scene** | Real place search, Studio backgrounds, AI creative |
| 4 | **Generate** | Moodboard upload, Style notes, Cost preview, Generate button |

**Post-Generation**:
- Loading animation with progress
- Result display with zoom/pan
- Download to device
- Share to Instagram/WhatsApp
- Iterate with feedback

### 4.4 Gallery

| Feature | Description |
|---------|-------------|
| Grid view | All generated images |
| Filters | By date, by product, by brand |
| Search | By product name |
| Actions | Download, Share, Delete, Re-edit |

### 4.5 Creator Dashboard

| Screen | Features |
|--------|----------|
| **Creator Home** | Earnings summary, Recent usages, Quick stats |
| **My Assets** | List of submitted assets with status badges |
| **New Asset** | Multi-step form: Info → Images → Submit |
| **Asset Detail** | View, Edit (if draft), Submit, Delete |
| **Earnings** | Earnings history, Payout requests |

### 4.6 Profile & Settings

| Section | Options |
|---------|---------|
| **Account** | Name, Email, Avatar |
| **Brand** | View/Edit brand DNA |
| **Credits** | Balance, History, Purchase |
| **Notifications** | Push notification preferences |
| **Creator Mode** | Toggle, Payout settings |
| **Support** | Help, Contact, FAQ |
| **Legal** | Terms, Privacy |

---

## 5. API Integration

### 5.1 Base Configuration

The backend API supports Bearer token authentication for mobile clients. All API routes accept the `Authorization: Bearer <token>` header.

```typescript
// lib/api/client.ts
import { supabase } from '../supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://seetu.ai/api/v1';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// For file uploads (multipart/form-data)
export async function uploadFile<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type - let fetch handle multipart boundary
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
```

### 5.2 Key API Calls

```typescript
// lib/api/upload.ts

// Upload an image file (returns Supabase Storage URL)
export async function uploadImage(file: ImagePickerAsset) {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.mimeType || 'image/jpeg',
    name: file.fileName || 'image.jpg',
  } as any);

  return uploadFile<{ url: string; path: string }>('/upload', formData);
}

// lib/api/products.ts

// Create a product (after uploading image)
export async function createProduct(data: {
  imageUrl: string;
  name?: string;
  brandId?: string;
}) {
  return apiClient<{ product: Product }>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Analyze a product image (accepts JSON with imageUrl)
export async function analyzeProduct(imageUrl: string) {
  return apiClient<{ analysis: ProductAnalysis }>('/studio/analyze', {
    method: 'POST',
    body: JSON.stringify({ imageUrl }),
  });
}

// lib/api/studio.ts

// Generate image
export async function generateImage(brief: WizardBrief) {
  return apiClient<{
    outputUrl: string;
    caption?: string;
    creditsCost: number; // Cost in units (100 units = 1 credit)
  }>('/studio/generate', {
    method: 'POST',
    body: JSON.stringify(brief),
  });
}

// Get backgrounds (includes marketplace locations)
export async function getBackgrounds(type?: 'real_place' | 'studio' | 'ai_generated') {
  const params = type ? `?type=${type}` : '';
  return apiClient<{ backgrounds: Background[] }>(`/studio/backgrounds${params}`);
}

// lib/api/credits.ts

// Get available credit packs (public endpoint)
export async function getCreditPacks() {
  const response = await fetch(`${API_BASE}/credits/packs`);
  return response.json() as Promise<{
    packs: CreditPack[];
    currency: string;
  }>;
}

// Purchase credits (returns checkout URL)
export async function purchaseCredits(packId: string) {
  return apiClient<{
    checkoutUrl: string;
    orderId: string;
  }>('/credits/purchase', {
    method: 'POST',
    body: JSON.stringify({ packId }),
  });
}

// Check purchase status
export async function checkPurchaseStatus(orderId: string) {
  return apiClient<{
    orderId: string;
    status: 'pending' | 'completed' | 'failed';
  }>(`/credits/purchase?orderId=${orderId}`);
}

// lib/api/gallery.ts

// Get unified generations (studio + shoots) with cursor-based pagination
export async function getGenerations(params?: {
  limit?: number;
  cursor?: string; // Composite cursor: "ISO_DATE|SOURCE_TYPE|SOURCE_ID"
  type?: 'studio' | 'shoot' | 'all';
  brandId?: string;
}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params || {}).filter(([_, v]) => v != null))
  ).toString();
  return apiClient<{
    generations: Generation[];
    pagination: {
      limit: number;
      hasMore: boolean;
      nextCursor: string | null; // Composite cursor - pass directly to next request
      total: number;
    };
  }>(`/generations?${query}`);
}

// Usage for infinite scroll:
// const { generations, pagination } = await getGenerations({ limit: 20 });
// if (pagination.hasMore) {
//   // nextCursor is opaque - just pass it back to the next request
//   const more = await getGenerations({ limit: 20, cursor: pagination.nextCursor });
// }
```

### 5.3 Endpoints Used by Mobile

| Endpoint | Method | Description |
|----------|--------|-------------|
| **Auth & User** | | |
| `/user` | GET | Get current user profile + credits |
| `/credits` | GET | Get credit balance and history |
| `/credits/packs` | GET | Get available credit packs (public) |
| `/credits/purchase` | POST | Initiate credit purchase |
| `/credits/purchase` | GET | Check purchase status (query: `orderId`) |
| **Brands & Products** | | |
| `/brands` | GET/POST | List brands, Create brand |
| `/brands/[id]` | GET | Get brand details |
| `/products` | GET/POST | List products, Create product (with imageUrl) |
| `/products/[id]` | GET/DELETE | Get/Delete product |
| `/upload` | POST | Upload image (multipart/form-data) |
| **Studio** | | |
| `/studio/analyze` | POST | Analyze product (JSON `{imageUrl}` or form-data) |
| `/studio/detect` | POST | Detect objects in image |
| `/studio/segment` | POST | Remove background |
| `/studio/backgrounds` | GET | Get backgrounds (query: `type`) + marketplace locations |
| `/studio/generate` | POST | Generate image |
| **Gallery** | | |
| `/generations` | GET | Unified gallery with cursor pagination (query: `limit`, `cursor`, `type`, `brandId`) |
| **Marketplace** | | |
| `/marketplace` | GET | Browse all marketplace assets (query: `type=MODEL_PROFILE` or `type=LOCATION`) |
| **Creator** | | |
| `/creators/me` | GET | Get creator profile |
| `/creators/register` | POST | Become a creator |
| `/assets` | GET/POST | List/Create assets |
| `/assets/[id]` | GET/PUT/DELETE | Manage asset |
| `/assets/[id]/submit` | POST | Submit for review |

> **Note**: `/marketplace/models` and `/marketplace/locations` are not separate endpoints. Use `/marketplace?type=MODEL_PROFILE` or `/marketplace?type=LOCATION` instead.

### 5.4 Recommended Upload Flow

For mobile clients, follow this pattern for product uploads:

```typescript
// 1. Upload image to get Supabase Storage URL
const { url } = await uploadImage(pickedImage);

// 2. Analyze the product
const { analysis } = await analyzeProduct(url);

// 3. Create product with analysis
const { product } = await createProduct({
  imageUrl: url,
  name: analysis.name,
});

// 4. Continue to studio wizard with product
```

---

## 6. Authentication

### 6.1 Supabase Setup

```typescript
// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### 6.2 Auth State Management

```typescript
// lib/stores/auth-store.ts
import { create } from 'zustand';
import { supabase } from '../supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await apiClient<{ user: User }>('/user');
      set({ user: data.user, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data } = await apiClient<{ user: User }>('/user');
    set({ user: data.user });
  },

  signUp: async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
```

---

## 7. Offline Support

### 7.1 Image Caching

```typescript
// lib/cache/image-cache.ts
import * as FileSystem from 'expo-file-system';

const CACHE_DIR = `${FileSystem.cacheDirectory}images/`;

export async function cacheImage(url: string): Promise<string> {
  const filename = url.split('/').pop()!;
  const localUri = `${CACHE_DIR}${filename}`;

  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) return localUri;

  await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  await FileSystem.downloadAsync(url, localUri);

  return localUri;
}
```

### 7.2 Offline Queue

```typescript
// lib/offline/queue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedAction {
  id: string;
  endpoint: string;
  method: string;
  body: any;
  createdAt: number;
}

export const offlineQueue = {
  async add(action: Omit<QueuedAction, 'id' | 'createdAt'>) {
    const queue = await this.getQueue();
    queue.push({
      ...action,
      id: Date.now().toString(),
      createdAt: Date.now(),
    });
    await AsyncStorage.setItem('offline_queue', JSON.stringify(queue));
  },

  async process() {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    const queue = await this.getQueue();
    for (const action of queue) {
      try {
        await apiClient(action.endpoint, {
          method: action.method,
          body: JSON.stringify(action.body),
        });
        await this.remove(action.id);
      } catch (error) {
        console.error('Failed to process queued action:', error);
      }
    }
  },

  async getQueue(): Promise<QueuedAction[]> {
    const data = await AsyncStorage.getItem('offline_queue');
    return data ? JSON.parse(data) : [];
  },

  async remove(id: string) {
    const queue = await this.getQueue();
    const filtered = queue.filter((a) => a.id !== id);
    await AsyncStorage.setItem('offline_queue', JSON.stringify(filtered));
  },
};
```

---

## 8. Push Notifications

### 8.1 Setup

```typescript
// lib/notifications/setup.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '../supabase';

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  // Save token to user profile
  await supabase.from('user_push_tokens').upsert({
    user_id: (await supabase.auth.getUser()).data.user?.id,
    token: token.data,
    platform: Device.osName,
  });

  return token.data;
}
```

### 8.2 Notification Types

| Type | Trigger | Content |
|------|---------|---------|
| `generation_complete` | Image generation finished | "Your photo is ready!" |
| `asset_approved` | Creator asset approved | "Your asset is now live!" |
| `asset_rejected` | Creator asset rejected | "Your asset needs changes" |
| `payout_sent` | Creator payout processed | "Payment of X FCFA sent!" |
| `low_credits` | Credits < 1 | "Running low on credits" |

---

## 9. Native Features

### 9.1 Camera Integration

```typescript
// components/ProductCamera.tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export function ProductCamera({ onCapture }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      onCapture(photo);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      onCapture(result.assets[0]);
    }
  };

  // ... render camera UI
}
```

### 9.2 Share Integration

```typescript
// lib/share.ts
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export async function shareImage(url: string, caption?: string) {
  const localUri = await cacheImage(url);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localUri, {
      mimeType: 'image/png',
      dialogTitle: 'Share your Seetu photo',
    });
  }
}

// Share to specific app (WhatsApp, Instagram)
export async function shareToApp(url: string, app: 'whatsapp' | 'instagram') {
  const localUri = await cacheImage(url);

  if (app === 'instagram') {
    // Instagram Stories share
    const instagramUrl = `instagram-stories://share?backgroundImage=${encodeURIComponent(localUri)}`;
    await Linking.openURL(instagramUrl);
  } else if (app === 'whatsapp') {
    await Sharing.shareAsync(localUri, {
      mimeType: 'image/png',
    });
  }
}
```

---

## 10. Payments (Mobile)

### 10.1 NabooPay Integration

```typescript
// lib/payments/credits.ts
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { apiClient } from './client';
import { useAuthStore } from '../stores/auth-store';

// Fetch available credit packs
export async function getCreditPacks() {
  const response = await fetch(`${API_BASE}/credits/packs`);
  return response.json() as Promise<{
    packs: Array<{
      id: string;
      name: string;
      credits: number;
      priceFcfa: number;
      pricePerCredit: number;
      isBestValue: boolean;
      savingsPercent: number;
    }>;
    currency: string;
    unitsPerCredit: number;
  }>;
}

// Initiate credit purchase
export async function purchaseCredits(packId: string) {
  // Create transaction on backend
  const { checkoutUrl, orderId } = await apiClient<{
    checkoutUrl: string;
    orderId: string;
    externalRef: string;
  }>('/credits/purchase', {
    method: 'POST',
    body: JSON.stringify({
      packId,
      successUrl: Linking.createURL('payment-success'),
      errorUrl: Linking.createURL('payment-error'),
    }),
  });

  // Open NabooPay in browser
  const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
    showInRecents: true,
    createTask: false,
  });

  return { orderId, result };
}

// Check payment status (poll after returning from browser)
export async function checkPurchaseStatus(orderId: string) {
  return apiClient<{
    orderId: string;
    status: 'pending' | 'completed' | 'failed';
    pack: { credits: number; priceFcfa: number };
    completedAt: string | null;
  }>(`/credits/purchase?orderId=${orderId}`);
}

// Usage in component
export function usePurchaseCredits() {
  const [isPurchasing, setIsPurchasing] = useState(false);

  const purchase = async (packId: string) => {
    setIsPurchasing(true);
    try {
      const { orderId } = await purchaseCredits(packId);

      // Poll for completion after browser closes
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds

      const checkStatus = async () => {
        const { status } = await checkPurchaseStatus(orderId);
        if (status === 'completed') {
          // Refresh user data to get new credit balance
          await useAuthStore.getState().refreshUser();
          return true;
        }
        if (status === 'failed' || attempts >= maxAttempts) {
          return false;
        }
        attempts++;
        await new Promise(r => setTimeout(r, 1000));
        return checkStatus();
      };

      return await checkStatus();
    } finally {
      setIsPurchasing(false);
    }
  };

  return { purchase, isPurchasing };
}
```

### 10.2 Deep Link Handler

```typescript
// app/_layout.tsx
import * as Linking from 'expo-linking';

useEffect(() => {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    const { path, queryParams } = Linking.parse(url);

    if (path === 'payment-success') {
      // Refresh credits and show success
      useAuthStore.getState().refreshUser();
      Toast.show({ type: 'success', text1: 'Crédits ajoutés!' });
    } else if (path === 'payment-error') {
      Toast.show({ type: 'error', text1: 'Paiement échoué' });
    }
  });

  return () => subscription.remove();
}, []);
```

### 10.3 Credit Packs

| Pack | Credits | Price (FCFA) | Per Credit | Savings |
|------|---------|--------------|------------|---------|
| Starter | 5 | 2,500 | 500 FCFA | - |
| Pro | 20 | 8,000 | 400 FCFA | 20% |
| Business | 50 | 17,500 | 350 FCFA | 30% |
| Enterprise | 150 | 45,000 | 300 FCFA | 40% |

---

## 11. Development Phases

### Phase 1: MVP (4-6 weeks)
- [ ] Auth (Login, Signup, Logout)
- [ ] Home Dashboard
- [ ] Studio Wizard (4 steps)
- [ ] Image Generation
- [ ] Gallery (view generations)
- [ ] Basic Profile

### Phase 2: Creator + Payments (3-4 weeks)
- [ ] Creator Registration
- [ ] Asset Upload & Management
- [ ] Marketplace Browsing
- [ ] Credit Purchase (NabooPay)
- [ ] Push Notifications

### Phase 3: Polish (2-3 weeks)
- [ ] Offline Support
- [ ] Performance Optimization
- [ ] Analytics Integration
- [ ] App Store Submission
- [ ] TestFlight / Play Store Beta

---

## 12. Environment Variables

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
EXPO_PUBLIC_API_URL=https://seetu.ai/api/v1
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id

# For EAS Build
SENTRY_DSN=https://xxx@sentry.io/xxx
MIXPANEL_TOKEN=xxx
```

---

## 13. App Store Requirements

### iOS (App Store)
- [ ] App icons (1024x1024)
- [ ] Screenshots (6.5", 5.5")
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] App description (FR + EN)
- [ ] Keywords
- [ ] Age rating (4+)

### Android (Play Store)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (phone + tablet)
- [ ] Privacy policy URL
- [ ] App description (FR + EN)
- [ ] Content rating questionnaire
- [ ] Data safety form

---

## 14. Testing Strategy

| Type | Tool | Coverage |
|------|------|----------|
| Unit Tests | Jest | Stores, Utils |
| Component Tests | React Native Testing Library | UI Components |
| E2E Tests | Detox | Critical flows |
| Manual QA | Physical devices | All features |

### Test Devices
- iPhone 12/13/14 (iOS 16+)
- Samsung Galaxy A series (Android 11+)
- Low-end Android (2GB RAM)

---

## 15. Launch Checklist

- [ ] App signed and built (EAS Build)
- [ ] Deep linking configured
- [ ] Push notifications working
- [ ] Analytics tracking
- [ ] Crash reporting (Sentry)
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Support email configured
- [ ] Social media accounts ready
- [ ] Beta testers invited
- [ ] Store listings complete
- [ ] Screenshots localized (FR)
