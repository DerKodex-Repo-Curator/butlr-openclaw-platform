'use client';

import { ArrowRight } from 'lucide-react';

interface CTAProps {
  onStartTrial: () => void;
}

export default function CTA({ onStartTrial }: CTAProps) {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#f43f5e]/[0.06] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="heading-premium text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
          Your butler awaits.
        </h2>
        <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">
          Setup in 2 minutes. €14.99/mo. Cancel anytime.
        </p>

        <button
          onClick={onStartTrial}
          className="group inline-flex items-center gap-3 px-10 py-5 bg-[#f43f5e] rounded-xl font-semibold text-white text-lg transition-all hover:shadow-[0_0_60px_rgba(244,63,94,0.3)] hover:-translate-y-1"
        >
          Get Started
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </section>
  );
}
