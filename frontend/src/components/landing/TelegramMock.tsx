'use client';

import { useState, useEffect } from 'react';
import { Check, CheckCheck } from 'lucide-react';

interface Message {
  id: number;
  type: 'user' | 'bot';
  text: string;
  typing?: boolean;
}

const conversations = [
  [
    { type: 'user' as const, text: 'Research the top 5 productivity apps and send me a summary' },
    { type: 'bot' as const, text: 'On it! Browsing the web now... Done! I found Notion, Todoist, Obsidian, Linear, and Raycast. Full comparison sent to your email.' },
  ],
  [
    { type: 'user' as const, text: 'Book me a table for 2 at a good Italian place tonight' },
    { type: 'bot' as const, text: 'Found La Trattoria - 4.8 stars, 5 min from you. Booked for 7pm! Confirmation in your inbox.' },
  ],
  [
    { type: 'user' as const, text: 'Create a presentation about our Q4 results' },
    { type: 'bot' as const, text: 'Created a 12-slide deck with charts from your data. Saved to your Google Drive. Want me to share it with your team?' },
  ],
];

export default function TelegramMock() {
  const [currentConvo, setCurrentConvo] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState(0); // 0: empty, 1: user msg, 2: typing, 3: bot response

  useEffect(() => {
    const convo = conversations[currentConvo];

    const timers: NodeJS.Timeout[] = [];

    // Reset
    setMessages([]);
    setPhase(0);

    // Show user message after 500ms
    timers.push(setTimeout(() => {
      setMessages([{ id: 1, type: 'user', text: convo[0].text }]);
      setPhase(1);
    }, 500));

    // Show typing after 1.5s
    timers.push(setTimeout(() => {
      setMessages([
        { id: 1, type: 'user', text: convo[0].text },
        { id: 2, type: 'bot', text: '', typing: true },
      ]);
      setPhase(2);
    }, 1500));

    // Show bot response after 3s
    timers.push(setTimeout(() => {
      setMessages([
        { id: 1, type: 'user', text: convo[0].text },
        { id: 2, type: 'bot', text: convo[1].text },
      ]);
      setPhase(3);
    }, 3000));

    // Next conversation after 7s
    timers.push(setTimeout(() => {
      setCurrentConvo((prev) => (prev + 1) % conversations.length);
    }, 7000));

    return () => timers.forEach(clearTimeout);
  }, [currentConvo]);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Phone Frame */}
      <div className="relative bg-[#0e1621] rounded-[2.5rem] p-2 shadow-2xl shadow-black/50">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />

        {/* Screen */}
        <div className="bg-[#17212b] rounded-[2rem] overflow-hidden">
          {/* Telegram Header */}
          <div className="bg-[#242f3d] px-4 py-3 flex items-center gap-3">
            {/* Back button */}
            <svg className="w-6 h-6 text-[#6ab3f3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>

            {/* Avatar - Lobster */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f43f5e] to-[#fb7185] flex items-center justify-center text-xl">
              <span className="text-sm font-bold">B</span>
            </div>

            {/* Name & Status */}
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Your Butlr</p>
              <p className="text-[#6ab3f3] text-xs">online</p>
            </div>

            {/* Icons */}
            <svg className="w-5 h-5 text-[#6ab3f3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <svg className="w-5 h-5 text-[#6ab3f3] ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </div>

          {/* Chat Area */}
          <div className="h-80 px-3 py-4 flex flex-col justify-end gap-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                    msg.type === 'user'
                      ? 'bg-[#2b5278] text-white rounded-br-md'
                      : 'bg-[#182533] text-white rounded-bl-md'
                  }`}
                >
                  {msg.typing ? (
                    <div className="flex items-center gap-1 py-1 px-2">
                      <div className="w-2 h-2 bg-[#6ab3f3] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-[#6ab3f3] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-[#6ab3f3] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <div>
                      <p className="leading-relaxed">{msg.text}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${msg.type === 'user' ? 'text-[#6ab3f3]/60' : 'text-gray-500'}`}>
                        <span className="text-[10px]">12:34</span>
                        {msg.type === 'user' && <CheckCheck className="w-3 h-3" />}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Input Bar */}
          <div className="bg-[#17212b] px-3 py-2 flex items-center gap-2 border-t border-[#242f3d]">
            <svg className="w-6 h-6 text-[#6ab3f3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <div className="flex-1 bg-[#242f3d] rounded-full px-4 py-2">
              <span className="text-gray-400 text-sm">Message</span>
            </div>
            <svg className="w-6 h-6 text-[#6ab3f3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Conversation indicator */}
      <div className="flex justify-center gap-2 mt-4">
        {conversations.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentConvo ? 'bg-[#f43f5e] w-6' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
