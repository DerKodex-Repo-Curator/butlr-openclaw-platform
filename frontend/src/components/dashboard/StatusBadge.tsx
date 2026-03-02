'use client';

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'starting' | 'stopping' | 'running' | 'stopped' | 'provisioning' | 'healthy' | 'degraded' | 'unhealthy' | 'active' | 'trialing' | 'canceled' | 'past_due';
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

const statusConfig: Record<string, { color: string; label: string; dotColor: string }> = {
  online: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Online', dotColor: 'bg-emerald-400' },
  offline: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Offline', dotColor: 'bg-red-400' },
  starting: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Starting...', dotColor: 'bg-amber-400' },
  stopping: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Stopping...', dotColor: 'bg-amber-400' },
  running: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Running', dotColor: 'bg-emerald-400' },
  stopped: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Stopped', dotColor: 'bg-red-400' },
  provisioning: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Provisioning', dotColor: 'bg-blue-400' },
  healthy: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Healthy', dotColor: 'bg-emerald-400' },
  degraded: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Degraded', dotColor: 'bg-amber-400' },
  unhealthy: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Unhealthy', dotColor: 'bg-red-400' },
  active: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Active', dotColor: 'bg-emerald-400' },
  trialing: { color: 'bg-[#f43f5e]/20 text-[#fb7185] border-[#f43f5e]/30', label: 'Trial', dotColor: 'bg-[#fb7185]' },
  canceled: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Canceled', dotColor: 'bg-gray-400' },
  past_due: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Past Due', dotColor: 'bg-red-400' },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export default function StatusBadge({ status, size = 'md', showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.offline;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-medium ${config.color} ${sizeClasses[size]}`}
    >
      {showDot && (
        <span
          className={`w-2 h-2 rounded-full ${config.dotColor} ${
            ['online', 'running', 'healthy', 'active'].includes(status)
              ? 'animate-pulse'
              : ''
          }`}
        />
      )}
      {config.label}
    </span>
  );
}
