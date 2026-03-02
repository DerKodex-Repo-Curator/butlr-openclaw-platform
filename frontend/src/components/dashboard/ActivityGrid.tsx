'use client';

import { useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface DailyBreakdown {
  date: string;
  messages: number;
  requests: number;
  tokens: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function getActivityLevel(tokens: number, max: number): number {
  if (tokens === 0) return 0;
  const ratio = tokens / max;
  if (ratio < 0.15) return 1;
  if (ratio < 0.4) return 2;
  if (ratio < 0.7) return 3;
  return 4;
}

const LEVEL_BG = [
  '#161b22', // 0: empty past
  'rgba(244,63,94,0.20)', // 1
  'rgba(244,63,94,0.40)', // 2
  'rgba(244,63,94,0.65)', // 3
  '#f43f5e', // 4
];

const LEVEL_BORDER = [
  '#1b2028',
  'rgba(244,63,94,0.30)',
  'rgba(244,63,94,0.40)',
  'rgba(244,63,94,0.50)',
  'rgba(244,63,94,0.70)',
];

const FUTURE_BG = '#1d2230';
const FUTURE_BORDER = '#252d3d';

interface GridDay {
  date: string;
  messages: number;
  requests: number;
  tokens: number;
  level: number;
  isFuture: boolean;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function ActivityGrid({ breakdown }: { breakdown: DailyBreakdown[] }) {
  const [tooltip, setTooltip] = useState<{ day: GridDay; x: number; y: number } | null>(null);

  const dataMap = new Map(breakdown.map(d => [d.date, d]));
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const year = now.getUTCFullYear();

  // Full year: Jan 1 → Dec 31
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dec31 = new Date(Date.UTC(year, 11, 31));

  // Align to Monday
  const jan1Day = jan1.getUTCDay();
  const startOffset = jan1Day === 0 ? -6 : 1 - jan1Day;
  const startDate = new Date(jan1);
  startDate.setUTCDate(startDate.getUTCDate() + startOffset);

  const dec31Day = dec31.getUTCDay();
  const endOffset = dec31Day === 0 ? 0 : 7 - dec31Day;
  const endDate = new Date(dec31);
  endDate.setUTCDate(endDate.getUTCDate() + endOffset);

  // Generate all days
  const allDays: GridDay[] = [];
  const d = new Date(startDate);
  while (d <= endDate) {
    const key = d.toISOString().split('T')[0];
    const data = dataMap.get(key);
    allDays.push({
      date: key,
      messages: data?.messages || 0,
      requests: data?.requests || 0,
      tokens: data?.tokens || 0,
      level: 0,
      isFuture: key > todayStr,
    });
    d.setUTCDate(d.getUTCDate() + 1);
  }

  const pastDays = allDays.filter(dd => !dd.isFuture);
  const maxTokens = Math.max(...pastDays.map(dd => dd.tokens), 1);
  allDays.forEach(day => {
    if (!day.isFuture) day.level = getActivityLevel(day.tokens, maxTokens);
  });

  // Weeks (columns)
  const weeks: GridDay[][] = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));
  const numWeeks = weeks.length;

  // Month labels
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const month = new Date(week[0].date + 'T00:00:00Z').getUTCMonth();
    if (month !== lastMonth) {
      monthLabels.push({ label: MONTH_NAMES[month], col: wi });
      lastMonth = month;
    }
  });

  const formatDateLong = (dateStr: string) => {
    const dt = new Date(dateStr + 'T00:00:00Z');
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };

  // CSS Grid: 1 col for day labels + numWeeks cols for cells, all using 1fr
  const gridTemplateColumns = `24px repeat(${numWeeks}, 1fr)`;

  return (
    <div className="rounded-xl bg-[#0d1117] border border-gray-800 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          {year} Activity
        </h2>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map(level => (
            <div
              key={level}
              className="w-3 h-3 rounded-[3px]"
              style={{ background: LEVEL_BG[level], border: `1px solid ${LEVEL_BORDER[level]}` }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Month labels row */}
      <div style={{ display: 'grid', gridTemplateColumns, gap: '2px' }}>
        <div /> {/* spacer for day labels col */}
        {weeks.map((_, wi) => {
          const label = monthLabels.find(m => m.col === wi);
          return (
            <div key={wi} className="text-[10px] text-gray-500 font-medium truncate">
              {label ? label.label : ''}
            </div>
          );
        })}
      </div>

      {/* Grid: 7 rows (Mon–Sun) × numWeeks columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns,
          gridTemplateRows: 'repeat(7, 1fr)',
          gap: '2px',
          marginTop: '4px',
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => (
          <>
            {/* Day label */}
            <div
              key={`label-${dayIdx}`}
              className="text-[10px] text-gray-600 flex items-center justify-end pr-1"
            >
              {DAY_LABELS[dayIdx]}
            </div>
            {/* Week cells */}
            {weeks.map((week, wi) => {
              const day = week[dayIdx];
              if (!day) return <div key={`${dayIdx}-${wi}`} />;
              const isToday = day.date === todayStr;
              const bg = day.isFuture ? FUTURE_BG : LEVEL_BG[day.level];
              const border = day.isFuture ? FUTURE_BORDER : LEVEL_BORDER[day.level];
              return (
                <div
                  key={`${dayIdx}-${wi}`}
                  className={`rounded-[3px] aspect-square cursor-pointer transition-all duration-150 hover:scale-[1.4] hover:z-10 ${isToday ? 'ring-1 ring-white/40' : ''}`}
                  style={{
                    background: bg,
                    border: `1px solid ${border}`,
                    minWidth: 0,
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ day, x: rect.left + rect.width / 2, y: rect.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
        >
          <div className="bg-[#1c2333] border border-gray-700 rounded-lg px-3 py-2.5 text-xs shadow-2xl min-w-[140px]">
            <p className="text-white font-semibold mb-1.5">{formatDateLong(tooltip.day.date)}</p>
            {tooltip.day.isFuture ? (
              <p className="text-gray-500 italic">Upcoming</p>
            ) : tooltip.day.tokens > 0 ? (
              <div className="space-y-0.5">
                <p className="text-gray-300"><span className="text-[#f43f5e] font-medium">{tooltip.day.messages}</span> messages</p>
                <p className="text-gray-300"><span className="text-[#f43f5e] font-medium">{tooltip.day.requests}</span> API calls</p>
                <p className="text-gray-300"><span className="text-amber-400 font-medium">{formatTokens(tooltip.day.tokens)}</span> tokens</p>
              </div>
            ) : (
              <p className="text-gray-500">No activity</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
