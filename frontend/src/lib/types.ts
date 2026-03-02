// API Types for Butlr Unified Frontend

export interface User {
  id: string;
  email: string;
  category?: string;
  stripe_customer_id?: string;
  created_at: string;
}

export interface Bot {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'starting' | 'stopping';
  telegram_username?: string;
  created_at: string;
  last_active?: string;
}

export interface VMStatus {
  ip: string;
  status: 'running' | 'stopped' | 'provisioning';
  uptime: string;
  health: 'healthy' | 'degraded' | 'unhealthy';
  cpu_usage?: number;
  memory_usage?: number;
}

export interface UsageStats {
  api_calls_today: number;
  api_calls_month: number;
  messages_processed: number;
  uptime_percentage: number;
}

export interface Subscription {
  id: string;
  plan: 'trial' | 'byok' | 'unlimited' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_end: string;
  trial_end?: string;
  amount: number;
  currency: string;
}

export interface DashboardData {
  user: User;
  bot: Bot;
  vm: VMStatus;
  usage: UsageStats;
  subscription: Subscription;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface SupportTicket {
  subject: string;
  message: string;
  email: string;
  category?: string;
}

export interface NotificationPreferences {
  email_alerts: boolean;
  weekly_reports: boolean;
  billing_reminders: boolean;
  maintenance_alerts: boolean;
}

export interface Settings {
  bot_name: string;
  notifications: NotificationPreferences;
}

// Pricing Types
export interface PricingTier {
  tier_name: 'byok' | 'unlimited';
  price_cents: number;
  features: {
    name: string;
    api_keys?: boolean;
    unlimited_requests?: boolean;
    includes_sonnet?: boolean;
    daily_limit?: number;
    support?: string;
  };
}

export interface CheckoutSession {
  checkout_url: string;
  session_id: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

// Onboarding Types
export interface OnboardingStatus {
  status: string;
  step?: string;
  bot_username?: string;
  vm_ip?: string;
  error?: string;
}

export interface PersonalityOption {
  name: string;
  emoji: string;
  description: string;
  traits: string[];
}

// Landing Page Types
export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar?: string;
}

export interface HowItWorksStep {
  number: number;
  title: string;
  description: string;
}
