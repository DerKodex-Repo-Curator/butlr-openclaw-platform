'use client';

import { useState, useEffect } from 'react';
import { Terminal, CheckCircle, MessageSquare, Cpu, Wifi } from 'lucide-react';

const tasks = [
  { user: 'Find the best hotel in Paris for next weekend', bot: 'Found Le Marais Boutique - €120/night, 4.9 stars. Book it?' },
  { user: 'Create a summary of my meeting notes', bot: 'Created 2-page summary with action items. Saved to Drive.' },
  { user: 'Check if my package has shipped', bot: 'Yes! DHL tracking shows delivery tomorrow by 2pm.' },
];

const terminalLines = [
  { text: 'Analyzing request...', delay: 0 },
  { text: 'Opening browser...', delay: 500 },
  { text: 'Searching results...', delay: 1000 },
  { text: 'Task complete!', delay: 1500, success: true },
];

export default function HeroWorkspace() {
  const [currentTask, setCurrentTask] = useState(0);
  const [showResponse, setShowResponse] = useState(false);
  const [terminalLine, setTerminalLine] = useState(0);

  useEffect(() => {
    setShowResponse(false);
    setTerminalLine(0);

    terminalLines.forEach((_, index) => {
      setTimeout(() => setTerminalLine(index + 1), terminalLines[index].delay);
    });

    const responseTimer = setTimeout(() => setShowResponse(true), 2200);
    const nextTimer = setTimeout(() => setCurrentTask((prev) => (prev + 1) % tasks.length), 5000);

    return () => {
      clearTimeout(responseTimer);
      clearTimeout(nextTimer);
    };
  }, [currentTask]);

  const task = tasks[currentTask];

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-br from-[#f43f5e]/20 to-[#6ab3f3]/20 blur-3xl rounded-3xl opacity-50" />

      {/* Main Window */}
      <div className="relative bg-[#0d1117] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        {/* Window Header */}
        <div className="bg-[#161b22] px-4 py-3 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#f43f5e]" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-sm">🦞</span>
              <span className="text-sm font-medium">Butlr</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400">Online</span>
          </div>
        </div>

        {/* Chat Area */}
        <div className="p-4 space-y-3 h-[280px] overflow-hidden">
          {/* User Message */}
          <div className="flex justify-end">
            <div className="bg-[#2b5278] rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
              <p className="text-white text-sm">{task.user}</p>
            </div>
          </div>

          {/* Butler Working Indicator */}
          <div className="flex justify-start">
            <div className="bg-[#1c2128] rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%] border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f43f5e] to-[#fb7185] flex items-center justify-center text-xs">
                  <span className="text-xs">🦞</span>
                </div>
                <span className="text-xs text-gray-500">Working...</span>
              </div>

              {/* Mini Terminal */}
              <div className="bg-[#0d1117] rounded-lg p-2 font-mono text-xs space-y-1">
                {terminalLines.slice(0, terminalLine).map((line, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 ${
                      line.success ? 'text-emerald-400' : 'text-gray-500'
                    }`}
                  >
                    {line.success ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <span className="text-[#f43f5e]">›</span>
                    )}
                    <span>{line.text}</span>
                  </div>
                ))}
                {terminalLine < terminalLines.length && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#f43f5e]">›</span>
                    <span className="w-1.5 h-3 bg-[#f43f5e] animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bot Response */}
          {showResponse && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-[#1c2128] rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%] border border-gray-800">
                <p className="text-white text-sm">{task.bot}</p>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="px-4 py-3 bg-[#161b22] border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#0d1117] rounded-full px-4 py-2 border border-gray-800">
              <span className="text-gray-500 text-sm">Message your butler...</span>
            </div>
            <button className="w-9 h-9 rounded-full bg-[#f43f5e] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Task indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {tasks.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentTask ? 'w-6 bg-[#f43f5e]' : 'w-2 bg-gray-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
