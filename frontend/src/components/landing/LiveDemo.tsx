'use client';

import { useState, useEffect } from 'react';
import { Monitor, Terminal, Globe, FolderOpen, MessageSquare } from 'lucide-react';

// Simulated actions the bot performs
const actions = [
  {
    type: 'terminal',
    title: 'Running task...',
    lines: [
      { text: '> Analyzing your request...', delay: 0 },
      { text: '> Opening browser...', delay: 800 },
      { text: '> Navigating to booking site...', delay: 1600 },
      { text: '> Filling reservation form...', delay: 2400 },
      { text: '> Booking confirmed!', delay: 3200, success: true },
    ],
  },
  {
    type: 'browser',
    title: 'Web Browsing',
    lines: [
      { text: '> Searching for flight prices...', delay: 0 },
      { text: '> Comparing 47 results...', delay: 1000 },
      { text: '> Found best deal: 89 EUR', delay: 2000, success: true },
      { text: '> Saving to your notes...', delay: 2800 },
      { text: '> Done!', delay: 3400, success: true },
    ],
  },
  {
    type: 'files',
    title: 'File Management',
    lines: [
      { text: '> Creating presentation.pptx...', delay: 0 },
      { text: '> Adding 12 slides...', delay: 1200 },
      { text: '> Inserting charts from data...', delay: 2000 },
      { text: '> Saved to Google Drive', delay: 2800, success: true },
    ],
  },
];

export default function LiveDemo() {
  const [currentAction, setCurrentAction] = useState(0);
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const [isClicking, setIsClicking] = useState(false);

  const action = actions[currentAction];

  // Animate cursor movement
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setCursorPos({
        x: 20 + Math.random() * 60,
        y: 30 + Math.random() * 40,
      });

      // Random clicks
      if (Math.random() > 0.7) {
        setIsClicking(true);
        setTimeout(() => setIsClicking(false), 150);
      }
    }, 1500);

    return () => clearInterval(moveInterval);
  }, []);

  // Animate terminal lines
  useEffect(() => {
    setVisibleLines(0);

    const timers: NodeJS.Timeout[] = [];

    action.lines.forEach((line, index) => {
      timers.push(setTimeout(() => {
        setVisibleLines(index + 1);
      }, line.delay));
    });

    // Move to next action
    const lastLine = action.lines[action.lines.length - 1];
    timers.push(setTimeout(() => {
      setCurrentAction((prev) => (prev + 1) % actions.length);
    }, lastLine.delay + 2000));

    return () => timers.forEach(clearTimeout);
  }, [currentAction]);

  const getIcon = () => {
    switch (action.type) {
      case 'browser': return <Globe className="w-4 h-4" />;
      case 'files': return <FolderOpen className="w-4 h-4" />;
      default: return <Terminal className="w-4 h-4" />;
    }
  };

  return (
    <section className="py-24 bg-[#0a0f16] overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-full mb-4">
            <Monitor className="w-4 h-4 text-[#fb7185]" />
            <span className="text-[#fb7185] text-sm font-medium">Live Preview</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Watch your butler work
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Your butler has its own desktop with browser, terminal, and file system.
            It works autonomously while you do other things.
          </p>
        </div>

        {/* Desktop Mockup */}
        <div className="relative max-w-4xl mx-auto">
          {/* Monitor Frame */}
          <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 overflow-hidden shadow-2xl shadow-black/50">
            {/* Title Bar */}
            <div className="bg-[#0d1117] px-4 py-3 flex items-center gap-3 border-b border-gray-800">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#f43f5e]" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 flex items-center justify-center gap-2 text-gray-500 text-sm">
                {getIcon()}
                <span>{action.title}</span>
              </div>
              <div className="w-16" /> {/* Spacer */}
            </div>

            {/* Desktop Content */}
            <div className="relative h-80 bg-gradient-to-br from-[#0d1117] to-[#111827] p-6">
              {/* Animated Cursor */}
              <div
                className="absolute z-20 transition-all duration-1000 ease-out pointer-events-none"
                style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  className={`drop-shadow-lg transition-transform ${isClicking ? 'scale-90' : 'scale-100'}`}
                >
                  <path
                    d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.88a.5.5 0 0 0-.85.33Z"
                    fill="#fff"
                    stroke="#000"
                    strokeWidth="1"
                  />
                </svg>
                {isClicking && (
                  <div className="absolute top-0 left-0 w-8 h-8 rounded-full bg-[#f43f5e]/30 animate-ping" />
                )}
              </div>

              {/* Terminal Window */}
              <div className="bg-[#0a0f16] rounded-lg border border-gray-800 overflow-hidden max-w-lg">
                {/* Terminal Header */}
                <div className="bg-[#161b22] px-3 py-2 flex items-center gap-2 border-b border-gray-800">
                  <Terminal className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-500">butlr@vm ~ $</span>
                </div>

                {/* Terminal Content */}
                <div className="p-4 font-mono text-sm space-y-2 min-h-[160px]">
                  {action.lines.slice(0, visibleLines).map((line, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 animate-fade-in ${
                        line.success ? 'text-emerald-400' : 'text-gray-400'
                      }`}
                    >
                      {line.success && (
                        <span className="text-emerald-400">✓</span>
                      )}
                      <span>{line.text}</span>
                    </div>
                  ))}
                  {visibleLines < action.lines.length && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">{'>'}</span>
                      <span className="w-2 h-4 bg-[#f43f5e] animate-pulse" />
                    </div>
                  )}
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute top-8 right-8 w-32 h-20 bg-[#161b22] rounded-lg border border-gray-800 p-3 opacity-60">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-3 h-3 text-[#6ab3f3]" />
                  <span className="text-xs text-gray-500">Telegram</span>
                </div>
                <div className="h-2 bg-gray-800 rounded w-full mb-1" />
                <div className="h-2 bg-gray-800 rounded w-3/4" />
              </div>

              <div className="absolute bottom-8 right-12 w-28 h-16 bg-[#161b22] rounded-lg border border-gray-800 p-3 opacity-40">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-3 h-3 text-[#10b981]" />
                  <span className="text-xs text-gray-500">Browser</span>
                </div>
                <div className="h-2 bg-gray-800 rounded w-full" />
              </div>
            </div>

            {/* Taskbar */}
            <div className="bg-[#0d1117] px-4 py-2 flex items-center gap-4 border-t border-gray-800">
              <div className="w-8 h-8 rounded bg-[#f43f5e]/20 flex items-center justify-center">
                <span className="text-xs">🦞</span>
              </div>
              <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center">
                <Terminal className="w-4 h-4 text-gray-400" />
              </div>
              <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center">
                <Globe className="w-4 h-4 text-gray-400" />
              </div>
              <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1" />
              <span className="text-xs text-gray-600">24/7 online</span>
            </div>
          </div>

          {/* Monitor Stand */}
          <div className="mx-auto w-24 h-8 bg-gradient-to-b from-[#1a1a2e] to-[#0d1117] rounded-b-lg" />
          <div className="mx-auto w-40 h-2 bg-[#1a1a2e] rounded-full" />
        </div>

        {/* Action Indicators */}
        <div className="flex justify-center gap-3 mt-8">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={() => setCurrentAction(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                i === currentAction
                  ? 'bg-[#f43f5e]/20 border border-[#f43f5e]/30 text-[#fb7185]'
                  : 'bg-gray-800/50 border border-gray-800 text-gray-500 hover:text-gray-300'
              }`}
            >
              {a.type === 'browser' && <Globe className="w-4 h-4" />}
              {a.type === 'files' && <FolderOpen className="w-4 h-4" />}
              {a.type === 'terminal' && <Terminal className="w-4 h-4" />}
              <span className="text-sm">{a.title}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
