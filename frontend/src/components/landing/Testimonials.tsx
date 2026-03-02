'use client';

import { Shield, Clock, Cpu, Server, Lock, Zap } from 'lucide-react';

export default function Testimonials() {
  return (
    <section className="relative py-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-[#10b981] text-xs font-mono uppercase tracking-[0.2em]">
            Security & Privacy
          </span>
          <h2 className="heading-premium text-4xl sm:text-5xl font-bold text-white mt-4 mb-5">
            Your data. Your VM. Your butler.
          </h2>
          <p className="text-gray-400 text-lg">
            No shared infrastructure. No data leaks. Enterprise-grade privacy.
          </p>
        </div>

        {/* Trust points */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 glass rounded-xl hover-lift cursor-default">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Isolated VM</h3>
            <p className="text-gray-400 text-sm">
              Your butler runs on its own dedicated virtual machine. Nobody else has access.
            </p>
          </div>

          <div className="p-6 glass rounded-xl hover-lift cursor-default">
            <div className="w-12 h-12 rounded-xl bg-[#6ab3f3]/10 border border-[#6ab3f3]/20 flex items-center justify-center mb-4">
              <Cpu className="w-6 h-6 text-[#6ab3f3]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Choose Any AI</h3>
            <p className="text-gray-400 text-sm">
              Claude, GPT-4, Gemini — connect your preferred AI provider and switch anytime.
            </p>
          </div>

          <div className="p-6 glass rounded-xl hover-lift cursor-default">
            <div className="w-12 h-12 rounded-xl bg-[#f43f5e]/10 border border-[#f43f5e]/20 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-[#f43f5e]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">24/7 Online</h3>
            <p className="text-gray-400 text-sm">
              Your butler never sleeps. Ask anything anytime. Check back for results.
            </p>
          </div>
        </div>

        {/* Technical specs */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-gray-400" />
            Technical Specs
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-gray-400 text-sm">2 vCPU cores</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-gray-400 text-sm">4GB RAM</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-gray-400 text-sm">80GB SSD storage</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-gray-400 text-sm">German datacenter</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-gray-400 text-sm">ClawShield auto-hardening</span>
            </div>
          </div>
        </div>

        {/* OpenClaw badge */}
        <div className="mt-12 text-center">
          <a
            href="https://openclaw.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-3 bg-[#f43f5e]/5 border border-[#f43f5e]/20 rounded-full hover:bg-[#f43f5e]/10 transition-colors"
          >
            <span className="text-lg">🦞</span>
            <div className="text-left">
              <p className="text-sm text-[#fb7185] font-medium">Built on OpenClaw</p>
              <p className="text-xs text-gray-500">Open source AI agent framework</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
