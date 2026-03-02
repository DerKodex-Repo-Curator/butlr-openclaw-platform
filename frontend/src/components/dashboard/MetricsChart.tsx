'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

interface MetricPoint {
  cpu: number;
  memory: number;
  disk: number;
  bot_running: boolean;
  time: string;
}

interface MetricsChartProps {
  className?: string;
}

export default function MetricsChart({ className = '' }: MetricsChartProps) {
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    // Refresh every 5 minutes
    const interval = setInterval(loadMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const token = localStorage.getItem('butlr_token');
      const response = await fetch(`${API_BASE}/vm/metrics?hours=24`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        // Format time for display
        const formatted = data.metrics.map((m: MetricPoint) => ({
          ...m,
          timeLabel: new Date(m.time).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }));
        setMetrics(formatted);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className={`bg-[#111827] border border-gray-800 rounded-xl p-5 ${className}`}>
        <div className="h-48 flex items-center justify-center">
          <div className="text-gray-500">Loading metrics...</div>
        </div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className={`bg-[#111827] border border-gray-800 rounded-xl p-5 ${className}`}>
        <h3 className="text-sm font-medium text-white mb-4">System Metrics (24h)</h3>
        <div className="h-48 flex items-center justify-center">
          <div className="text-gray-500 text-sm">No data yet. Metrics are collected every 5 minutes.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#111827] border border-gray-800 rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">System Metrics (24h)</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#f43f5e]" />
            <span className="text-gray-400">CPU</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
            <span className="text-gray-400">Memory</span>
          </div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={metrics} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="timeLabel"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#1f2937' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#1f2937' }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#9ca3af' }}
              formatter={(value) => [`${Number(value).toFixed(1)}%`]}
            />
            <Line
              type="monotone"
              dataKey="cpu"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#f43f5e' }}
            />
            <Line
              type="monotone"
              dataKey="memory"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Current Values */}
      {metrics.length > 0 && (
        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-800">
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">Current CPU</div>
            <div className="text-lg font-semibold text-[#f43f5e]">
              {metrics[metrics.length - 1].cpu.toFixed(1)}%
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">Current Memory</div>
            <div className="text-lg font-semibold text-[#3b82f6]">
              {metrics[metrics.length - 1].memory.toFixed(1)}%
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">Disk Usage</div>
            <div className="text-lg font-semibold text-gray-300">
              {metrics[metrics.length - 1].disk.toFixed(0)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
