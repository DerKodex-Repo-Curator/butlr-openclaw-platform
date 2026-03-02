'use client';

import { useEffect, useRef, useState } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  opacity: number;
  pulseSpeed: number;
  pulsePhase: number;
  driftX: number;
  driftY: number;
}

const STAR_COLORS = [
  '255, 255, 255',
  '200, 220, 255',
  '255, 240, 220',
];

function createStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 1.2 + 0.2,
    opacity: Math.random() * 0.3 + 0.1,
    twinkleSpeed: Math.random() * 2 + 0.3,
    twinklePhase: Math.random() * Math.PI * 2,
  }));
}

function createNebulae(): Nebula[] {
  return [
    // Very subtle, large nebulae — brand colors
    { x: 0.15, y: 0.2, radius: 400, color: '244, 63, 94', opacity: 0.025, pulseSpeed: 0.15, pulsePhase: 0, driftX: 0.003, driftY: 0.002 },
    { x: 0.8, y: 0.4, radius: 450, color: '106, 179, 243', opacity: 0.02, pulseSpeed: 0.12, pulsePhase: 2, driftX: -0.002, driftY: 0.003 },
    { x: 0.5, y: 0.75, radius: 350, color: '139, 92, 246', opacity: 0.018, pulseSpeed: 0.18, pulsePhase: 4, driftX: 0.004, driftY: -0.002 },
    { x: 0.9, y: 0.85, radius: 300, color: '244, 63, 94', opacity: 0.015, pulseSpeed: 0.1, pulsePhase: 1, driftX: -0.003, driftY: -0.001 },
    { x: 0.3, y: 0.5, radius: 280, color: '106, 179, 243', opacity: 0.015, pulseSpeed: 0.2, pulsePhase: 3, driftX: 0.002, driftY: 0.004 },
  ];
}

export default function DashboardBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const nebulaeRef = useRef<Nebula[]>([]);
  const animRef = useRef<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;
    starsRef.current = createStars(isMobile ? 60 : 150);
    nebulaeRef.current = createNebulae();

    let canvasW = 0;
    let canvasH = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasW = window.innerWidth;
      canvasH = window.innerHeight;
      canvas.width = canvasW * dpr;
      canvas.height = canvasH * dpr;
      canvas.style.width = canvasW + 'px';
      canvas.style.height = canvasH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = (timestamp: number) => {
      const scale = Math.min(canvasW, canvasH) / 1000;

      // Clear
      ctx.clearRect(0, 0, canvasW, canvasH);

      // Background — very dark, matching dashboard bg
      ctx.fillStyle = '#0a0f1a';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Nebulae — ultra subtle, slowly drifting and pulsing
      for (const neb of nebulaeRef.current) {
        const pulse = 1 + Math.sin(timestamp * 0.001 * neb.pulseSpeed + neb.pulsePhase) * 0.25;
        const drift = timestamp * 0.00003;
        const nx = (neb.x + Math.sin(drift * neb.driftX * 100 + neb.pulsePhase) * 0.03) * canvasW;
        const ny = (neb.y + Math.cos(drift * neb.driftY * 100 + neb.pulsePhase) * 0.03) * canvasH;
        const r = neb.radius * scale * pulse;

        const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
        grad.addColorStop(0, `rgba(${neb.color}, ${neb.opacity * 1.5})`);
        grad.addColorStop(0.4, `rgba(${neb.color}, ${neb.opacity * 0.7})`);
        grad.addColorStop(1, `rgba(${neb.color}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(nx - r, ny - r, r * 2, r * 2);
      }

      // Stars — tiny, gentle twinkle
      for (const star of starsRef.current) {
        const twinkle = 0.5 + Math.sin(timestamp * 0.001 * star.twinkleSpeed + star.twinklePhase) * 0.5;
        const alpha = star.opacity * twinkle;
        const sx = star.x * canvasW;
        const sy = star.y * canvasH;

        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${STAR_COLORS[Math.floor(star.twinklePhase) % STAR_COLORS.length]}, ${alpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    />
  );
}
