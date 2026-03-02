'use client';

import { Play, ArrowRight, CheckCircle } from 'lucide-react';

// Telegram Icon
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const useCases = [
  {
    task: 'Research competitors',
    result: 'Full report with pricing, features, and market positioning',
    time: '5 min',
  },
  {
    task: 'Book a restaurant',
    result: 'Table booked, confirmation in your inbox',
    time: '30 sec',
  },
  {
    task: 'Create a presentation',
    result: '12-slide deck with charts, saved to Drive',
    time: '2 min',
  },
  {
    task: 'Monitor a website',
    result: 'Alerts when prices change or stock returns',
    time: 'Ongoing',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32 section-glow">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-[#6ab3f3] text-xs font-mono uppercase tracking-[0.2em]">
            How it works
          </span>
          <h2 className="heading-premium text-4xl sm:text-5xl font-bold text-white mt-4 mb-5">
            Give it a task. Get it done.
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Message your butler on Telegram like you'd message a friend.
            It handles the rest.
          </p>
        </div>

        {/* Main Visual */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Left - Flow diagram */}
          <div className="relative">
            <div className="space-y-4">
              {/* Step 1: You */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#6ab3f3]/20 border border-[#6ab3f3]/30 flex items-center justify-center flex-shrink-0">
                  <TelegramIcon className="w-7 h-7 text-[#6ab3f3]" />
                </div>
                <div className="flex-1 p-4 glass rounded-xl">
                  <p className="text-gray-400 text-sm mb-1">You say:</p>
                  <p className="text-white font-medium">"Find the best flight to Berlin next Friday"</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center py-2">
                <div className="flex flex-col items-center gap-1 text-gray-600">
                  <ArrowRight className="w-5 h-5 rotate-90" />
                  <span className="text-xs">Processing</span>
                </div>
              </div>

              {/* Step 2: Butler works */}
              <div className="p-4 glass rounded-xl ml-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">🦞</span>
                  <span className="text-gray-400 text-sm">Butler is working...</span>
                </div>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex items-center gap-2 text-gray-500">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    <span>Opening browser...</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    <span>Searching flight comparison sites...</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    <span>Comparing 47 results...</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="w-3 h-3" />
                    <span>Found best deal!</span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center py-2">
                <div className="flex flex-col items-center gap-1 text-gray-600">
                  <ArrowRight className="w-5 h-5 rotate-90" />
                </div>
              </div>

              {/* Step 3: Result */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#f43f5e]/20 border border-[#f43f5e]/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🦞</span>
                </div>
                <div className="flex-1 p-4 bg-gradient-to-r from-[#f43f5e]/10 to-transparent rounded-xl border border-[#f43f5e]/20">
                  <p className="text-[#fb7185] text-sm mb-1">Butler responds:</p>
                  <p className="text-white font-medium">"Found Eurowings at €89 - direct flight, 2h 15m. Want me to book it?"</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Use cases */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-6">
              What can your butler do?
            </h3>
            <div className="space-y-3">
              {useCases.map((uc, i) => (
                <div
                  key={i}
                  className="group p-4 glass rounded-xl hover:border-[#f43f5e]/30 transition-all cursor-default"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-white font-medium mb-1">"{uc.task}"</p>
                      <p className="text-gray-500 text-sm">{uc.result}</p>
                    </div>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full whitespace-nowrap">
                      {uc.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 glass rounded-xl">
              <p className="text-gray-400 text-sm">
                <span className="text-white font-medium">The difference?</span>
                {' '}ChatGPT tells you how. Your butler just does it.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-[#111827] border border-gray-800 rounded-full">
            <div className="flex items-center gap-2 text-gray-400">
              <Play className="w-4 h-4 text-[#f43f5e]" />
              <span className="text-sm">Setup takes about 2 minutes</span>
            </div>
            <div className="w-px h-4 bg-gray-700" />
            <div className="flex items-center gap-2 text-gray-400">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm">No downloads required</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
