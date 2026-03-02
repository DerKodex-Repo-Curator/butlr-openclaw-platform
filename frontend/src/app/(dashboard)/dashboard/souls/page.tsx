'use client';

import { useState, useEffect } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Check, Loader2, Eye, X } from 'lucide-react';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { SkillsSkeleton } from '@/components/dashboard/LoadingSpinner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

// DiceBear avatar URL generator
const AVATAR_STYLES = ['bottts-neutral', 'shapes'];
const AVATAR_COLORS = ['f43f5e', '6ab3f3', '8b5cf6', '10b981', 'f59e0b', 'ec4899', '06b6d4'];

function getAvatar(name: string, size = 48): string {
  // Use name as seed for consistent avatars
  const colorIndex = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(name)}&size=${size}&backgroundColor=${AVATAR_COLORS[colorIndex]}`;
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('butlr_token') : null;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

interface Soul {
  id: number;
  name: string;
  emoji: string;
  description: string;
  soul_content: string;
  downloads: number;
  rating_avg: number;
  rating_count: number;
  category_name: string;
  category_emoji: string;
}

interface Category {
  id: number;
  name: string;
  emoji: string;
  slug: string;
  count: number;
}

export default function SoulsPage() {
  const [souls, setSouls] = useState<Soul[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<number | null>(null);
  const [installed, setInstalled] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [previewSoul, setPreviewSoul] = useState<Soul | null>(null);
  const [error, setError] = useState('');
  const [activeSoul, setActiveSoul] = useState<{name: string; preview: string} | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchActiveSoul();
  }, []);

  useEffect(() => {
    fetchSouls();
  }, [page, selectedCategory, search]);

  const fetchActiveSoul = async () => {
    try {
      const res = await fetch(`${API_BASE}/souls/installed`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.installed) setActiveSoul({ name: data.name, preview: data.preview });
      }
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/souls/categories`);
      if (res.ok) setCategories(await res.json());
    } catch {}
  };

  const fetchSouls = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (selectedCategory) params.set('category', selectedCategory);
      if (search) params.set('search', search);
      const res = await fetch(`${API_BASE}/souls/catalog?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSouls(data.souls || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch {
      setSouls([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (soul: Soul) => {
    if (!confirm(`Install "${soul.name}" as your butler's personality? This will replace the current one.`)) return;
    setInstalling(soul.id);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/souls/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ soul_id: soul.id }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        setError(text || `Install failed (HTTP ${res.status})`);
        return;
      }
      if (res.ok && data.success) {
        setInstalled(soul.id);
        setActiveSoul({ name: soul.name, preview: '' });
        setTimeout(() => setInstalled(null), 5000);
      } else {
        setError(data.detail || 'Install failed');
      }
    } catch (err: any) {
      setError(err.message || 'Install failed');
    } finally {
      setInstalling(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSouls();
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={getAvatar('SoulVault-Logo', 40)}
              alt="SoulVault"
              className="w-10 h-10 rounded-xl"
            />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0a0f1a] animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">SoulVault</h1>
            <p className="text-gray-500 text-sm">
              {total} AI personalities — choose who your butler becomes
            </p>
          </div>
        </div>
      </div>

      {/* Active Personality */}
      {activeSoul && (
        <div className="mb-4 p-3 bg-[#f43f5e]/5 border border-[#f43f5e]/20 rounded-xl flex items-center gap-3">
          <img
            src={`https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(activeSoul.name)}&size=36&backgroundColor=f43f5e`}
            alt=""
            className="w-9 h-9 rounded-lg"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Currently active</p>
            <p className="text-sm font-medium text-white truncate">{activeSoul.name}</p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full font-medium">Active</span>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#f43f5e] transition" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search personalities..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#111827] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#f43f5e]/50 focus:shadow-[0_0_20px_rgba(244,63,94,0.1)] text-sm transition-all"
          />
        </div>
      </form>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        <button
          onClick={() => { setSelectedCategory(null); setPage(1); }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            !selectedCategory
              ? 'bg-[#f43f5e] text-white shadow-lg shadow-[#f43f5e]/25'
              : 'bg-[#111827] text-gray-400 border border-gray-800 hover:border-gray-700'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => { setSelectedCategory(cat.slug); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.slug
                ? 'bg-[#f43f5e] text-white shadow-lg shadow-[#f43f5e]/25'
                : 'bg-[#111827] text-gray-400 border border-gray-800 hover:border-gray-700'
            }`}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Success */}
      {installed && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          Personality installed! Your butler is restarting with the new personality...
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <SkillsSkeleton />
      ) : souls.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No personalities found. Try a different search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {souls.map((soul) => (
            <div
              key={soul.id}
              className="group bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-[#f43f5e]/30 hover:shadow-[0_0_20px_rgba(244,63,94,0.05)] transition-all flex flex-col"
            >
              {/* Header with Avatar */}
              <div className="flex items-start gap-3 mb-3">
                <img
                  src={getAvatar(soul.name, 48)}
                  alt={soul.name}
                  className="w-11 h-11 rounded-xl flex-shrink-0 ring-1 ring-gray-800 group-hover:ring-[#f43f5e]/30 transition-all"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{soul.name}</h3>
                      <span className="text-[10px] text-gray-500">
                        {soul.category_emoji} {soul.category_name}
                      </span>
                    </div>
                    {installed === soul.id && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full font-medium flex-shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-400 mb-3 line-clamp-2 flex-1">{soul.description}</p>

              {/* Stats */}
              <div className="flex items-center gap-3 mb-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  {soul.downloads > 1000 ? `${(soul.downloads / 1000).toFixed(0)}k` : soul.downloads}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-amber-400">★</span>
                  {soul.rating_avg?.toFixed(1) || '—'}
                </span>
                <span>{soul.rating_count} reviews</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => setPreviewSoul(soul)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0d1117] border border-gray-700 rounded-lg text-gray-300 text-xs hover:bg-gray-800 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
                <button
                  onClick={() => handleInstall(soul)}
                  disabled={installing === soul.id}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f43f5e]/20 border border-[#f43f5e]/30 text-[#fb7185] rounded-lg text-xs font-medium hover:bg-[#f43f5e]/30 transition-colors disabled:opacity-50"
                >
                  {installing === soul.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>🦞</span>
                  )}
                  {installing === soul.id ? 'Installing...' : 'Install'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 bg-[#111827] border border-gray-800 rounded-lg text-gray-400 text-sm disabled:opacity-30 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          <span className="text-gray-500 text-sm">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-2 bg-[#111827] border border-gray-800 rounded-lg text-gray-400 text-sm disabled:opacity-30 hover:text-white transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {previewSoul && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewSoul(null)}>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <img
                  src={getAvatar(previewSoul.name, 56)}
                  alt={previewSoul.name}
                  className="w-14 h-14 rounded-xl ring-2 ring-[#f43f5e]/20"
                />
                <div>
                  <h3 className="text-lg font-semibold text-white">{previewSoul.name}</h3>
                  <span className="text-xs text-gray-500">{previewSoul.category_emoji} {previewSoul.category_name}</span>
                </div>
              </div>
              <button onClick={() => setPreviewSoul(null)} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto max-h-[50vh]">
              <p className="text-gray-300 text-sm mb-4">{previewSoul.description}</p>
              <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-xs text-gray-400 whitespace-pre-wrap border border-gray-800">
                {previewSoul.soul_content || 'No content available'}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setPreviewSoul(null)}
                className="flex-1 px-4 py-2.5 bg-[#0d1117] border border-gray-700 rounded-xl text-gray-300 text-sm hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { handleInstall(previewSoul); setPreviewSoul(null); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f43f5e] text-white rounded-xl text-sm font-medium hover:bg-[#e11d48] hover:shadow-[0_0_30px_rgba(244,63,94,0.3)] transition-all"
              >
                🦞 Install Personality
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
