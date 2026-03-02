'use client';

import { useState, useEffect, useRef } from 'react';

interface CursorAction {
  x: number; // percentage
  y: number; // percentage
  action: 'move' | 'click' | 'type' | 'scroll';
  duration: number;
  text?: string;
}

// Predefined actions the bot cursor will perform across the page
const botActions: CursorAction[] = [
  // Start at top, move around hero
  { x: 30, y: 15, action: 'move', duration: 1000 },
  { x: 45, y: 25, action: 'move', duration: 800 },
  { x: 50, y: 30, action: 'click', duration: 300 },

  // Move to features area
  { x: 60, y: 35, action: 'move', duration: 1200 },
  { x: 70, y: 40, action: 'scroll', duration: 500 },

  // Click around features
  { x: 25, y: 50, action: 'move', duration: 1000 },
  { x: 30, y: 55, action: 'click', duration: 300 },
  { x: 75, y: 55, action: 'move', duration: 1200 },
  { x: 78, y: 58, action: 'click', duration: 300 },

  // Move to pricing
  { x: 50, y: 65, action: 'move', duration: 1000 },
  { x: 55, y: 70, action: 'scroll', duration: 500 },

  // Interact with buttons
  { x: 40, y: 75, action: 'move', duration: 800 },
  { x: 42, y: 78, action: 'click', duration: 300 },
  { x: 60, y: 75, action: 'move', duration: 600 },
  { x: 62, y: 78, action: 'click', duration: 300 },

  // Back to top
  { x: 80, y: 20, action: 'move', duration: 1500 },
  { x: 85, y: 15, action: 'scroll', duration: 500 },
];

export default function BotCursor() {
  const [position, setPosition] = useState({ x: 20, y: 10 });
  const [isClicking, setIsClicking] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [actionIndex, setActionIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleId = useRef(0);

  // Run through bot actions
  useEffect(() => {
    const action = botActions[actionIndex];

    // Move to position
    setPosition({ x: action.x, y: action.y });

    // Execute action after reaching position
    const actionTimer = setTimeout(() => {
      switch (action.action) {
        case 'click':
          setIsClicking(true);
          // Add ripple effect
          rippleId.current++;
          setRipples(prev => [...prev, { id: rippleId.current, x: action.x, y: action.y }]);
          setTimeout(() => {
            setIsClicking(false);
            // Remove ripple after animation
            setTimeout(() => {
              setRipples(prev => prev.slice(1));
            }, 500);
          }, 150);
          break;
        case 'scroll':
          setIsScrolling(true);
          setTimeout(() => setIsScrolling(false), 400);
          break;
        case 'type':
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 500);
          break;
      }
    }, action.duration - 200);

    // Move to next action
    const nextTimer = setTimeout(() => {
      setActionIndex((prev) => (prev + 1) % botActions.length);
    }, action.duration + 300);

    return () => {
      clearTimeout(actionTimer);
      clearTimeout(nextTimer);
    };
  }, [actionIndex]);

  // Hide cursor when user moves their own mouse
  useEffect(() => {
    let hideTimer: NodeJS.Timeout;

    const handleMouseMove = () => {
      setIsVisible(false);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        setIsVisible(true);
      }, 3000); // Show bot cursor again after 3s of no user movement
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {/* Click ripples */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="fixed pointer-events-none z-[-1]"
          style={{
            left: `${ripple.x}%`,
            top: `${ripple.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-12 h-12 rounded-full border-2 border-[#f43f5e] animate-ping opacity-40" />
        </div>
      ))}

      {/* Main cursor */}
      <div
        className="fixed pointer-events-none z-[-1] transition-all ease-out opacity-40"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          transitionDuration: '1000ms',
        }}
      >
        {/* Cursor SVG */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          className={`drop-shadow-lg transition-transform duration-150 ${
            isClicking ? 'scale-75' : 'scale-100'
          }`}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(244, 63, 94, 0.5))',
          }}
        >
          <path
            d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.88a.5.5 0 0 0-.85.33Z"
            fill="#f43f5e"
            stroke="#fff"
            strokeWidth="1.5"
          />
        </svg>

        {/* Action indicators */}
        {isScrolling && (
          <div className="absolute -right-6 top-0 flex flex-col gap-0.5">
            <div className="w-1.5 h-1.5 bg-[#6ab3f3] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-[#6ab3f3] rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
            <div className="w-1.5 h-1.5 bg-[#6ab3f3] rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
          </div>
        )}

        {/* Bot label */}
        <div className="absolute top-7 left-2 px-2 py-1 bg-[#f43f5e] rounded text-[10px] text-white font-medium whitespace-nowrap shadow-lg">
          🦞 butlr
        </div>
      </div>

      {/* Trailing particles */}
      <div
        className="fixed pointer-events-none z-[-2] transition-all duration-[1500ms] ease-out opacity-15"
        style={{
          left: `${position.x - 1}%`,
          top: `${position.y - 1}%`,
        }}
      >
        <div className="w-3 h-3 bg-[#f43f5e] rounded-full blur-sm" />
      </div>
      <div
        className="fixed pointer-events-none z-[-2] transition-all duration-[2000ms] ease-out opacity-10"
        style={{
          left: `${position.x - 2}%`,
          top: `${position.y - 2}%`,
        }}
      >
        <div className="w-2 h-2 bg-[#fb7185] rounded-full blur-sm" />
      </div>
    </>
  );
}
