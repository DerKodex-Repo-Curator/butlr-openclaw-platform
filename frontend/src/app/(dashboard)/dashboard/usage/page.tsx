'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  MessageSquare,
  Activity,
  TrendingUp,
  Calendar,
  BarChart3,
  Loader2,
  Cpu,
  HardDrive,
  Hash,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
} from 'lucide-react';
import { UsageSkeleton } from '@/components/dashboard/LoadingSpinner';
import ActivityGrid from '@/components/dashboard/ActivityGrid';

interface DailyBreakdown {
  date: string;
  messages: number;
  requests: number;
  tokens: number;
}

interface UsageData {
  messages_today: number;
  messages_month: number;
  api_calls_today: number;
  api_calls_month: number;
  tokens_used_today: number;
  tokens_used_month: number;
  input_tokens_today: number;
  output_tokens_today: number;
  daily_breakdown: DailyBreakdown[];
}

interface DashboardUsage {
  api_calls_today: number;
  api_calls_month: number;
  messages_processed: number;
  uptime_percentage: number;
}

interface VMData {
  cpu_usage?: number;
  memory_usage?: number;
  uptime: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}


// ============== ACTIVITY GRID (GitHub-style contribution heatmap) ==============


export default function UsagePage() {
  const [loading, setLoading] = useState(true);
  const [dashUsage, setDashUsage] = useState<DashboardUsage | null>(null);
  const [detailedUsage, setDetailedUsage] = useState<UsageData | null>(null);
  const [vm, setVm] = useState<VMData | null>(null);
  const [vmUptime, setVmUptime] = useState('0m');

  useEffect(() => {
    loadData();
  }, []);

  const getCustomerId = (): string | null => {
    // Try localStorage first
    const stored = localStorage.getItem('butlr_customer_id');
    if (stored) return stored;

    // Fallback: decode from JWT token
    const token = localStorage.getItem('butlr_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const cid = payload.customer_id || payload.sub;
      if (cid) {
        localStorage.setItem('butlr_customer_id', String(cid));
        return String(cid);
      }
    } catch {}
    return null;
  };

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem('butlr_token');
    const customerId = getCustomerId();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      // Load dashboard data (VM info, uptime)
      const dashRes = await fetch(`${API_BASE}/dashboard`, { headers });
      if (dashRes.ok) {
        const data = await dashRes.json();
        setDashUsage(data.usage);
        setVm(data.vm);
        setVmUptime(data.vm?.uptime || '0m');
      }

      // Load detailed usage (tokens, daily breakdown)
      if (customerId) {
        const usageRes = await fetch(`${API_BASE}/usage/customer/${customerId}`, { headers });
        if (usageRes.ok) {
          const data = await usageRes.json();
          setDetailedUsage(data.usage);
        }
      }
    } catch (error) {
      console.error('Failed to load usage:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <UsageSkeleton />;
  }

  const u = detailedUsage;
  const rawBreakdown = u?.daily_breakdown || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#f43f5e]/10 border border-[#f43f5e]/30 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-[#f43f5e]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Usage Statistics</h1>
          <p className="text-gray-500 text-sm">Monitor your bot activity and resource consumption</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Messages Today */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#8b5cf6]/10 to-[#8b5cf6]/5 border border-[#8b5cf6]/20">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-[#8b5cf6]" />
            <p className="text-gray-400 text-xs">Messages Today</p>
          </div>
          <p className="text-2xl font-bold text-white">{u?.messages_today || 0}</p>
          <p className="text-gray-500 text-xs mt-1">{u?.messages_month || 0} this month</p>
        </div>

        {/* API Calls */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#f43f5e]/10 to-[#f43f5e]/5 border border-[#f43f5e]/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#f43f5e]" />
            <p className="text-gray-400 text-xs">API Calls Today</p>
          </div>
          <p className="text-2xl font-bold text-white">{u?.api_calls_today || dashUsage?.api_calls_today || 0}</p>
          <p className="text-gray-500 text-xs mt-1">{u?.api_calls_month || dashUsage?.api_calls_month || 0} this month</p>
        </div>

        {/* Tokens Today */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-amber-400" />
            <p className="text-gray-400 text-xs">Tokens Today</p>
          </div>
          <p className="text-2xl font-bold text-white">{formatTokens(u?.tokens_used_today || 0)}</p>
          <p className="text-gray-500 text-xs mt-1">{formatTokens(u?.tokens_used_month || 0)} this month</p>
        </div>

        {/* Uptime */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <p className="text-gray-400 text-xs">Uptime</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{dashUsage?.uptime_percentage || 0}%</p>
          <p className="text-gray-500 text-xs mt-1">VM: {vmUptime}</p>
        </div>
      </div>

      {/* Token Breakdown */}
      <div className="grid lg:grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-[#0d1117] border border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
            <p className="text-gray-400 text-sm font-medium">Input Tokens</p>
          </div>
          <p className="text-xl font-bold text-white">{formatTokens(u?.input_tokens_today || 0)}</p>
          <p className="text-gray-600 text-xs mt-1">Prompt + context sent to the model</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0d1117] border border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
            <p className="text-gray-400 text-sm font-medium">Output Tokens</p>
          </div>
          <p className="text-xl font-bold text-white">{formatTokens(u?.output_tokens_today || 0)}</p>
          <p className="text-gray-600 text-xs mt-1">Response generated by the model</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0d1117] border border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-4 h-4 text-amber-400" />
            <p className="text-gray-400 text-sm font-medium">Total Tokens</p>
          </div>
          <p className="text-xl font-bold text-white">
            {formatTokens((u?.input_tokens_today || 0) + (u?.output_tokens_today || 0))}
          </p>
          <p className="text-gray-600 text-xs mt-1">Input + Output combined today</p>
        </div>
      </div>

      {/* Activity Grid */}
      <ActivityGrid breakdown={rawBreakdown} />

      {/* System Resources */}
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#0d1117] border border-gray-800 p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-gray-500" />
            System Resources
          </h2>
          <div className="space-y-4">
            {/* CPU */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-400">CPU</span>
                <span className="text-white font-medium">{vm?.cpu_usage || 0}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-gradient-to-r from-[#f43f5e] to-[#f43f5e]/70"
                  style={{ width: `${Math.min(vm?.cpu_usage || 0, 100)}%` }}
                />
              </div>
            </div>
            {/* Memory */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-400">Memory</span>
                <span className="text-white font-medium">{vm?.memory_usage || 0}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-gradient-to-r from-[#8b5cf6] to-[#8b5cf6]/70"
                  style={{ width: `${Math.min(vm?.memory_usage || 0, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bot Activity Summary */}
        <div className="rounded-xl bg-[#0d1117] border border-gray-800 p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            Summary
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
              <span className="text-gray-500 text-sm">Messages Today</span>
              <span className="text-white text-sm font-medium">{u?.messages_today || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
              <span className="text-gray-500 text-sm">Messages This Month</span>
              <span className="text-white text-sm font-medium">{u?.messages_month || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
              <span className="text-gray-500 text-sm">Tokens This Month</span>
              <span className="text-amber-400 text-sm font-medium">{formatTokens(u?.tokens_used_month || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
              <span className="text-gray-500 text-sm">API Calls This Month</span>
              <span className="text-white text-sm font-medium">{u?.api_calls_month || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">VM Uptime</span>
              <span className="text-emerald-400 text-sm font-medium">{vmUptime}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
