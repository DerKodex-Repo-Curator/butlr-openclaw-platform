'use client';

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accentColor?: 'rose' | 'emerald' | 'amber' | 'red';
}

const accentColors = {
  rose: 'from-[#f43f5e]/20 to-[#f43f5e]/5 border-[#f43f5e]/30 text-[#fb7185]',
  emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
  amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
  red: 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-400',
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'rose',
}: StatsCardProps) {
  return (
    <div className={`bg-gradient-to-br ${accentColors[accentColor]} border rounded-xl p-6 hover:border-opacity-50 transition-colors`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-gray-400 text-sm mt-1">
              {subtitle}
            </p>
          )}
          {trend && (
            <p
              className={`text-sm mt-2 font-medium ${
                trend.isPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${accentColors[accentColor]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
