'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Trash2,
  Check,
  Loader2,
  Package,
  Star,
  RefreshCw,
  ExternalLink,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { SkillsSkeleton } from '@/components/dashboard/LoadingSpinner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

// Brand colors for skills
const SKILL_ICONS: Record<string, { icon: string; color: string }> = {
  // Productivity
  'linear': { icon: 'https://cdn.simpleicons.org/linear/5E6AD2', color: '#5E6AD2' },
  'notion': { icon: 'https://cdn.simpleicons.org/notion/000000', color: '#000000' },
  'todoist': { icon: 'https://cdn.simpleicons.org/todoist/E44332', color: '#E44332' },
  'google-calendar': { icon: 'https://cdn.simpleicons.org/googlecalendar/4285F4', color: '#4285F4' },
  'google-drive': { icon: 'https://cdn.simpleicons.org/googledrive/4285F4', color: '#4285F4' },
  'obsidian': { icon: 'https://cdn.simpleicons.org/obsidian/7C3AED', color: '#7C3AED' },
  'trello': { icon: 'https://cdn.simpleicons.org/trello/0052CC', color: '#0052CC' },
  'airtable': { icon: 'https://cdn.simpleicons.org/airtable/18BFFF', color: '#18BFFF' },
  // Communication
  'slack': { icon: 'https://cdn.simpleicons.org/slack/4A154B', color: '#4A154B' },
  'gmail': { icon: 'https://cdn.simpleicons.org/gmail/EA4335', color: '#EA4335' },
  'discord': { icon: 'https://cdn.simpleicons.org/discord/5865F2', color: '#5865F2' },
  'twitter': { icon: 'https://cdn.simpleicons.org/x/000000', color: '#000000' },
  'whatsapp': { icon: 'https://cdn.simpleicons.org/whatsapp/25D366', color: '#25D366' },
  'telegram-skill': { icon: 'https://cdn.simpleicons.org/telegram/26A5E4', color: '#26A5E4' },
  // Development
  'github': { icon: 'https://cdn.simpleicons.org/github/181717', color: '#181717' },
  'gitlab': { icon: 'https://cdn.simpleicons.org/gitlab/FC6D26', color: '#FC6D26' },
  'vercel': { icon: 'https://cdn.simpleicons.org/vercel/000000', color: '#000000' },
  'npm': { icon: 'https://cdn.simpleicons.org/npm/CB3837', color: '#CB3837' },
  'docker': { icon: 'https://cdn.simpleicons.org/docker/2496ED', color: '#2496ED' },
  'kubernetes': { icon: 'https://cdn.simpleicons.org/kubernetes/326CE5', color: '#326CE5' },
  'sentry': { icon: 'https://cdn.simpleicons.org/sentry/362D59', color: '#362D59' },
  // AI
  'openai': { icon: 'https://cdn.simpleicons.org/openai/412991', color: '#412991' },
  'replicate': { icon: 'https://cdn.simpleicons.org/replicate/000000', color: '#000000' },
  'stability-ai': { icon: 'https://cdn.simpleicons.org/stability%20ai/000000', color: '#000000' },
  'elevenlabs': { icon: 'https://cdn.simpleicons.org/elevenlabs/000000', color: '#000000' },
  'huggingface': { icon: 'https://cdn.simpleicons.org/huggingface/FFD21E', color: '#FFD21E' },
  'perplexity': { icon: 'https://cdn.simpleicons.org/perplexity/1FB8CD', color: '#1FB8CD' },
  // Search
  'brave-search': { icon: 'https://cdn.simpleicons.org/brave/FB542B', color: '#FB542B' },
  'tavily': { icon: '/icons/tavily.svg', color: '#6366F1' },
  'exa': { icon: '/icons/exa.svg', color: '#000000' },
  'firecrawl': { icon: '/icons/firecrawl.svg', color: '#FF6B35' },
  'jina-reader': { icon: '/icons/jina.svg', color: '#009688' },
  'wikipedia': { icon: 'https://cdn.simpleicons.org/wikipedia/000000', color: '#000000' },
  // Data
  'postgres': { icon: 'https://cdn.simpleicons.org/postgresql/4169E1', color: '#4169E1' },
  'supabase': { icon: 'https://cdn.simpleicons.org/supabase/3FCF8E', color: '#3FCF8E' },
  'mongodb': { icon: 'https://cdn.simpleicons.org/mongodb/47A248', color: '#47A248' },
  'redis': { icon: 'https://cdn.simpleicons.org/redis/DC382D', color: '#DC382D' },
  'google-sheets': { icon: 'https://cdn.simpleicons.org/googlesheets/34A853', color: '#34A853' },
  'mixpanel': { icon: 'https://cdn.simpleicons.org/mixpanel/7856FF', color: '#7856FF' },
  // Finance
  'stripe': { icon: 'https://cdn.simpleicons.org/stripe/635BFF', color: '#635BFF' },
  'coinbase': { icon: 'https://cdn.simpleicons.org/coinbase/0052FF', color: '#0052FF' },
  'plaid': { icon: 'https://cdn.simpleicons.org/plaid/000000', color: '#000000' },
  'quickbooks': { icon: 'https://cdn.simpleicons.org/quickbooks/2CA01C', color: '#2CA01C' },
  // Media
  'youtube': { icon: 'https://cdn.simpleicons.org/youtube/FF0000', color: '#FF0000' },
  'spotify': { icon: 'https://cdn.simpleicons.org/spotify/1DB954', color: '#1DB954' },
  'cloudinary': { icon: 'https://cdn.simpleicons.org/cloudinary/3448C5', color: '#3448C5' },
  'unsplash': { icon: 'https://cdn.simpleicons.org/unsplash/000000', color: '#000000' },
  'giphy': { icon: 'https://cdn.simpleicons.org/giphy/FF6666', color: '#FF6666' },
  // Smart Home
  'home-assistant': { icon: 'https://cdn.simpleicons.org/homeassistant/18BCF2', color: '#18BCF2' },
  'hue': { icon: 'https://cdn.simpleicons.org/philipshue/0065D3', color: '#0065D3' },
  'nest': { icon: 'https://cdn.simpleicons.org/googlenest/4285F4', color: '#4285F4' },
  // Utilities
  'weather': { icon: '/icons/weather.svg', color: '#FFB300' },
  'time': { icon: '/icons/time.svg', color: '#607D8B' },
  'currency': { icon: '/icons/currency.svg', color: '#4CAF50' },
  'qr-code': { icon: '/icons/qr.svg', color: '#000000' },
  'url-shortener': { icon: '/icons/link.svg', color: '#2196F3' },
};

const CATEGORY_ICONS: Record<string, string> = {
  'productivity': 'clipboard-list',
  'communication': 'message-circle',
  'development': 'code',
  'ai': 'cpu',
  'search': 'search',
  'data': 'database',
  'finance': 'credit-card',
  'media': 'play-circle',
  'smart-home': 'home',
  'utilities': 'tool',
};

interface Skill {
  slug: string;
  name: string;
  description: string;
  icon: string;
  popular?: boolean;
}

interface Category {
  name: string;
  emoji: string;
  description: string;
  skills: Skill[];
}

interface SkillsCatalog {
  categories: Record<string, Category>;
  total_skills: number;
}

function SkillIcon({ slug, icon, size = 32 }: { slug: string; icon?: string; size?: number }) {
  const [hasError, setHasError] = useState(false);
  
  // Use API icon, fallback to SKILL_ICONS, then fallback to letter
  const iconUrl = icon || SKILL_ICONS[slug]?.icon;

  // No icon URL or error loading - show fallback letter
  if (!iconUrl || hasError) {
    const letter = slug.charAt(0).toUpperCase();
    return (
      <div
        className="rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <span className="text-gray-300 font-semibold" style={{ fontSize: size * 0.4 }}>
          {letter}
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg bg-white flex items-center justify-center p-1.5 flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <img
        src={iconUrl}
        alt={slug}
        width={size - 12}
        height={size - 12}
        className="object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function SkillsMarketplacePage() {
  const [catalog, setCatalog] = useState<SkillsCatalog | null>(null);
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPopularOnly, setShowPopularOnly] = useState(false);
  const [installingSkill, setInstallingSkill] = useState<string | null>(null);
  const [uninstallingSkill, setUninstallingSkill] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('butlr_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const dashResponse = await fetch(`${API_BASE}/dashboard`, {
        headers: getAuthHeaders(),
      });

      if (!dashResponse.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const dashData = await dashResponse.json();
      // customer_id is in user.id
      const custId = parseInt(dashData.user?.id || dashData.customer_id);
      if (!custId || isNaN(custId)) {
        throw new Error('Could not determine customer ID');
      }
      setCustomerId(custId);

      const [catalogResponse, installedResponse] = await Promise.all([
        fetch(`${API_BASE}/skills/catalog`),
        fetch(`${API_BASE}/skills/installed/${custId}`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (catalogResponse.ok) {
        const catalogData = await catalogResponse.json();
        setCatalog(catalogData);
      }

      if (installedResponse.ok) {
        const installedData = await installedResponse.json();
        setInstalledSkills(installedData.installed || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    }

    setLoading(false);
  };

  const handleInstall = async (skillSlug: string) => {
    if (!customerId) return;

    setInstallingSkill(skillSlug);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/skills/install/${customerId}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skill_slug: skillSlug }),
      });

      const data = await response.json();

      if (data.success) {
        setInstalledSkills([...installedSkills, skillSlug]);
        setSuccessMessage(`Successfully installed ${skillSlug}`);
      } else {
        setError(data.message || 'Installation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed');
    }

    setInstallingSkill(null);
  };

  const handleUninstall = async (skillSlug: string) => {
    if (!customerId) return;

    if (!confirm(`Are you sure you want to uninstall ${skillSlug}?`)) {
      return;
    }

    setUninstallingSkill(skillSlug);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/skills/uninstall/${customerId}/${skillSlug}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (data.success) {
        setInstalledSkills(installedSkills.filter((s) => s !== skillSlug));
        setSuccessMessage(`Successfully uninstalled ${skillSlug}`);
      } else {
        setError(data.message || 'Uninstall failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uninstall failed');
    }

    setUninstallingSkill(null);
  };

  const getFilteredCategories = () => {
    if (!catalog) return {};

    const filtered: Record<string, Category> = {};

    for (const [key, category] of Object.entries(catalog.categories)) {
      if (selectedCategory && key !== selectedCategory) continue;

      let skills = category.skills;

      if (showPopularOnly) {
        skills = skills.filter((s) => s.popular);
      }

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        skills = skills.filter(
          (s) =>
            s.name.toLowerCase().includes(search) ||
            s.description.toLowerCase().includes(search) ||
            s.slug.toLowerCase().includes(search)
        );
      }

      if (skills.length > 0) {
        filtered[key] = { ...category, skills };
      }
    }

    return filtered;
  };

  const filteredCategories = getFilteredCategories();
  const totalFilteredSkills = Object.values(filteredCategories).reduce(
    (sum, cat) => sum + cat.skills.length,
    0
  );

  if (loading) {
    return <SkillsSkeleton />;
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Skills Marketplace</h1>
        <p className="text-gray-400 text-sm">
          Extend your butler with integrations and tools
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400">{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between text-sm">
          <span className="text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Installed Skills */}
      {installedSkills.length > 0 && (
        <div className="mb-6 p-4 bg-[#111827] border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-sm font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Installed ({installedSkills.length})
            </h3>
            <button
              onClick={loadData}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {installedSkills.map((slug) => (
              <div
                key={slug}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
              >
                <SkillIcon slug={slug} size={20} />
                <span className="text-emerald-400 text-sm">{slug}</span>
                <button
                  onClick={() => handleUninstall(slug)}
                  disabled={uninstallingSkill === slug}
                  className="text-gray-500 hover:text-red-400 transition-colors ml-1"
                >
                  {uninstallingSkill === slug ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#111827] border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-700 transition-colors"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowPopularOnly(!showPopularOnly)}
            className={`px-3 py-2.5 rounded-lg border text-sm transition-colors flex items-center gap-1.5 ${
              showPopularOnly
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                : 'border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Popular
          </button>

          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-3 py-2.5 bg-[#111827] border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-gray-700 transition-colors min-w-[140px]"
          >
            <option value="">All Categories</option>
            {catalog &&
              Object.entries(catalog.categories).map(([key, cat]) => (
                <option key={key} value={key}>
                  {cat.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-gray-500 text-xs mb-4">
        {totalFilteredSkills} skills
        {selectedCategory && ` in ${catalog?.categories[selectedCategory]?.name}`}
        {searchTerm && ` matching "${searchTerm}"`}
      </p>

      {/* Skills Grid */}
      <div className="space-y-8">
        {Object.entries(filteredCategories).map(([key, category]) => (
          <div key={key}>
            <h2 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">
              {category.name}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {category.skills.map((skill) => {
                const isInstalled = installedSkills.includes(skill.slug);
                const isInstalling = installingSkill === skill.slug;
                const isUninstalling = uninstallingSkill === skill.slug;

                return (
                  <div
                    key={skill.slug}
                    className={`bg-[#111827] border rounded-xl p-4 transition-all flex flex-col h-full ${
                      isInstalled
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    {/* Header with icon and title */}
                    <div className="flex items-start gap-3 mb-2">
                      <SkillIcon slug={skill.slug} icon={skill.icon} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white text-sm truncate">
                            {skill.name}
                          </h3>
                          {skill.popular && (
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                          )}
                          {isInstalled && (
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description - fixed height */}
                    <p className="text-gray-500 text-xs line-clamp-2 flex-1 mb-3">
                      {skill.description}
                    </p>

                    {/* Button - always at bottom */}
                    {isInstalled ? (
                      <button
                        onClick={() => handleUninstall(skill.slug)}
                        disabled={isUninstalling}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:border-red-500/50 hover:text-red-400 transition-colors text-xs disabled:opacity-50 mt-auto"
                      >
                        {isUninstalling ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInstall(skill.slug)}
                        disabled={isInstalling}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-gray-700 text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-xs disabled:opacity-50 mt-auto"
                      >
                        {isInstalling ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Installing...
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3" />
                            Install
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {totalFilteredSkills === 0 && (
        <div className="text-center py-12">
          <Package className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-400 mb-1">No skills found</h3>
          <p className="text-gray-600 text-xs">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-3 bg-gray-800/30 border border-gray-800 rounded-lg">
        <p className="text-gray-500 text-xs">
          Skills extend your butler's capabilities. Some skills require API keys to be configured after installation.{' '}
          <a
            href="https://github.com/anthropics/awesome-openclaw-skills"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white inline-flex items-center gap-1"
          >
            Learn more <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  );
}
