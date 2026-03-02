'use client';

import { Check, ArrowRight } from 'lucide-react';

interface PricingProps {
  onSelectPlan: (tier: string) => void;
}

const features = [
  'Dedicated VM (2 vCPU, 4GB RAM, 80GB SSD)',
  'Telegram bot integration',
  'Web browser + file system access',
  '978 AI personalities included',
  'Skills marketplace (80+ skills)',
  'ClawShield security hardening',
  'Dashboard + usage analytics',
  'Priority support',
];

export default function Pricing({ onSelectPlan }: PricingProps) {
  return (
    <section id="pricing" className="relative py-32 section-glow">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[#f43f5e] text-xs font-mono uppercase tracking-[0.2em] mb-4">
            Simple pricing
          </p>
          <h2 className="heading-premium text-4xl sm:text-5xl font-bold text-white mb-5">
            One plan. Everything included.
          </h2>
          <p className="text-gray-500 text-lg">
            Connect your ChatGPT Plus or Claude Pro, or bring your own API key.
          </p>
        </div>

        {/* Subscription note */}
        <div className="glass rounded-xl p-5 mb-8 text-center">
          <p className="text-white font-medium mb-1">
            Already paying for <span className="text-[#10a37f]">ChatGPT Plus</span> or <span className="text-[#d4a574]">Claude Pro</span>?
          </p>
          <p className="text-gray-500 text-sm">Connect during setup — zero extra AI costs.</p>
        </div>

        {/* Pricing Card — premium glass */}
        <div className="relative max-w-lg mx-auto">
          {/* Glow behind */}
          <div className="absolute -inset-1 bg-gradient-to-br from-[#f43f5e]/20 to-[#6ab3f3]/20 rounded-3xl blur-xl opacity-40" />

          <div className="relative glass rounded-2xl overflow-hidden">
            {/* Top bar */}
            <div className="h-px bg-gradient-to-r from-transparent via-[#f43f5e]/50 to-transparent" />

            <div className="p-8 sm:p-10">
              {/* Plan name */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-gray-500 mb-1">BYOK Plan</h3>
                  <p className="text-sm text-gray-500">Bring Your Own Key</p>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#f43f5e]/10 text-[#fb7185] tracking-wider">
                  POPULAR
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-gray-600 text-sm line-through">€19.99</span>
                <span className="text-5xl font-bold text-white tracking-tight">€14.99</span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#10b981] mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => onSelectPlan('byok')}
                className="group w-full py-4 bg-[#f43f5e] hover:shadow-[0_0_40px_rgba(244,63,94,0.3)] rounded-xl font-semibold text-white text-base transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Fine print */}
              <p className="text-center text-gray-600 text-xs mt-4">
                Cancel anytime · No hidden fees · EU datacenter
              </p>
            </div>
          </div>
        </div>

        {/* Why BYOK */}
        <div className="mt-12 text-center">
          <h4 className="text-xs font-mono uppercase tracking-[0.15em] text-gray-500 mb-6">Why Bring Your Own Key?</h4>
          <div className="grid sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div>
              <p className="text-white text-sm font-medium mb-1">Control your costs</p>
              <p className="text-gray-600 text-xs">Pay your AI provider directly. No markup.</p>
            </div>
            <div>
              <p className="text-white text-sm font-medium mb-1">Choose your model</p>
              <p className="text-gray-600 text-xs">GPT-4, Claude, Gemini — switch anytime.</p>
            </div>
            <div>
              <p className="text-white text-sm font-medium mb-1">Use existing subscriptions</p>
              <p className="text-gray-600 text-xs">Connect ChatGPT Plus or Claude Pro.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
