// API Service for Butlr Unified Frontend
import type {
  DashboardData,
  Bot,
  Settings,
  SupportTicket,
  ApiResponse,
  AuthResponse,
  PricingTier,
  CheckoutSession,
  OnboardingStatus,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

// Helper function for API calls
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('butlr_token') : null;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.detail || 'Request failed' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

// Auth endpoints
export const auth = {
  // Request magic link
  requestMagicLink: async (email: string): Promise<AuthResponse> => {
    const response = await fetchApi<{ message: string }>('/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return {
      success: response.success,
      message: response.data?.message,
    };
  },

  // Verify magic link token
  verifyToken: async (token: string): Promise<AuthResponse> => {
    const response = await fetchApi<{ token: string; user: any }>('/auth/verify-magic', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    if (response.success && response.data) {
      localStorage.setItem('butlr_token', response.data.token);
      if (response.data.user?.id) {
        localStorage.setItem('butlr_customer_id', String(response.data.user.id));
      }
      return {
        success: true,
        token: response.data.token,
        user: response.data.user,
      };
    }
    return { success: false, message: response.error };
  },

  // Login with Stripe Customer ID
  loginWithStripe: async (customerId: string): Promise<AuthResponse> => {
    const response = await fetchApi<{ token: string; user: any }>('/auth/stripe-login', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId }),
    });
    if (response.success && response.data) {
      localStorage.setItem('butlr_token', response.data.token);
      if (response.data.user?.id) {
        localStorage.setItem('butlr_customer_id', String(response.data.user.id));
      }
      return {
        success: true,
        token: response.data.token,
        user: response.data.user,
      };
    }
    return { success: false, message: response.error };
  },

  // Logout
  logout: () => {
    localStorage.removeItem('butlr_token');
    localStorage.removeItem('butlr_customer_id');
  },

  // Check if logged in
  isAuthenticated: (): boolean => {
    return typeof window !== 'undefined' && !!localStorage.getItem('butlr_token');
  },
};

// Dashboard endpoints
export const dashboard = {
  // Get full dashboard data
  getData: async (): Promise<ApiResponse<DashboardData>> => {
    return fetchApi<DashboardData>('/dashboard');
  },
};

// Bot endpoints
export const bot = {
  // Get bot status
  getStatus: async (): Promise<ApiResponse<Bot>> => {
    return fetchApi<Bot>('/bot/status');
  },

  // Restart bot
  restart: async (): Promise<ApiResponse<{ message: string }>> => {
    return fetchApi('/bot/restart', { method: 'POST' });
  },

  // Update bot name
  updateName: async (name: string): Promise<ApiResponse<Bot>> => {
    return fetchApi<Bot>('/bot/name', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },
};

// Settings endpoints
export const settings = {
  // Get settings
  get: async (): Promise<ApiResponse<Settings>> => {
    return fetchApi<Settings>('/settings');
  },

  // Update settings
  update: async (updates: Partial<Settings>): Promise<ApiResponse<Settings>> => {
    return fetchApi<Settings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
};

// Billing endpoints
export const billing = {
  // Get Stripe billing portal URL
  getPortalUrl: async (): Promise<ApiResponse<{ url: string }>> => {
    return fetchApi<{ url: string }>('/billing/portal');
  },
};

// Support endpoints
export const support = {
  // Submit support ticket
  submitTicket: async (ticket: SupportTicket): Promise<ApiResponse<{ message: string }>> => {
    // Get customer ID from localStorage
    const customerId = typeof window !== 'undefined' ? localStorage.getItem('butlr_customer_id') : null;
    const endpoint = customerId ? `/support/submit/${customerId}` : '/support/submit/0';
    return fetchApi(endpoint, {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
  },
};

// Pricing endpoints
export const pricing = {
  // Get pricing tiers
  getTiers: async (): Promise<ApiResponse<PricingTier[]>> => {
    return fetchApi<PricingTier[]>('/pricing/tiers');
  },
};

// Checkout endpoints
export const checkout = {
  // Create checkout session
  createSession: async (email: string, tier: string): Promise<ApiResponse<CheckoutSession>> => {
    return fetchApi<CheckoutSession>('/checkout/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ email, tier }),
    });
  },
};

// Onboarding endpoints
export const onboarding = {
  // Verify session
  verifySession: async (sessionId: string): Promise<ApiResponse<{ customer_id: number }>> => {
    return fetchApi('/onboarding/verify-session', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
  },

  // Save config
  saveConfig: async (
    customerId: number,
    config: { bot_name: string; personality: string; custom_personality?: string | null }
  ): Promise<ApiResponse<{ message: string }>> => {
    return fetchApi(`/onboarding/config/${customerId}`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  // Start provisioning
  startProvisioning: async (customerId: number): Promise<ApiResponse<{ message: string }>> => {
    return fetchApi(`/onboarding/start-provisioning/${customerId}`, {
      method: 'POST',
    });
  },

  // Get status
  getStatus: async (customerId: number): Promise<ApiResponse<OnboardingStatus>> => {
    return fetchApi<OnboardingStatus>(`/onboarding/status/${customerId}`);
  },

  // Regenerate SOUL.md
  regenerateSoul: async (customerId: number): Promise<ApiResponse<{ message: string }>> => {
    return fetchApi(`/onboarding/regenerate-soul/${customerId}`, {
      method: 'POST',
    });
  },
};

// Export all API modules
const api = {
  auth,
  dashboard,
  bot,
  settings,
  billing,
  support,
  pricing,
  checkout,
  onboarding,
};

export default api;
