'use client';

import { Sparkles, Brain } from 'lucide-react';

interface Update {
  id: string;
  date: string;
  tag: 'new' | 'improved' | 'fixed' | 'design';
  title: string;
  description: string;
  icon?: string;
  customIcon?: 'brain';
}

const TAG_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: 'bg-emerald-500/15 border-emerald-500/20', text: 'text-emerald-400', label: 'New' },
  improved: { bg: 'bg-blue-500/15 border-blue-500/20', text: 'text-blue-400', label: 'Improved' },
  fixed: { bg: 'bg-amber-500/15 border-amber-500/20', text: 'text-amber-400', label: 'Fixed' },
  design: { bg: 'bg-purple-500/15 border-purple-500/20', text: 'text-purple-400', label: 'Design' },
};

// Changelog entries — add new ones at the top
const UPDATES: Update[] = [
  {
    id: '15',
    date: '2026-02-23',
    tag: 'design',
    title: 'Activity Heatmap',
    description: 'GitHub-style activity grid on Usage page — see your bot usage across the entire year with color-coded intensity and hover tooltips.',
    icon: '📊',
  },
  {
    id: '14',
    date: '2026-02-23',
    tag: 'design',
    title: 'Skeleton Loading',
    description: 'Every page now loads with smooth, page-specific skeleton placeholders instead of generic spinners.',
    icon: '✨',
  },
  {
    id: '13',
    date: '2026-02-23',
    tag: 'improved',
    title: 'Graceful Memory Cancellation',
    description: 'Deactivating memory no longer cuts off instantly — stays active until the end of your billing period.',
    customIcon: 'brain',
  },
  {
    id: '12',
    date: '2026-02-23',
    tag: 'fixed',
    title: 'Memory Re-Activation',
    description: 'Re-enabling memory after deactivation now works instantly — no full reinstall required.',
    customIcon: 'brain',
  },
  {
    id: '11',
    date: '2026-02-23',
    tag: 'new',
    title: 'Memory Dashboard',
    description: 'View, search, and filter your butler\'s memories by category. 12 auto-detected categories with keyword matching in English and German.',
    customIcon: 'brain',
  },
  {
    id: '10',
    date: '2026-02-23',
    tag: 'design',
    title: 'Nebula Background',
    description: 'Dashboard and sidebar now feature animated nebula canvas effects with subtle particle movement.',
    icon: '🌌',
  },
  {
    id: '9',
    date: '2026-02-23',
    tag: 'new',
    title: 'Token Usage Tracking',
    description: 'Input, output, and total token stats collected from your VM and displayed on the Usage page.',
    icon: '🪙',
  },
  {
    id: '8',
    date: '2026-02-23',
    tag: 'fixed',
    title: 'Support Tickets',
    description: 'Fixed ticket submission (customer ID wasn\'t saved), history loading (type mismatch), and reply forwarding (regex bug).',
    icon: '🎫',
  },
  {
    id: '7',
    date: '2026-02-22',
    tag: 'design',
    title: 'SoulVault Redesign',
    description: 'Replaced emoji icons with unique robot avatars, new red/coral theme, and full personality previews.',
    icon: '🤖',
  },
  {
    id: '6',
    date: '2026-02-22',
    tag: 'improved',
    title: 'Onboarding Hardened',
    description: '9 failure modes identified and 7 fixed — VM cleanup on failure, crash recovery, retry button, idempotent provisioning.',
    icon: '🛡️',
  },
  {
    id: '5',
    date: '2026-02-22',
    tag: 'improved',
    title: 'Settings Page',
    description: 'Cleaner 2-column layout, real-time VM connection status, and model selector with live switching.',
    icon: '⚙️',
  },
  {
    id: '4',
    date: '2026-02-21',
    tag: 'new',
    title: 'Support System',
    description: 'Submit support tickets from the dashboard or via /support in Telegram. Admin replies forwarded directly to your bot.',
    icon: '🎫',
  },
  {
    id: '3',
    date: '2026-02-21',
    tag: 'new',
    title: 'Skills Marketplace',
    description: 'Browse and install integrations for your butler — one click to add Notion, GitHub, Gmail, and more.',
    icon: '🧩',
  },
  {
    id: '2',
    date: '2026-02-21',
    tag: 'new',
    title: 'SoulVault',
    description: 'Choose from 978 AI personalities across 14 categories to give your butler a unique character.',
    icon: '👻',
  },
  {
    id: '1',
    date: '2026-02-20',
    tag: 'new',
    title: 'Butlr Dashboard',
    description: 'Your personal AI butler control center — manage settings, billing, usage stats, and security from one place.',
    icon: '🦞',
  },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function UpdateIcon({ update }: { update: Update }) {
  if (update.customIcon === 'brain') {
    return (
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/10 flex items-center justify-center group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
        <Brain className="w-5 h-5 text-purple-400" />
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl group-hover:bg-white/10 transition-colors">
      {update.icon}
    </div>
  );
}

export default function ChangelogPage() {
  // Group by date
  const grouped = UPDATES.reduce<Record<string, Update[]>>((acc, u) => {
    if (!acc[u.date]) acc[u.date] = [];
    acc[u.date].push(u);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Changelog</h1>
          <p className="text-gray-500 text-sm">What&apos;s new and improved in Butlr</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-purple-500/30 via-gray-800 to-transparent" />

        {sortedDates.map((date) => (
          <div key={date} className="mb-10">
            {/* Date header */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#0d1117] border-2 border-purple-500/30 flex items-center justify-center z-10">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              </div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                {formatDate(date)}
              </h2>
            </div>

            {/* Updates for this date */}
            <div className="ml-[50px] space-y-3">
              {grouped[date].map((update) => {
                const style = TAG_STYLES[update.tag] || TAG_STYLES.new;
                return (
                  <div
                    key={update.id}
                    className="group rounded-xl bg-[#0d1117]/80 border border-white/[0.04] p-4 hover:border-white/[0.08] hover:bg-[#0d1117] transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <UpdateIcon update={update} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-white font-medium">{update.title}</span>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">{update.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
