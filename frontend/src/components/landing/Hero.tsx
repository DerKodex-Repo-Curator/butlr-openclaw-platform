'use client';

import { ArrowRight, Brain, Terminal, LayoutDashboard, BarChart3, Package, Shield, CreditCard, Settings, HelpCircle, Activity, Server, Zap, Clock, RefreshCw, ExternalLink } from 'lucide-react';

interface HeroProps {
  onStartTrial: () => void;
}

export default function Hero({ onStartTrial }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[25%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[700px] bg-[#f43f5e]/[0.05] rounded-full blur-[160px]" />
        <div className="absolute top-[50%] right-[10%] w-[500px] h-[500px] bg-[#6ab3f3]/[0.03] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-[20%] w-[600px] h-[400px] bg-[#a855f7]/[0.03] rounded-full blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 lg:pt-24 lg:pb-24">
        {/* Top — centered content */}
        <div className="text-center max-w-3xl mx-auto mb-14 lg:mb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 glass rounded-full mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-gray-400 text-xs font-medium tracking-wide">Now in public beta</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold text-white leading-[0.95] tracking-tight mb-6">
            Your AI.
            <br className="sm:hidden" />{' '}
            Its own
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f43f5e] via-[#fb7185] to-[#f43f5e] animate-wave-gradient" style={{backgroundSize: '200% 200%'}}>
              computer.
            </span>
          </h1>

          {/* Sub */}
          <p className="text-base sm:text-lg text-gray-400 mb-8 max-w-xl mx-auto leading-relaxed">
            A personal AI butler with its own VM, browser, and terminal.
            Give it tasks on Telegram — it gets them done.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <button
              onClick={onStartTrial}
              className="group relative px-8 py-4 bg-[#f43f5e] rounded-xl font-semibold text-white text-base transition-all duration-300 hover:shadow-[0_0_50px_rgba(244,63,94,0.35)] hover:-translate-y-0.5 flex items-center gap-3"
            >
              Get your butler
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#features"
              className="px-6 py-4 text-gray-500 hover:text-white transition-colors text-sm font-medium"
            >
              See what it can do
            </a>
          </div>

          {/* Stats */}
          <div className="mt-10 flex items-center gap-6 sm:gap-8 justify-center text-center">
            <div>
              <p className="text-white text-lg sm:text-xl font-bold">978</p>
              <p className="text-gray-600 text-[10px] sm:text-xs font-mono tracking-wide">Personalities</p>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div>
              <p className="text-white text-lg sm:text-xl font-bold">80+</p>
              <p className="text-gray-600 text-[10px] sm:text-xs font-mono tracking-wide">Skills</p>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div>
              <p className="text-white text-lg sm:text-xl font-bold">€14.99</p>
              <p className="text-gray-600 text-[10px] sm:text-xs font-mono tracking-wide">/month</p>
            </div>
          </div>
        </div>

        {/* Dashboard Visual */}
        <DashboardVisual />
      </div>
    </section>
  );
}


/* ─── Real Dashboard Recreation ─── */

function DashboardVisual() {
  return (
    <div className="relative max-w-[1200px] mx-auto">
      {/* Glow */}
      <div className="absolute -inset-10 bg-gradient-to-b from-[#f43f5e]/[0.06] via-[#a855f7]/[0.03] to-transparent rounded-3xl blur-3xl pointer-events-none" />

      {/* 3D perspective */}
      <div style={{ perspective: '2400px' }}>
        <div
          className="relative rounded-xl overflow-hidden border border-white/[0.08] shadow-[0_20px_80px_-20px_rgba(244,63,94,0.15),0_0_40px_rgba(0,0,0,0.4)]"
          style={{ transform: 'rotateX(4deg)', transformOrigin: 'center bottom' }}
        >
          {/* Browser chrome */}
          <div className="bg-[#0f1318] px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 border-b border-white/[0.06]">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#f43f5e]/60" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/40" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/40" />
            </div>
            <div className="flex-1 max-w-md mx-auto">
              <div className="bg-[#1a1f27] rounded-lg px-3 sm:px-4 py-1 sm:py-1.5 flex items-center gap-2">
                <svg className="w-3 h-3 text-emerald-400/60 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span className="text-gray-500 text-[10px] sm:text-xs font-mono truncate">butlr.cloud/dashboard</span>
              </div>
            </div>
          </div>

          {/* App shell */}
          <div className="bg-[#0a0e14] flex min-h-[260px] sm:min-h-[380px] lg:min-h-[420px]">
            
            {/* Sidebar — desktop only */}
            <div className="hidden sm:flex flex-col w-[190px] lg:w-[220px] border-r border-white/[0.04] bg-[#0d1117] flex-shrink-0">
              {/* Logo */}
              <div className="px-4 py-4 border-b border-white/[0.04] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#f43f5e]/15 flex items-center justify-center">
                  <span className="text-sm">🦞</span>
                </div>
                <span className="text-white text-sm font-bold">Butlr</span>
              </div>

              {/* Nav items */}
              <nav className="flex-1 p-2.5 space-y-0.5">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" active />
                <SidebarItem icon={BarChart3} label="Usage Stats" />
                <SidebarItem icon={Package} label="Skills" />
                <SidebarItem icon={Brain} label="Memory" />
                <SidebarItem icon={Shield} label="Security" />
                <SidebarItem icon={CreditCard} label="Billing" />
                <SidebarItem icon={Settings} label="Settings" />
                <SidebarItem icon={HelpCircle} label="Support" />
              </nav>
            </div>

            {/* Main content */}
            <div className="flex-1 p-3 sm:p-5 lg:p-6 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <h3 className="text-white text-xs sm:text-sm font-semibold">Good afternoon 👋</h3>
                  <p className="text-gray-600 text-[9px] sm:text-xs"><span className="text-gray-400">@lululu</span> is <span className="text-emerald-400">online and ready</span></p>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2AABEE] text-white text-[10px] font-medium">
                  <TgIcon className="w-3 h-3" />
                  Chat with lululu
                </div>
              </div>

              {/* 4 stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3 sm:mb-4">
                <MiniStat icon={Activity} label="Bot" value="Online" valueColor="text-emerald-400" />
                <MiniStat icon={Server} label="VM" value="Running" valueColor="text-emerald-400" />
                <MiniStat icon={Zap} label="Uptime" value="99.8%" valueColor="text-white" />
                <MiniStat icon={Clock} label="VM Uptime" value="14d 6h" valueColor="text-white" />
              </div>

              {/* Bot + VM cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {/* Bot card */}
                <div className="bg-[#111827] border border-gray-800/60 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                      <span className="text-sm sm:text-base">🦞</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs sm:text-sm font-semibold">lululu</p>
                      <p className="text-gray-500 text-[9px] sm:text-[10px]">@lululu</p>
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-emerald-400 text-[8px] sm:text-[9px] font-medium">Online</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-[9px] sm:text-[10px] mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Active</span>
                      <span className="text-gray-400">2 min ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Messages today</span>
                      <span className="text-gray-400">47</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-gray-700 text-gray-400 text-[9px] sm:text-[10px]">
                      <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      Restart
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-[#f43f5e] text-white text-[9px] sm:text-[10px] font-medium">
                      <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      Telegram
                    </div>
                  </div>
                </div>

                {/* VM card */}
                <div className="bg-[#111827] border border-gray-800/60 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                      <Server className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs sm:text-sm font-semibold">Virtual Machine</p>
                      <p className="text-gray-500 text-[9px] sm:text-[10px]">Dedicated instance</p>
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-emerald-400 text-[8px] sm:text-[9px] font-medium">Healthy</span>
                    </div>
                  </div>
                  {/* CPU + Memory bars */}
                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="flex justify-between text-[8px] sm:text-[9px] mb-1">
                        <span className="text-gray-500">CPU</span>
                        <span className="text-gray-400">12%</span>
                      </div>
                      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#f43f5e] rounded-full" style={{ width: '12%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[8px] sm:text-[9px] mb-1">
                        <span className="text-gray-500">Memory</span>
                        <span className="text-gray-400">34%</span>
                      </div>
                      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#f43f5e] rounded-full" style={{ width: '34%' }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                    <span className="text-gray-500">IP</span>
                    <code className="text-gray-400 bg-gray-800/60 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px]">46.225.191.212</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating breakout — Telegram */}
      <div className="absolute left-2 sm:-left-6 bottom-6 sm:bottom-10 z-30 animate-[float_6s_ease-in-out_infinite]">
        <div className="bg-[#0d1117]/95 rounded-xl p-2.5 sm:p-3 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl max-w-[170px] sm:max-w-[220px]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TgIcon className="w-3.5 h-3.5 text-[#2AABEE]" />
            <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium">Telegram</span>
          </div>
          <p className="text-white text-[10px] sm:text-xs leading-relaxed">&quot;Deploy the new homepage to production&quot;</p>
          <div className="flex items-center gap-1 mt-1.5">
            <div className="w-1 h-1 rounded-full bg-emerald-400" />
            <span className="text-[8px] sm:text-[9px] text-emerald-400 font-medium">Done in 42s</span>
          </div>
        </div>
      </div>

      {/* Floating breakout — Terminal */}
      <div className="absolute right-2 sm:-right-4 top-14 sm:top-10 z-30 animate-[float_6s_ease-in-out_infinite_1.5s]">
        <div className="bg-[#0d1117]/95 rounded-xl p-2.5 sm:p-3 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl max-w-[170px] sm:max-w-[230px]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Terminal className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
            <span className="text-[9px] sm:text-[10px] text-gray-500 font-mono">terminal</span>
          </div>
          <div className="font-mono text-[9px] sm:text-[10px] space-y-0.5">
            <p className="text-gray-500"><span className="text-emerald-400">$</span> git pull origin main</p>
            <p className="text-gray-500"><span className="text-emerald-400">$</span> npm run build</p>
            <p className="text-emerald-400">✓ Deployed to production</p>
          </div>
        </div>
      </div>

      {/* Floating breakout — Memory */}
      <div className="absolute left-4 sm:left-[15%] top-2 sm:-top-2 z-30 animate-[float_6s_ease-in-out_infinite_0.8s]">
        <div className="bg-[#0d1117]/95 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400" />
            <span className="text-[9px] sm:text-[10px] text-purple-300/70 font-medium">Deploys via npm + git</span>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute -bottom-8 left-0 right-0 h-32 bg-gradient-to-t from-[#06090d] to-transparent pointer-events-none" />
    </div>
  );
}


/* ─── Sidebar Item ─── */

function SidebarItem({ icon: Icon, label, active }: { icon: any; label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[11px] ${
      active
        ? 'bg-[#f43f5e]/10 text-[#fb7185]'
        : 'text-gray-500'
    }`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="font-medium truncate">{label}</span>
    </div>
  );
}


/* ─── Mini Stat Card ─── */

function MiniStat({ icon: Icon, label, value, valueColor }: { icon: any; label: string; value: string; valueColor: string }) {
  return (
    <div className="bg-[#111827] border border-gray-800/60 rounded-lg p-2 sm:p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-gray-500" />
        <span className="text-[8px] sm:text-[9px] text-gray-500">{label}</span>
      </div>
      <p className={`text-[11px] sm:text-sm font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}


/* ─── Telegram Icon ─── */

function TgIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
}
