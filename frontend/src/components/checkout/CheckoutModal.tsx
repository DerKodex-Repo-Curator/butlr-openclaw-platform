'use client';

import { useState } from 'react';
import { X, Mail, Loader2, ArrowRight, Check, Shield, Zap } from 'lucide-react';
import { isValidEmail } from '@/lib/utils';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTier: 'byok' | null;
}

const features = [
  'Dedicated VM (2 vCPU, 4GB RAM)',
  'Telegram bot integration',
  'Any AI provider (ChatGPT, Claude, Gemini)',
  'ClawShield security hardening',
  '978 AI personalities + Skills marketplace',
];

export default function CheckoutModal({ isOpen, onClose, selectedTier }: CheckoutModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !selectedTier) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email');
      return;
    }

    setLoading(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';
      const response = await fetch(`${API_BASE}/checkout/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tier: selectedTier }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.checkout_url;
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || 'Something went wrong');
        setLoading(false);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md glass rounded-t-2xl sm:rounded-2xl overflow-hidden animate-fade-in max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gradient line */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#f43f5e]/50 to-transparent" />

        <div className="p-6 sm:p-8">
          {/* Header — compact */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🦞</span>
                <h3 className="text-xl font-bold text-white">Get Your Butler</h3>
              </div>
              <p className="text-xs font-mono uppercase tracking-wider text-gray-500">BYOK Plan</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Price — prominent, clean */}
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-sm text-gray-600 line-through">€19.99</span>
            <span className="text-4xl font-bold text-white tracking-tight">€14.99</span>
            <span className="text-gray-500 text-sm">/mo</span>
          </div>

          {/* Features — compact */}
          <div className="space-y-2.5 mb-6">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#10b981] flex-shrink-0" />
                <span className="text-sm text-gray-300">{feature}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/5 mb-6" />

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2 font-medium">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#f43f5e]/50 focus:bg-white/[0.05] transition-all text-sm"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-gray-600 mt-1.5">
                Login details sent after setup
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full group flex items-center justify-center gap-2 py-4 bg-[#f43f5e] rounded-xl font-semibold text-white transition-all hover:shadow-[0_0_40px_rgba(244,63,94,0.25)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue to Payment
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Steps — minimal */}
          <div className="flex items-center justify-center gap-2 mt-6 text-[11px] text-gray-600">
            <span className="text-[#f43f5e]">1</span>
            <span>Payment</span>
            <span className="text-gray-700">→</span>
            <span className="text-[#f43f5e]">2</span>
            <span>Setup</span>
            <span className="text-gray-700">→</span>
            <span className="text-[#10b981]">3</span>
            <span>Ready</span>
          </div>

          {/* Trust — ultra compact */}
          <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-gray-600">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Stripe
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Ready in 2 min
            </span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
