'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  Loader2,
  Trash2,
  Download,
  Pause,
  Play,
  Power,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  UserCheck,
  Calendar,
  Heart,
  MessageCircle,
  Shield,
  X,
  Zap,
  Search,
  Filter,
  TrendingUp,
  Clock,
  BarChart3,
  Lightbulb,
  Star,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { MemorySkeleton } from '@/components/dashboard/LoadingSpinner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

interface Memory {
  id: string;
  text: string;
  category: string;
  created_at: string;
}

interface MemoryStatus {
  active: boolean;
  status: string;
  memories_count: number;
  categories: number;
  activated_at: string | null;
  active_until: string | null;
  last_memory: string | null;
}

const CATEGORY_CONFIG: Record<string, { color: string; emoji: string; label: string }> = {
  personal: { color: '#f43f5e', emoji: '👤', label: 'Personal' },
  food: { color: '#f59e0b', emoji: '🍽️', label: 'Food & Drinks' },
  work: { color: '#6ab3f3', emoji: '💼', label: 'Work' },
  people: { color: '#8b5cf6', emoji: '👥', label: 'People' },
  places: { color: '#10b981', emoji: '📍', label: 'Places' },
  health: { color: '#ef4444', emoji: '❤️', label: 'Health' },
  hobbies: { color: '#14b8a6', emoji: '🎮', label: 'Hobbies' },
  preferences: { color: '#f97316', emoji: '⚙️', label: 'Preferences' },
  routines: { color: '#6366f1', emoji: '🔄', label: 'Routines' },
  events: { color: '#ec4899', emoji: '📅', label: 'Events' },
  projects: { color: '#0ea5e9', emoji: '🔧', label: 'Projects' },
  general: { color: '#6b7280', emoji: '💡', label: 'General' },
};

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('butlr_token') : null;
}

async function memoryApi(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/memory${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  return res.json();
}

// ==================== INACTIVE STATE (UPSELL) ====================

function MemoryInactive({ onActivate, loading }: { onActivate: () => void; loading: boolean }) {
  const features = [
    {
      icon: Brain,
      title: 'Learns Who You Are',
      description: 'Remembers your name, preferences, and the things that matter to you — across every conversation.',
      color: '#8b5cf6',
    },
    {
      icon: MessageCircle,
      title: 'Smarter Conversations',
      description: 'References past topics naturally. No more repeating yourself — your butler picks up where you left off.',
      color: '#6ab3f3',
    },
    {
      icon: Calendar,
      title: 'Tracks What Matters',
      description: 'Birthdays, deadlines, events, contacts — organized by category and always at your butler\'s fingertips.',
      color: '#f59e0b',
    },
    {
      icon: Shield,
      title: '100% Private',
      description: 'Memories are stored on your dedicated VM. We don\'t train on your data. Delete everything with one click.',
      color: '#10b981',
    },
  ];

  const categories = [
    { emoji: '👤', label: 'Personal', example: '"Speaks German and English"' },
    { emoji: '👥', label: 'People', example: '"Mom\'s birthday is March 15"' },
    { emoji: '💼', label: 'Work', example: '"Works at a tech startup"' },
    { emoji: '📍', label: 'Places', example: '"Lives in Lisbon"' },
    { emoji: '⚙️', label: 'Preferences', example: '"Prefers dark mode"' },
    { emoji: '🔧', label: 'Projects', example: '"Building a trading bot"' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-[#0d1117] via-[#111827] to-[#0d1117]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-48 bg-[#8b5cf6]/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-64 h-32 bg-[#f43f5e]/5 rounded-full blur-[80px]" />
        
        <div className="relative p-8 sm:p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#f43f5e]/20 border border-[#8b5cf6]/30 flex items-center justify-center">
              <Brain className="w-6 h-6 text-[#8b5cf6]" />
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
              <Sparkles className="w-3.5 h-3.5 text-[#8b5cf6]" />
              <span className="text-[#8b5cf6] text-xs font-medium">Add-on</span>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Supercharge your butler with Memory
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
            Your butler already understands you. With Memory, it <span className="text-white font-medium">remembers</span> you — 
            building a personal knowledge base that makes every interaction smarter, faster, and more personal.
          </p>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {features.map((f, i) => (
          <div
            key={i}
            className="p-5 rounded-xl bg-[#0d1117] border border-gray-800 hover:border-gray-700 transition-all group"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: `${f.color}15`, border: `1px solid ${f.color}30` }}
            >
              <f.icon className="w-5 h-5" style={{ color: f.color }} />
            </div>
            <h3 className="text-white font-semibold mb-1.5">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>

      {/* Category Preview */}
      <div className="rounded-xl border border-gray-800 bg-[#0d1117] overflow-hidden">
        <div className="p-5 border-b border-gray-800/50">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            Auto-organized by category
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Memories are automatically categorized — no manual tagging needed.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-gray-800/50">
          {categories.map((c, i) => (
            <div key={i} className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">{c.emoji}</span>
                <span className="text-white text-sm font-medium">{c.label}</span>
              </div>
              <p className="text-gray-600 text-xs italic">{c.example}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Before/After Comparison */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-[#0d1117] border border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="w-4 h-4 text-gray-600" />
            <p className="text-gray-500 text-xs font-mono uppercase tracking-wider">Without Memory</p>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-gray-800/30">
              <p className="text-gray-500 text-sm">You: <span className="text-gray-400">&quot;Remember I&apos;m allergic to peanuts&quot;</span></p>
            </div>
            <div className="p-3 rounded-lg bg-gray-800/30">
              <p className="text-gray-500 text-sm">Butler: <span className="text-gray-400">&quot;Got it!&quot;</span></p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <p className="text-gray-600 text-sm italic">Next conversation...</p>
              <p className="text-gray-500 text-sm mt-1">You: <span className="text-gray-400">&quot;Find me a Thai place&quot;</span></p>
              <p className="text-red-400/60 text-sm mt-1">Butler suggests dishes with peanuts 😬</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#0d1117] border border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-emerald-400 text-xs font-mono uppercase tracking-wider">With Memory</p>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-gray-800/30">
              <p className="text-gray-500 text-sm">You: <span className="text-gray-400">&quot;Find me a Thai place&quot;</span></p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-emerald-300 text-sm">Butler: <span className="text-emerald-200">&quot;Here are some great Thai restaurants — I made sure to filter out dishes with peanuts since you&apos;re allergic.&quot;</span> ✨</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                <span className="text-red-400 text-xs">❤️ health</span>
              </div>
              <span className="text-gray-600 text-xs">Auto-saved: &quot;allergic to peanuts&quot;</span>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-gray-800 bg-[#0d1117] p-6">
        <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          How it works
        </h3>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              step: '1',
              title: 'Just chat naturally',
              desc: 'Talk to your butler as usual. Memory works silently in the background.',
            },
            {
              step: '2',
              title: 'Key facts are saved',
              desc: 'AI extracts important information — preferences, people, events — and stores them securely.',
            },
            {
              step: '3',
              title: 'Context is recalled',
              desc: 'In future conversations, relevant memories are injected automatically. Zero effort from you.',
            },
          ].map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#8b5cf6] text-sm font-bold">{s.step}</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium mb-1">{s.title}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center space-y-4">
        <button
          onClick={onActivate}
          disabled={loading}
          className="group relative px-8 py-4 bg-gradient-to-r from-[#8b5cf6] to-[#f43f5e] rounded-xl font-semibold text-white text-lg transition-all hover:shadow-[0_0_40px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Activating Memory...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Activate Memory — $10/mo
            </span>
          )}
        </button>

        <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
          <span>✓ Cancel anytime</span>
          <span>·</span>
          <span>✓ Delete all data with one click</span>
          <span>·</span>
          <span>✓ GDPR compliant</span>
        </div>
      </div>
    </div>
  );
}

// ==================== ACTIVE STATE ====================

function MemoryActive({
  status,
  onRefresh,
}: {
  status: MemoryStatus;
  onRefresh: () => void;
}) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const limit = 12;

  const fetchMemories = async (p: number) => {
    setLoading(true);
    const data = await memoryApi(`/list?page=${p}&limit=${limit}`);
    setMemories(data.memories || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchMemories(page);
  }, [page]);

  // Get unique categories from current memories
  const categoryBreakdown = memories.reduce<Record<string, number>>((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {});

  // Filter memories
  const filteredMemories = memories.filter((m) => {
    if (filterCategory && m.category !== filterCategory) return false;
    if (searchQuery && !m.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const deleteMemory = async (id: string) => {
    setActionLoading(id);
    await memoryApi(`/${id}`, { method: 'DELETE' });
    setMemories((prev) => prev.filter((m) => m.id !== id));
    setTotal((prev) => prev - 1);
    setActionLoading(null);
  };

  const deleteAll = async () => {
    setActionLoading('all');
    await memoryApi('/all', { method: 'DELETE' });
    setMemories([]);
    setTotal(0);
    setShowDeleteAll(false);
    setActionLoading(null);
    onRefresh();
  };

  const pauseResume = async () => {
    const endpoint = status.status === 'paused' ? '/resume' : '/pause';
    setActionLoading('pause');
    await memoryApi(endpoint, { method: 'POST' });
    setActionLoading(null);
    onRefresh();
  };

  const deactivate = async () => {
    setActionLoading('deactivate');
    try {
      const result = await memoryApi('/deactivate', { method: 'POST' });
      if (result?.message) {
        alert(result.message);
      }
    } catch (e) {
      // handled by memoryApi
    }
    setActionLoading(null);
    onRefresh();
  };

  const exportMemories = async () => {
    setActionLoading('export');
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/memory/export`, {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'butlr-memories.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
    setActionLoading(null);
  };

  const totalPages = Math.ceil(total / limit);
  const isPaused = status.status === 'paused';
  const daysSinceActivation = status.activated_at
    ? Math.floor((Date.now() - new Date(status.activated_at).getTime()) / 86400000)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#8b5cf6]/10 to-[#8b5cf6]/5 border border-[#8b5cf6]/20">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-[#8b5cf6]" />
            <p className="text-gray-400 text-xs font-medium">Memories</p>
          </div>
          <p className="text-2xl font-bold text-white">{status.memories_count}</p>
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${isPaused ? 'from-amber-500/10 to-amber-500/5 border-amber-500/20' : 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20'} border`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
            <p className="text-gray-400 text-xs font-medium">Status</p>
          </div>
          <p className={`text-lg font-semibold ${isPaused ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isPaused ? 'Paused' : 'Learning'}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#f43f5e]/10 to-[#f43f5e]/5 border border-[#f43f5e]/20">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-[#f43f5e]" />
            <p className="text-gray-400 text-xs font-medium">Categories</p>
          </div>
          <p className="text-2xl font-bold text-white">{status.categories || Object.keys(categoryBreakdown).length}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-500/10 to-gray-500/5 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <p className="text-gray-400 text-xs font-medium">Active for</p>
          </div>
          <p className="text-lg font-semibold text-white">
            {daysSinceActivation === 0 ? 'Today' : `${daysSinceActivation}d`}
          </p>
        </div>
      </div>

      {/* Category Breakdown (only show if we have memories) */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !filterCategory
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-transparent text-gray-500 border border-gray-800 hover:border-gray-700 hover:text-gray-400'
            }`}
          >
            All ({total})
          </button>
          {Object.entries(categoryBreakdown)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => {
              const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general;
              const isActive = filterCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(isActive ? null : cat)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                  style={{
                    backgroundColor: isActive ? `${cfg.color}20` : 'transparent',
                    borderColor: isActive ? `${cfg.color}40` : '#374151',
                    color: isActive ? cfg.color : '#6b7280',
                  }}
                >
                  {cfg.emoji} {cfg.label} ({count})
                </button>
              );
            })}
        </div>
      )}

      {/* Memory List */}
      <div className="rounded-xl border border-gray-800 bg-[#0d1117] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#8b5cf6]" />
            <h3 className="text-white font-medium">Stored Memories</h3>
            <span className="text-gray-600 text-sm">({filteredMemories.length})</span>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm bg-gray-800/50 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-600 w-40 sm:w-56"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#8b5cf6] mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Loading memories...</p>
            </div>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="text-center py-16">
            <Brain className="w-12 h-12 text-gray-800 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {searchQuery || filterCategory ? 'No memories match your filter' : 'No memories yet'}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {searchQuery || filterCategory
                ? 'Try a different search or category'
                : 'Just chat with your butler — memories appear automatically.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {filteredMemories.map((m) => {
              const cfg = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.general;
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-3 p-4 hover:bg-white/[0.015] transition-colors group"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="text-base">{cfg.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 text-sm leading-relaxed">{m.text}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-md font-medium"
                        style={{
                          backgroundColor: `${cfg.color}12`,
                          color: cfg.color,
                          border: `1px solid ${cfg.color}25`,
                        }}
                      >
                        {cfg.label}
                      </span>
                      {m.created_at && (
                        <span className="text-gray-600 text-xs">
                          {new Date(m.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMemory(m.id)}
                    disabled={actionLoading === m.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400"
                    title="Forget this memory"
                  >
                    {actionLoading === m.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-800">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-gray-600 text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={exportMemories}
          disabled={actionLoading === 'export'}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0d1117] border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition-all text-sm"
        >
          {actionLoading === 'export' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export
        </button>
        <button
          onClick={pauseResume}
          disabled={actionLoading === 'pause'}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0d1117] border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition-all text-sm"
        >
          {actionLoading === 'pause' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPaused ? (
            <Play className="w-4 h-4" />
          ) : (
            <Pause className="w-4 h-4" />
          )}
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={() => setShowDeleteAll(true)}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0d1117] border border-gray-800 text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-all text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Forget All
        </button>
        <button
          onClick={deactivate}
          disabled={actionLoading === 'deactivate' || status.status === 'cancelling'}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0d1117] border border-gray-800 transition-all text-sm ${status.status === 'cancelling' ? 'text-orange-400 border-orange-500/20 cursor-not-allowed opacity-60' : 'text-gray-400 hover:text-red-400 hover:border-red-500/30'}`}
        >
          {actionLoading === 'deactivate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
          {status.status === 'cancelling' ? 'Cancelling...' : 'Deactivate'}
        </button>
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Forget Everything?</h3>
              <button onClick={() => setShowDeleteAll(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              This will permanently delete all {total} memories. Your butler will lose everything it has learned about you. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAll(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={deleteAll}
                disabled={actionLoading === 'all'}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                {actionLoading === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function MemoryPage() {
  const [status, setStatus] = useState<MemoryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    const data = await memoryApi('/status');
    setStatus(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const result = await memoryApi('/activate', { method: 'POST' });
      if (result.success) {
        await fetchStatus();
      } else {
        alert(result.detail || 'Activation failed. Please try again.');
      }
    } catch (e) {
      alert('Something went wrong. Please try again.');
    }
    setActivating(false);
  };

  if (loading) {
    return <MemorySkeleton />;
  }

  const isActive = status?.active || status?.status === 'paused' || status?.status === 'cancelling';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 flex items-center justify-center">
          <Brain className="w-5 h-5 text-[#8b5cf6]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Memory</h1>
          <p className="text-gray-500 text-sm">
            {isActive
              ? `Your butler has learned ${status?.memories_count || 0} things about you`
              : 'Supercharge your butler with persistent memory'}
          </p>
        </div>
        {isActive && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
            <div className={`w-2 h-2 rounded-full ${status?.status === 'cancelling' ? 'bg-orange-500' : status?.status === 'paused' ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
            <span className={`text-sm font-medium ${status?.status === 'cancelling' ? 'text-orange-400' : status?.status === 'paused' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {status?.status === 'cancelling' ? `Active until ${status?.active_until ? new Date(status.active_until).toLocaleDateString() : 'period end'}` : status?.status === 'paused' ? 'Paused' : 'Active'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {isActive && status ? (
        <MemoryActive status={status} onRefresh={fetchStatus} />
      ) : (
        <MemoryInactive onActivate={handleActivate} loading={activating} />
      )}
    </div>
  );
}
