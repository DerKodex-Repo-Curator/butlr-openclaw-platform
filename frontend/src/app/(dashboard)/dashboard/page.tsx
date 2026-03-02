'use client';

import { useState, useEffect } from 'react';
import {
  Server,
  Activity,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Zap,
  Clock,
  Power,
  Package,
  Settings,
  HelpCircle,
  BarChart3,
} from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSpinner';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import MetricsChart from '@/components/dashboard/MetricsChart';
import { dashboard as dashboardApi, bot as botApi } from '@/lib/api';
import type { DashboardData } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [restartingBot, setRestartingBot] = useState(false);
  const [restartingVM, setRestartingVM] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await dashboardApi.getData();
      if (response.success && response.data) {
        setData(response.data);
      } else {
        const token = localStorage.getItem('butlr_token');
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        const apiResponse = await fetch(`${API_BASE}/dashboard`, { headers });
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          setData(apiData);
        }
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    }
    setLoading(false);
  };

  const handleRestartBot = async () => {
    setRestartingBot(true);
    try {
      const response = await botApi.restart();
      if (response.success) {
        if (data) {
          setData({
            ...data,
            bot: { ...data.bot, status: 'starting' },
          });
        }
        setTimeout(loadDashboard, 5000);
      }
    } catch (error) {
      console.error('Bot restart failed:', error);
    }
    setRestartingBot(false);
  };

  const handleRestartVM = async () => {
    if (!confirm('Restart the VM? This will temporarily disconnect your bot.')) {
      return;
    }

    setRestartingVM(true);
    try {
      const token = localStorage.getItem('butlr_token');
      const response = await fetch(`${API_BASE}/vm/restart`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (response.ok) {
        if (data) {
          setData({
            ...data,
            vm: { ...data.vm, status: 'stopped', health: 'degraded' },
            bot: { ...data.bot, status: 'offline' },
          });
        }
        setTimeout(loadDashboard, 60000);
      }
    } catch (error) {
      console.error('VM restart failed:', error);
    }
    setRestartingVM(false);
  };

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'} 👋
          </h1>
          <p className="text-gray-500 text-sm">
            <span className="text-gray-300">{data.bot.name}</span> is {data.bot.status === 'online' ? <span className="text-emerald-400">online and ready</span> : <span className="text-red-400">offline</span>}
          </p>
        </div>
        {data.bot.telegram_username && (
          <a
            href={`https://t.me/${data.bot.telegram_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2AABEE] hover:bg-[#229ED9] text-white rounded-xl font-medium transition-colors text-sm"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Chat with {data.bot.name}
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Bot</span>
          </div>
          <p className={`text-lg font-semibold ${data.bot.status === 'online' ? 'text-emerald-400' : 'text-gray-400'}`}>
            {data.bot.status === 'online' ? 'Online' : 'Offline'}
          </p>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">VM</span>
          </div>
          <p className={`text-lg font-semibold ${data.vm.status === 'running' ? 'text-emerald-400' : 'text-gray-400'}`}>
            {data.vm.status === 'running' ? 'Running' : 'Stopped'}
          </p>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Uptime</span>
          </div>
          <p className="text-lg font-semibold text-white">{data.usage.uptime_percentage}%</p>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">VM Uptime</span>
          </div>
          <p className="text-lg font-semibold text-white">{data.vm.uptime}</p>
        </div>
      </div>

      {/* Main Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Bot Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center">
                <span className="text-lg">🦞</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{data.bot.name}</h2>
                <p className="text-gray-500 text-sm">@{data.bot.telegram_username || 'Not configured'}</p>
              </div>
            </div>
            <StatusBadge status={data.bot.status} />
          </div>

          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Last Active</span>
              <span className="text-gray-300">
                {data.bot.last_active ? new Date(data.bot.last_active).toLocaleString() : 'Never'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-300">{new Date(data.bot.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRestartBot}
              disabled={restartingBot}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm transition-colors disabled:opacity-50"
            >
              {restartingBot ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
              Restart
            </button>
            <a
              href={`https://t.me/${data.bot.telegram_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#f43f5e] hover:bg-[#e11d48] text-white text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Telegram
            </a>
          </div>
        </div>

        {/* VM Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center">
                <Server className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Virtual Machine</h2>
                <p className="text-gray-500 text-sm">Dedicated instance</p>
              </div>
            </div>
            <StatusBadge status={data.vm.health} />
          </div>

          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">IP Address</span>
              <code className="text-gray-300 bg-gray-800 px-2 py-0.5 rounded text-xs">{data.vm.ip}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Uptime</span>
              <span className="text-gray-300">{data.vm.uptime}</span>
            </div>
          </div>

          {data.vm.cpu_usage !== undefined && (
            <div className="space-y-3 mb-4 pt-4 border-t border-gray-800">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">CPU</span>
                  <span className="text-gray-400">{data.vm.cpu_usage}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#f43f5e] rounded-full transition-all"
                    style={{ width: `${Math.min(data.vm.cpu_usage, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Memory</span>
                  <span className="text-gray-400">{data.vm.memory_usage}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#f43f5e] rounded-full transition-all"
                    style={{ width: `${Math.min(data.vm.memory_usage || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleRestartVM}
            disabled={restartingVM}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-300 hover:bg-gray-800 text-sm transition-colors disabled:opacity-50"
          >
            {restartingVM ? <LoadingSpinner size="sm" /> : <Power className="w-4 h-4" />}
            Restart VM
          </button>
        </div>
      </div>

      {/* Metrics Chart */}
      <MetricsChart className="mb-6" />

      {/* Subscription */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                BYOK Plan
              </span>
              <StatusBadge status={data.subscription.status} size="sm" />
            </div>
            <span className="text-gray-500 text-sm">
              {`Next billing ${new Date(data.subscription.current_period_end).toLocaleDateString()}`}
            </span>
          </div>
          <a href="/dashboard/billing" className="text-sm text-gray-400 hover:text-white transition-colors">
            Manage billing →
          </a>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <a
          href="/dashboard/usage"
          className="bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="text-sm text-white">Usage</p>
            <p className="text-xs text-gray-500">View metrics</p>
          </div>
        </a>
        <a
          href="/dashboard/skills"
          className="bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
            <Package className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="text-sm text-white">Skills</p>
            <p className="text-xs text-gray-500">Integrations</p>
          </div>
        </a>
        <a
          href="/dashboard/settings"
          className="bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
            <Settings className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="text-sm text-white">Settings</p>
            <p className="text-xs text-gray-500">Configure</p>
          </div>
        </a>
        <a
          href="/dashboard/support"
          className="bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="text-sm text-white">Support</p>
            <p className="text-xs text-gray-500">Get help</p>
          </div>
        </a>
      </div>
    </div>
  );
}
