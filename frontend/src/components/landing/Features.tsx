'use client';

import {
  Globe,
  FolderOpen,
  Zap,
  Package,
  Server,
  Shield,
  Users,
  Clock,
  Brain,
  Terminal,
} from 'lucide-react';

// Telegram Icon
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// Floating memory nodes for the visual
function MemoryNodes() {
  const nodes = [
    { label: 'Prefers dark mode', x: 8, y: 15, delay: 0 },
    { label: 'Meeting at 3pm', x: 55, y: 8, delay: 0.5 },
    { label: 'Allergic to nuts', x: 75, y: 35, delay: 1 },
    { label: 'Loves jazz music', x: 20, y: 55, delay: 1.5 },
    { label: 'Works at home', x: 60, y: 60, delay: 2 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Neural connection lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <line x1="18%" y1="25%" x2="65%" y2="18%" stroke="url(#memGrad)" strokeWidth="1" />
        <line x1="65%" y1="18%" x2="85%" y2="45%" stroke="url(#memGrad)" strokeWidth="1" />
        <line x1="30%" y1="65%" x2="70%" y2="70%" stroke="url(#memGrad)" strokeWidth="1" />
        <line x1="18%" y1="25%" x2="30%" y2="65%" stroke="url(#memGrad)" strokeWidth="1" />
        <line x1="85%" y1="45%" x2="70%" y2="70%" stroke="url(#memGrad)" strokeWidth="1" />
        <defs>
          <linearGradient id="memGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      {nodes.map((node, i) => (
        <div
          key={i}
          className="absolute animate-pulse"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            animationDelay: `${node.delay}s`,
            animationDuration: '3s',
          }}
        >
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-purple-400/60" />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-mono text-purple-300/40">
              {node.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="relative py-32 section-glow">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header — premium typography */}
        <div className="text-center mb-20">
          <p className="text-[#f43f5e] text-xs font-mono uppercase tracking-[0.2em] mb-4">
            Everything included
          </p>
          <h2 className="heading-premium text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-5">
            Not a chatbot.<br />A full computer.
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Browser, terminal, file system — your butler has real tools.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

          {/* Large card — VM */}
          <div className="lg:col-span-2 group spotlight-card glass rounded-2xl p-8 hover-lift cursor-default">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#f43f5e]/10 flex items-center justify-center">
                  <Server className="w-5 h-5 text-[#f43f5e]" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#f43f5e]/70">Core</span>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">Dedicated Virtual Machine</h3>
              <p className="text-gray-500 max-w-lg">Your butler runs on its own isolated VM with 2 vCPU, 4GB RAM, 80GB SSD. No shared resources. Full privacy.</p>
              {/* Mini specs */}
              <div className="flex gap-6 mt-6">
                {['2 vCPU', '4GB RAM', '80GB SSD', 'German DC'].map(spec => (
                  <span key={spec} className="text-xs font-mono text-gray-600 tracking-wide">{spec}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Telegram */}
          <div className="group spotlight-card glass rounded-2xl p-8 hover-lift cursor-default">
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#6ab3f3]/10 flex items-center justify-center mb-4">
                <TelegramIcon className="w-5 h-5 text-[#6ab3f3]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Telegram Native</h3>
              <p className="text-gray-500 text-sm">Chat naturally. Send tasks, get updates, receive files — all in Telegram.</p>
            </div>
          </div>

          {/* Browser */}
          <div className="group spotlight-card glass rounded-2xl p-8 hover-lift cursor-default">
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#10b981]/10 flex items-center justify-center mb-4">
                <Globe className="w-5 h-5 text-[#10b981]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Web Browsing</h3>
              <p className="text-gray-500 text-sm">Real browser. Research, fill forms, book appointments, navigate any website.</p>
            </div>
          </div>

          {/* 🧠 MEMORY — Large featured card */}
          <div className="lg:col-span-2 group spotlight-card glass rounded-2xl p-8 hover-lift cursor-default relative overflow-hidden">
            {/* Subtle purple/pink glow behind */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500/[0.07] rounded-full blur-[80px] group-hover:bg-purple-500/[0.12] transition-all duration-700" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-pink-500/[0.05] rounded-full blur-[60px] group-hover:bg-pink-500/[0.10] transition-all duration-700" />

            {/* Memory nodes visualization */}
            <MemoryNodes />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400/70">Add-On</span>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                Long-Term Memory
              </h3>
              <p className="text-gray-500 max-w-lg">
                Your butler remembers everything — preferences, names, routines, past conversations. The more you talk, the smarter it gets. Powered by vector search, categorized automatically.
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                {['Preferences', 'People', 'Routines', 'Work', 'Health', 'Events'].map(cat => (
                  <span key={cat} className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/15 text-purple-300/60">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Files */}
          <div className="group spotlight-card glass rounded-2xl p-8 hover-lift cursor-default">
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/10 flex items-center justify-center mb-4">
                <FolderOpen className="w-5 h-5 text-[#8b5cf6]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">File System</h3>
              <p className="text-gray-500 text-sm">Create documents, organize folders, convert files, generate reports.</p>
            </div>
          </div>

          {/* Personalities */}
          <div className="group spotlight-card glass rounded-2xl p-8 hover-lift cursor-default">
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-[#f59e0b]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">978 Personalities</h3>
              <p className="text-gray-500 text-sm">Famous minds, expert coaches, or fully custom. Choose who your butler becomes.</p>
            </div>
          </div>

          {/* Code & Automation */}
          <div className="group spotlight-card glass rounded-2xl p-8 hover-lift cursor-default">
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#06b6d4]/10 flex items-center justify-center mb-4">
                <Terminal className="w-5 h-5 text-[#06b6d4]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Code & Automation</h3>
              <p className="text-gray-500 text-sm">Run scripts, schedule tasks, build workflows. Your butler writes and executes code on its own machine.</p>
            </div>
          </div>

        </div>

        {/* Bottom row — smaller trust features */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          {[
            { icon: Shield, label: 'ClawShield Security', desc: 'Auto-hardened VMs', color: '#10b981' },
            { icon: Package, label: 'Skills Marketplace', desc: '80+ installable skills', color: '#fb7185' },
            { icon: Clock, label: '24/7 Online', desc: 'Always running', color: '#6ab3f3' },
            { icon: Zap, label: 'Any AI Provider', desc: 'ChatGPT, Claude, Gemini', color: '#f59e0b' },
          ].map(item => (
            <div key={item.label} className="glass rounded-xl p-5 hover-lift cursor-default group">
              <item.icon className="w-4 h-4 mb-3 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: item.color }} />
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
