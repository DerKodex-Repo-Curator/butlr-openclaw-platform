'use client';

import { ArrowRight, Zap } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

// OpenAI Logo
const OpenAILogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

// Anthropic Logo
const AnthropicLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.257 0H10.173L16.744 20.48H13.14L11.06 15.14H5.56l-2.08 5.34H0L6.57 3.52zm4.31 8.57L8.31 5.39l-2.57 6.7h5.46z" />
  </svg>
);

interface ConnectSubscriptionCTAProps {
  onStartTrial?: () => void;
}

export default function ConnectSubscriptionCTA({ onStartTrial }: ConnectSubscriptionCTAProps) {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#f43f5e]/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-full mb-6">
          <Zap className="w-4 h-4 text-[#f43f5e]" />
          <span className="text-[#f43f5e] text-sm font-medium">No extra AI costs</span>
        </div>

        {/* Headline */}
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Already paying for{' '}
          <span className="text-[#10a37f]">ChatGPT</span>
          {' '}or{' '}
          <span className="text-[#d4a574]">Claude</span>?
        </h2>

        {/* Subheadline */}
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Connect your existing subscription to your AI butler. One click, zero extra AI costs.
          Your subscription, your bot.
        </p>

        {/* Big Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          {/* OpenAI Button */}
          <button
            onClick={onStartTrial}
            className="group flex items-center justify-center gap-3 px-8 py-5 bg-[#10a37f] text-white rounded-2xl font-semibold text-lg hover:bg-[#0d8c6d] transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-[#10a37f]/20"
          >
            <OpenAILogo className="w-6 h-6" />
            Connect ChatGPT Plus
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Anthropic Button */}
          <button
            onClick={onStartTrial}
            className="group flex items-center justify-center gap-3 px-8 py-5 bg-[#1a1a2e] border-2 border-[#d4a574] text-[#d4a574] rounded-2xl font-semibold text-lg hover:bg-[#d4a574]/10 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-[#d4a574]/10"
          >
            <AnthropicLogo className="w-6 h-6" />
            Connect Claude Pro
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* API Key fallback */}
        <p className="text-gray-500 text-sm">
          or{' '}
          <button onClick={onStartTrial} className="text-gray-400 hover:text-white underline transition-colors">
            use your own API key
          </button>
        </p>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#10b981] rounded-full" />
            Works with ChatGPT Plus ($20/mo)
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#10b981] rounded-full" />
            Works with Claude Pro ($20/mo)
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#10b981] rounded-full" />
            Secure OAuth — we never see your password
          </div>
        </div>
      </div>
    </section>
  );
}
