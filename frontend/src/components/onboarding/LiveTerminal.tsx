'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronDown, ChevronRight } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  step?: string;
}

interface LiveTerminalProps {
  customerId: number;
  isActive: boolean;
}

const levelColors = {
  info: 'text-[var(--foreground-muted)]',
  warn: 'text-amber-400',
  error: 'text-red-400',
  success: 'text-emerald-400',
};

const levelPrefixes = {
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
  success: '[SUCCESS]',
};

export default function LiveTerminal({ customerId, isActive }: LiveTerminalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isActive || !customerId) return;

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';
    const wsUrl = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://');

    const connect = () => {
      try {
        const ws = new WebSocket(`${wsUrl}/ws/onboarding/${customerId}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          addLog('info', 'Connected to provisioning stream...');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'log') {
              addLog(data.level || 'info', data.message, data.step);
            }
          } catch {
            addLog('info', event.data);
          }
        };

        ws.onerror = () => {
          setConnected(false);
        };

        ws.onclose = () => {
          setConnected(false);
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [customerId, isActive]);

  const addLog = (level: LogEntry['level'], message: string, step?: string) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      step,
    };
    setLogs((prev) => [...prev, entry]);
  };

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isActive) return null;

  return (
    <div className="mt-6 bg-[var(--background-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--background)] border-b border-[var(--border-color)] hover:bg-[var(--background-secondary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">Live Terminal</span>
          {connected && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Connected
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)]" />
        )}
      </button>

      {/* Terminal Content */}
      {expanded && (
        <div
          ref={scrollRef}
          className="p-4 font-mono text-xs max-h-48 overflow-y-auto bg-[#0d1117]"
        >
          {logs.length === 0 ? (
            <p className="text-[var(--foreground-muted)]">Waiting for logs...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex gap-2 py-0.5">
                <span className="text-[var(--foreground-muted)] opacity-50">{log.timestamp}</span>
                <span className={levelColors[log.level]}>{levelPrefixes[log.level]}</span>
                <span className={log.level === 'error' ? 'text-red-400' : 'text-white'}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
