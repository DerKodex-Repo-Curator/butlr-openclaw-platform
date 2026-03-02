'use client';

interface ButlerLobsterProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export default function ButlerLobster({ size = 64, className = '', animated = true }: ButlerLobsterProps) {
  return (
    <div
      className={`relative inline-block ${animated ? 'animate-float-lobster' : ''} ${className}`}
      style={{ width: size, height: size * 1.2 }}
    >
      {/* Butler Cap/Hat */}
      <svg
        viewBox="0 0 100 50"
        className="absolute -top-[15%] left-1/2 -translate-x-1/2 z-10"
        style={{ width: size * 0.9, height: size * 0.45 }}
      >
        {/* Hat brim */}
        <ellipse
          cx="50"
          cy="42"
          rx="45"
          ry="8"
          fill="#1a1a2e"
          stroke="#2d2d44"
          strokeWidth="1"
        />
        {/* Hat top (dome) */}
        <path
          d="M 20 42 Q 20 15 50 12 Q 80 15 80 42"
          fill="#1a1a2e"
          stroke="#2d2d44"
          strokeWidth="1"
        />
        {/* Hat band */}
        <rect x="20" y="35" width="60" height="6" fill="#f43f5e" rx="1" />
        {/* Shine on hat */}
        <ellipse cx="35" cy="25" rx="8" ry="4" fill="rgba(255,255,255,0.1)" />
      </svg>

      {/* Lobster Emoji */}
      <span
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{ fontSize: size * 0.85 }}
      >
        <span>🦞</span>
      </span>
    </div>
  );
}

// Larger, more detailed SVG version for hero sections
export function ButlerLobsterLarge({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 200 220" className="w-full h-full">
        {/* Shadow */}
        <ellipse cx="100" cy="210" rx="60" ry="10" fill="rgba(0,0,0,0.2)" />

        {/* Butler Hat */}
        <g className="animate-pulse" style={{ animationDuration: '4s' }}>
          {/* Hat brim */}
          <ellipse cx="100" cy="45" rx="55" ry="10" fill="#1a1a2e" stroke="#3d3d5c" strokeWidth="2" />
          {/* Hat top */}
          <path
            d="M 55 45 Q 55 10 100 5 Q 145 10 145 45"
            fill="#1a1a2e"
            stroke="#3d3d5c"
            strokeWidth="2"
          />
          {/* Hat band */}
          <rect x="55" y="35" width="90" height="8" fill="#f43f5e" rx="2" />
          {/* Band buckle/detail */}
          <rect x="92" y="33" width="16" height="12" fill="#fbbf24" rx="2" />
          <rect x="96" y="36" width="8" height="6" fill="#1a1a2e" rx="1" />
          {/* Shine */}
          <ellipse cx="75" cy="22" rx="12" ry="5" fill="rgba(255,255,255,0.08)" />
        </g>

        {/* Lobster Body - Stylized */}
        <g transform="translate(100, 130)">
          {/* Main body */}
          <ellipse cx="0" cy="20" rx="45" ry="55" fill="#e63946" />
          <ellipse cx="0" cy="15" rx="40" ry="45" fill="#f43f5e" />

          {/* Body segments */}
          <ellipse cx="0" cy="-5" rx="35" ry="12" fill="#ff6b6b" opacity="0.5" />
          <ellipse cx="0" cy="10" rx="38" ry="10" fill="#ff6b6b" opacity="0.3" />
          <ellipse cx="0" cy="25" rx="40" ry="10" fill="#ff6b6b" opacity="0.3" />

          {/* Eyes */}
          <g>
            {/* Eye stalks */}
            <ellipse cx="-18" cy="-35" rx="6" ry="12" fill="#f43f5e" />
            <ellipse cx="18" cy="-35" rx="6" ry="12" fill="#f43f5e" />
            {/* Eyes */}
            <circle cx="-18" cy="-42" r="8" fill="#0d1117" />
            <circle cx="18" cy="-42" r="8" fill="#0d1117" />
            {/* Eye shine */}
            <circle cx="-15" cy="-44" r="3" fill="white" />
            <circle cx="21" cy="-44" r="3" fill="white" />
          </g>

          {/* Claws */}
          <g>
            {/* Left claw */}
            <g transform="translate(-55, -10) rotate(-30)">
              <ellipse cx="0" cy="0" rx="25" ry="15" fill="#f43f5e" />
              <ellipse cx="-15" cy="-8" rx="12" ry="8" fill="#f43f5e" />
              <ellipse cx="-15" cy="8" rx="12" ry="8" fill="#f43f5e" />
              {/* Claw highlight */}
              <ellipse cx="5" cy="-3" rx="8" ry="4" fill="#ff6b6b" opacity="0.5" />
            </g>
            {/* Right claw */}
            <g transform="translate(55, -10) rotate(30)">
              <ellipse cx="0" cy="0" rx="25" ry="15" fill="#f43f5e" />
              <ellipse cx="15" cy="-8" rx="12" ry="8" fill="#f43f5e" />
              <ellipse cx="15" cy="8" rx="12" ry="8" fill="#f43f5e" />
              {/* Claw highlight */}
              <ellipse cx="-5" cy="-3" rx="8" ry="4" fill="#ff6b6b" opacity="0.5" />
            </g>
          </g>

          {/* Tail */}
          <g transform="translate(0, 60)">
            <ellipse cx="0" cy="0" rx="30" ry="12" fill="#e63946" />
            <ellipse cx="0" cy="12" rx="25" ry="10" fill="#e63946" />
            <ellipse cx="0" cy="22" rx="20" ry="8" fill="#e63946" />
            {/* Tail fan */}
            <ellipse cx="-15" cy="32" rx="12" ry="6" fill="#f43f5e" transform="rotate(-20)" />
            <ellipse cx="0" cy="35" rx="10" ry="6" fill="#f43f5e" />
            <ellipse cx="15" cy="32" rx="12" ry="6" fill="#f43f5e" transform="rotate(20)" />
          </g>

          {/* Legs */}
          <g opacity="0.8">
            <rect x="-40" y="30" width="4" height="25" fill="#e63946" rx="2" transform="rotate(-15, -40, 30)" />
            <rect x="-35" y="35" width="4" height="22" fill="#e63946" rx="2" transform="rotate(-10, -35, 35)" />
            <rect x="36" y="30" width="4" height="25" fill="#e63946" rx="2" transform="rotate(15, 40, 30)" />
            <rect x="31" y="35" width="4" height="22" fill="#e63946" rx="2" transform="rotate(10, 35, 35)" />
          </g>
        </g>

        {/* Bow tie */}
        <g transform="translate(100, 95)">
          <path d="M -20 0 L -8 -8 L -8 8 Z" fill="#1a1a2e" />
          <path d="M 20 0 L 8 -8 L 8 8 Z" fill="#1a1a2e" />
          <circle cx="0" cy="0" r="6" fill="#f43f5e" />
        </g>
      </svg>
    </div>
  );
}
