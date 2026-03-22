/**
 * Blooprint Print Service API Client
 * Now integrated directly into Seetu via Next.js API routes
 */

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface ApiError {
  error?: string;
  detail?: string;
}

/**
 * Base fetcher for Blooprint API
 * Now calls Seetu's internal API routes directly
 */
export async function fetchPrintAPI<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const url = `/api/v1/print${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.detail || error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// ================================
// Chat API
// ================================

export interface ChatSession {
  id: string;
  client_id: string;
  status: string;
  context: Record<string, unknown>;
  messages?: ChatMessage[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  created_at: string;
}

export interface ExtractedOrder {
  items: ExtractedItem[];
  delivery_address?: string;
  delivery_city?: string;
  confidence: number;
  order_complete: boolean;
  missing_info?: string[];
  conversation_summary?: string;
}

export interface ExtractedItem {
  product_name: string;
  quantity: number;
  specifications: Record<string, unknown>;
  matched_product_id?: string;
  confidence: number;
  file_uploaded?: boolean;
  file_description?: string;
  design_brief?: string;
}

export const chatAPI = {
  createSession: (brandId?: string) =>
    fetchPrintAPI<ChatSession>('/chat/sessions', {
      method: 'POST',
      body: brandId ? { brand_id: brandId } : {},
    }),

  getSession: (sessionId: string) =>
    fetchPrintAPI<ChatSession>(`/chat/sessions/${sessionId}`),

  sendMessage: (sessionId: string, content: string, imageUrls?: string[]) =>
    fetchPrintAPI<ChatMessage>(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: {
        content,
        image_urls: imageUrls || [],
      },
    }),

  extractOrder: (sessionId: string) =>
    fetchPrintAPI<{ extracted_order: ExtractedOrder }>(`/chat/sessions/${sessionId}/extract`, {
      method: 'POST',
    }),
};

// ================================
// Products API
// ================================

export interface Product {
  id: string;
  name: string;
  name_fr?: string;
  slug: string;
  description?: string;
  catalog_type: 'core' | 'extended';
  base_price?: number;
  min_quantity: number;
  max_quantity?: number;
  production_days: number;
  requires_design: boolean;
  image_url?: string;
  available_print_techniques: string[];
  specifications: Record<string, unknown>;
  category?: ProductCategory;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface PriceCalculation {
  product_id: string;
  product_name: string;
  quantity: number;
  provider_cost: number;
  client_price: number;
  production_days: number;
  is_instant: boolean;
  requires_quote: boolean;
}

export const productsAPI = {
  list: (params?: { category?: string; search?: string; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    const query = searchParams.toString();
    return fetchPrintAPI<{ products: Product[]; total: number }>(`/products${query ? `?${query}` : ''}`);
  },

  get: (productId: string) =>
    fetchPrintAPI<Product>(`/products/${productId}`),

  getBySlug: (slug: string) =>
    fetchPrintAPI<Product>(`/products/slug/${slug}`),

  getCategories: () =>
    fetchPrintAPI<ProductCategory[]>('/products/categories'),

  calculatePrice: (productId: string, quantity: number, specifications?: Record<string, unknown>) =>
    fetchPrintAPI<PriceCalculation>('/products/calculate-price', {
      method: 'POST',
      body: {
        product_id: productId,
        quantity,
        specifications: specifications || {},
      },
    }),

  getWithMockups: (productId: string) =>
    fetchPrintAPI<{ product: Product; mockups: ProductMockup[] }>(`/products/${productId}/with-mockups`),
};

export interface ProductMockup {
  id: string;
  product_id: string;
  name: string;
  mockup_url: string;
  zones: MockupZone[];
  is_default: boolean;
}

export interface MockupZone {
  name: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

// ================================
// Mockups API
// ================================

export const mockupsAPI = {
  getForProduct: (productId: string) =>
    fetchPrintAPI<{ mockups: ProductMockup[]; product_id: string }>(`/mockups/product/${productId}`),

  getDefault: async (productId: string): Promise<ProductMockup | null> => {
    const { mockups } = await mockupsAPI.getForProduct(productId);
    return mockups.find((m) => m.is_default) || mockups[0] || null;
  },
};

// ================================
// Orders API
// ================================

export interface Order {
  id: string;
  order_number: string;
  client_id: string;
  subtotal: number;
  platform_fee: number;
  delivery_fee: number;
  total_amount: number;
  status: OrderStatus;
  payment_type: 'full' | 'split' | 'split_first' | 'split_second';
  payment_status: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_phone?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'draft'
  | 'pending_quote'
  | 'quoted'
  | 'pending_payment'
  | 'confirmed'
  | 'in_production'
  | 'ready_for_pickup'
  | 'in_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  specifications: Record<string, unknown>;
  provider_cost: number;
  client_price: number;
  file_ready: boolean;
  design_status: string;
  status: string;
  requires_quote: boolean;
}

export interface CreateOrderPayload {
  items: {
    product_id?: string;
    product_name: string;
    quantity: number;
    specifications?: Record<string, unknown>;
    file_ready?: boolean;
    notes?: string;
  }[];
  delivery_address?: string;
  delivery_city?: string;
  delivery_phone?: string;
  delivery_notes?: string;
  entry_point?: string;
  chat_session_id?: string;
}

export const ordersAPI = {
  create: (data: CreateOrderPayload) =>
    fetchPrintAPI<Order>('/orders', {
      method: 'POST',
      body: data as unknown as Record<string, unknown>,
    }),

  list: (params?: { status?: string; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    const query = searchParams.toString();
    return fetchPrintAPI<{ orders: Order[]; total: number }>(`/orders${query ? `?${query}` : ''}`);
  },

  get: (orderId: string) =>
    fetchPrintAPI<Order>(`/orders/${orderId}`),

  update: (orderId: string, data: Partial<CreateOrderPayload>) =>
    fetchPrintAPI<Order>(`/orders/${orderId}`, {
      method: 'PUT',
      body: data,
    }),

  submit: (orderId: string) =>
    fetchPrintAPI<{ order_id: string; status: string; message: string }>(`/orders/${orderId}/submit`, {
      method: 'POST',
    }),

  confirm: (orderId: string, data: {
    payment_type: 'full' | 'split';
    delivery_address?: string;
    delivery_city?: string;
    delivery_phone?: string;
  }) =>
    fetchPrintAPI<{
      order: Order;
      payment_type: string;
      total_amount: number;
      first_payment_amount: number;
      remaining_amount: number;
    }>(`/orders/${orderId}/confirm`, {
      method: 'POST',
      body: data,
    }),

  cancel: (orderId: string) =>
    fetchPrintAPI<void>(`/orders/${orderId}`, {
      method: 'DELETE',
    }),

  track: (orderId: string) =>
    fetchPrintAPI<{
      order_id: string;
      status: string;
      items: { id: string; product_name: string; status: string }[];
      timeline: { status: string; label: string; timestamp: string; completed: boolean }[];
    }>(`/orders/${orderId}/track`),
};

// ================================
// Design API
// ================================

export interface DesignSession {
  id: string;
  order_item_id: string;
  brief?: string;
  style_preferences?: Record<string, unknown>;
  status: string;
  generated_options: DesignOption[];
  selected_option_index?: number;
  final_design_url?: string;
  print_ready_url?: string;
}

export interface DesignOption {
  index: number;
  url: string;
  prompt: string;
  selected: boolean;
}

export const designAPI = {
  createBrief: (orderItemId: string, brief: string, referenceImages?: string[]) =>
    fetchPrintAPI<DesignSession>('/design/brief', {
      method: 'POST',
      body: {
        order_item_id: orderItemId,
        brief,
        reference_images: referenceImages || [],
      },
    }),

  generate: (sessionId: string) =>
    fetchPrintAPI<{ session_id: string; options: DesignOption[] }>('/design/generate', {
      method: 'POST',
      body: { session_id: sessionId },
    }),

  // Generate AI designs for a product
  generateForProduct: (productName: string, prompt?: string, numVariations?: number) =>
    fetchPrintAPI<{
      designs: { id: string; image_url: string; prompt: string; mockup_url?: string }[];
      product_name: string;
    }>('/design/generate', {
      method: 'POST',
      body: {
        product_name: productName,
        prompt,
        num_variations: numVariations || 3,
      },
    }),

  selectOption: (sessionId: string, optionIndex: number) =>
    fetchPrintAPI<DesignSession>(`/design/sessions/${sessionId}/select`, {
      method: 'POST',
      body: { option_index: optionIndex },
    }),

  generateWithBrand: (
    prompt: string,
    brandId: string,
    options?: { width?: number; height?: number; numVariations?: number }
  ) =>
    fetchPrintAPI<{ designs: { id: string; image_url: string }[] }>('/design/generate-with-brand', {
      method: 'POST',
      body: {
        prompt,
        brand_id: brandId,
        width: options?.width || 1024,
        height: options?.height || 1024,
        num_variations: options?.numVariations || 3,
      },
    }),

  generateArtwork: (
    productId: string,
    prompt: string,
    options?: { printArea?: string; brandId?: string }
  ) =>
    fetchPrintAPI<{ designs: { id: string; image_url: string }[] }>('/design/generate-artwork', {
      method: 'POST',
      body: {
        product_id: productId,
        prompt,
        print_area: options?.printArea || 'front',
        brand_id: options?.brandId,
        transparent_background: true,
      },
    }),

  compositeMockup: (productId: string, mockupId: string, designUrl: string, printArea?: string) =>
    fetchPrintAPI<{ mockup_url: string }>('/design/composite-mockup', {
      method: 'POST',
      body: {
        product_id: productId,
        mockup_id: mockupId,
        design_url: designUrl,
        print_area: printArea || 'front',
      },
    }),
};

// ================================
// Quotes API
// ================================

export interface QuoteRequest {
  id: string;
  order_item_id: string;
  product_name: string;
  quantity: number;
  specifications: Record<string, unknown>;
  deadline: string;
  status: string;
  responses: QuoteResponse[];
}

export interface QuoteResponse {
  id: string;
  provider_id: string;
  provider_price: number;
  client_price: number;
  production_days: number;
  notes?: string;
  status: string;
}

export const quotesAPI = {
  list: (params?: { status?: string; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    const query = searchParams.toString();
    return fetchPrintAPI<{ quotes: QuoteRequest[]; total: number }>(`/quotes/requests${query ? `?${query}` : ''}`);
  },

  get: (quoteId: string) =>
    fetchPrintAPI<QuoteRequest>(`/quotes/requests/${quoteId}`),

  accept: (quoteId: string, responseId: string) =>
    fetchPrintAPI<{ message: string }>(`/quotes/requests/${quoteId}/accept`, {
      method: 'POST',
      body: { quote_response_id: responseId },
    }),
};

// ================================
// Upload API
// ================================

export interface UploadResult {
  url: string;
  path: string;
  filename: string;
  size: number;
  type: string;
}

export const uploadAPI = {
  uploadFile: async (file: File): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/v1/print/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },
};

// ================================
// Health Check
// ================================

export const healthAPI = {
  check: () => fetchPrintAPI<{ status: string }>('/health'),
};
