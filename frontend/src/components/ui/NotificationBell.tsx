'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';

interface Update {
  id: string;
  date: string;
  tag: 'new' | 'improved' | 'fixed' | 'design';
  title: string;
  description: string;
  icon: string;
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  improved: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  fixed: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  design: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
};

interface NotificationBellProps {
  /** 'right' = dropdown opens to the left (default, for navbar). 'left' = opens to the right (for sidebar). */
  align?: 'right' | 'left';
}

export default function NotificationBell({ align = 'right' }: NotificationBellProps) {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('butlr_seen_updates');
      if (stored) setSeenIds(new Set(JSON.parse(stored)));
    } catch {}

    fetch('/api/updates')
      .then((r) => r.json())
      .then((data) => {
        if (data.updates) setUpdates(data.updates);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => {
    // Only lock body scroll on mobile (prevents background scrolling behind bottom sheet)
    const isMobile = window.innerWidth < 768;
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const unseenCount = updates.filter((u) => !seenIds.has(u.id)).length;

  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const handleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
    setIsOpen(!isOpen);
    if (!isOpen && unseenCount > 0) {
      const allIds = new Set(updates.map((u) => u.id));
      setSeenIds(allIds);
      try {
        localStorage.setItem('butlr_seen_updates', JSON.stringify([...allIds]));
      } catch {}
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const grouped = updates.reduce<Record<string, Update[]>>((acc, u) => {
    if (!acc[u.date]) acc[u.date] = [];
    acc[u.date].push(u);
    return acc;
  }, {});

  // Desktop positioning: right-aligned (navbar) or left-aligned (sidebar)
  const desktopPosition = align === 'left'
    ? 'md:left-0 md:right-auto'
    : 'md:right-0 md:left-auto';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
        aria-label="Product updates"
      >
        <Bell className="w-5 h-5" />
        {unseenCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[#f43f5e] rounded-full ring-2 ring-[#0a0f1a] animate-pulse">
            {unseenCount}
          </span>
        )}
      </button>

      {/* Mobile: Full-screen overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-[99]" onClick={() => setIsOpen(false)} />
      )}

      {/* Dropdown — mobile: bottom sheet, desktop: positioned dropdown */}
      {isOpen && (
        <div
          className={`
            z-[100] bg-[#111827] border border-gray-800 shadow-2xl shadow-black/50 overflow-hidden
            fixed inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh]
            md:absolute md:inset-auto md:top-full md:mt-2 md:w-[380px] md:max-h-[520px] md:rounded-xl
            ${desktopPosition}
          `}
        >
          {/* Header */}
          <div className="sticky top-0 bg-[#111827] border-b border-gray-800 px-4 py-3 flex items-center justify-between z-10">
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-700 md:hidden" />
            <h3 className="text-sm font-semibold text-white mt-1 md:mt-0">What&apos;s New</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{updates.length} updates</span>
              <button
                onClick={() => setIsOpen(false)}
                className="md:hidden p-1 text-gray-500 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Updates list */}
          <div className="overflow-y-auto max-h-[calc(85vh-100px)] md:max-h-[420px] p-2">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <div className="px-3 py-2 mt-1 first:mt-0">
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    {formatDate(date)}
                  </span>
                </div>

                {items.map((update) => {
                  const tagStyle = TAG_COLORS[update.tag] || TAG_COLORS.new;
                  return (
                    <div
                      key={update.id}
                      className="flex gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors cursor-default group"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg group-hover:bg-white/10 transition-colors">
                        {update.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-medium text-white">
                            {update.title}
                          </span>
                          <span
                            className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${tagStyle.bg} ${tagStyle.text}`}
                          >
                            {update.tag}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                          {update.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-[#111827] border-t border-gray-800 px-4 py-3 text-center">
            <span className="text-[11px] text-gray-500">
              🦞 Butlr.cloud — Your AI Butler, Your Rules
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
