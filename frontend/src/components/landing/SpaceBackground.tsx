'use client';

import { useEffect, useRef, useState } from 'react';

interface Star {
  x: number;
  y: number;
  z: number; // 0-1, depth layer
  baseSize: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  opacity: number;
  pulseSpeed: number;
  pulsePhase: number;
}

const STAR_COUNT_DESKTOP = 500;
const STAR_COUNT_MOBILE = 150;
const DEEP_STAR_COUNT_DESKTOP = 300;
const DEEP_STAR_COUNT_MOBILE = 80;

const STAR_COLORS = [
  '255, 255, 255',     // white
  '200, 220, 255',     // blue-white
  '255, 240, 220',     // warm white
  '180, 200, 255',     // blue
  '255, 200, 180',     // orange tint
];

function createStars(count: number, maxSize: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    z: Math.random(),
    baseSize: Math.random() * maxSize + 0.3,
    opacity: Math.random() * 0.6 + 0.4,
    twinkleSpeed: Math.random() * 3 + 0.5,
    twinklePhase: Math.random() * Math.PI * 2,
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
  }));
}

function createNebulae(): Nebula[] {
  return [
    { x: 0.2, y: 0.25, radius: 350, color: '244, 63, 94', opacity: 0.05, pulseSpeed: 0.3, pulsePhase: 0 },
    { x: 0.75, y: 0.55, radius: 400, color: '106, 179, 243', opacity: 0.04, pulseSpeed: 0.25, pulsePhase: 1 },
    { x: 0.5, y: 0.1, radius: 300, color: '139, 92, 246', opacity: 0.035, pulseSpeed: 0.35, pulsePhase: 2 },
    { x: 0.85, y: 0.15, radius: 250, color: '244, 63, 94', opacity: 0.03, pulseSpeed: 0.2, pulsePhase: 3 },
    { x: 0.1, y: 0.7, radius: 320, color: '106, 179, 243', opacity: 0.035, pulseSpeed: 0.28, pulsePhase: 4 },
    { x: 0.6, y: 0.8, radius: 280, color: '139, 92, 246', opacity: 0.025, pulseSpeed: 0.32, pulsePhase: 5 },
  ];
}

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const scrollRef = useRef({ y: 0, targetY: 0 });
  const starsRef = useRef<Star[]>([]);
  const deepStarsRef = useRef<Star[]>([]);
  const nebulaeRef = useRef<Nebula[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
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

    const isMobileInit = window.innerWidth < 768;
    starsRef.current = createStars(
      isMobileInit ? STAR_COUNT_MOBILE : STAR_COUNT_DESKTOP,
      isMobileInit ? 1.5 : 2.5
    );
    deepStarsRef.current = createStars(
      isMobileInit ? DEEP_STAR_COUNT_MOBILE : DEEP_STAR_COUNT_DESKTOP,
      isMobileInit ? 0.8 : 1.2
    );
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

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current.targetY = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        mouseRef.current.targetX = (t.clientX / window.innerWidth - 0.5) * 2;
        mouseRef.current.targetY = (t.clientY / window.innerHeight - 0.5) * 2;
      }
    };

    resize();
    handleScroll();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    let lastShootingStar = 0;

    const animate = (timestamp: number) => {
      const dt = Math.min((timestamp - timeRef.current) / 1000, 0.1);
      timeRef.current = timestamp;

      // ─── Responsive scale factor ─────────────────
      // All pixel offsets scale relative to screen size
      const scale = Math.min(canvasW, canvasH) / 1000; // 1.0 at 1000px, ~0.4 at 400px
      const isMobile = canvasW < 768;

      // ─── Smooth interpolation ────────────────────
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;
      scrollRef.current.y += (scrollRef.current.targetY - scrollRef.current.y) * 0.05;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const scrollProgress = scrollRef.current.y; // 0 → 1

      // Scroll-based effects (scaled)
      const scrollWarp = 1 + scrollProgress * (isMobile ? 0.8 : 2);
      const scrollDrift = scrollProgress * 80 * scale;

      // ─── Clear ───────────────────────────────────
      ctx.clearRect(0, 0, canvasW, canvasH);

      // ─── Background gradient ─────────────────────
      const bgGrad = ctx.createRadialGradient(
        canvasW * 0.5 + mx * 30 * scale, canvasH * 0.4 + my * 20 * scale,
        0,
        canvasW * 0.5, canvasH * 0.5,
        Math.max(canvasW, canvasH) * 0.7
      );
      bgGrad.addColorStop(0, '#0c1220');
      bgGrad.addColorStop(0.5, '#070b14');
      bgGrad.addColorStop(1, '#030508');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // ─── Nebulae (responsive radius) ─────────────
      for (const neb of nebulaeRef.current) {
        const pulse = 1 + Math.sin(timestamp * 0.001 * neb.pulseSpeed + neb.pulsePhase) * 0.2;
        const nx = neb.x * canvasW + mx * 50 * scale;
        const ny = neb.y * canvasH + my * 40 * scale - scrollDrift * 0.3;
        // Scale nebula radius to screen size
        const r = neb.radius * scale * pulse;
        const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
        grad.addColorStop(0, `rgba(${neb.color}, ${neb.opacity * 1.8})`);
        grad.addColorStop(0.3, `rgba(${neb.color}, ${neb.opacity})`);
        grad.addColorStop(1, `rgba(${neb.color}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(nx - r, ny - r, r * 2, r * 2);
      }

      // ─── Deep stars (background layer) ───────────
      for (const star of deepStarsRef.current) {
        const parallaxStrength = 0.3;
        const sx = star.x * canvasW + mx * 15 * parallaxStrength * scale;
        const sy = star.y * canvasH + my * 12 * parallaxStrength * scale - scrollDrift * 0.2;
        const twinkle = 0.4 + Math.sin(timestamp * 0.001 * star.twinkleSpeed + star.twinklePhase) * 0.6;
        const alpha = star.opacity * twinkle * 0.5;

        ctx.beginPath();
        ctx.arc(sx, sy, star.baseSize * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color}, ${alpha})`;
        ctx.fill();
      }

      // ─── Main stars (foreground, strong parallax) ─
      for (const star of starsRef.current) {
        const depth = 0.3 + star.z * 0.7;
        const sx = star.x * canvasW + mx * 60 * depth * scale;
        const sy = star.y * canvasH + my * 50 * depth * scale - scrollDrift * depth;
        const twinkle = 0.3 + Math.sin(timestamp * 0.001 * star.twinkleSpeed + star.twinklePhase) * 0.7;
        const alpha = star.opacity * twinkle;

        // Scroll warp (reduced on mobile)
        const warpScale = 1 + (scrollWarp - 1) * depth * (isMobile ? 0.15 : 0.3);

        // Star glow for bigger stars (smaller glow on mobile)
        if (star.baseSize > 1.5 && !isMobile) {
          const glowR = star.baseSize * 3;
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
          glow.addColorStop(0, `rgba(${star.color}, ${alpha * 0.3})`);
          glow.addColorStop(1, `rgba(${star.color}, 0)`);
          ctx.fillStyle = glow;
          ctx.fillRect(sx - glowR, sy - glowR, glowR * 2, glowR * 2);
        } else if (star.baseSize > 1.8 && isMobile) {
          const glowR = star.baseSize * 1.5;
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
          glow.addColorStop(0, `rgba(${star.color}, ${alpha * 0.2})`);
          glow.addColorStop(1, `rgba(${star.color}, 0)`);
          ctx.fillStyle = glow;
          ctx.fillRect(sx - glowR, sy - glowR, glowR * 2, glowR * 2);
        }

        // Star core (warp-stretched on scroll)
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(1, warpScale);
        ctx.beginPath();
        ctx.arc(0, 0, star.baseSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color}, ${alpha})`;
        ctx.fill();
        ctx.restore();
      }

      // ─── Shooting stars ──────────────────────────
      if (timestamp - lastShootingStar > 2500 + Math.random() * 3000) {
        if (Math.random() > 0.2) {
          const fromLeft = Math.random() > 0.5;
          const speedScale = isMobile ? 0.5 : 1;
          shootingStarsRef.current.push({
            x: fromLeft ? -30 : canvasW + 30,
            y: Math.random() * canvasH * 0.6,
            vx: (fromLeft ? 1 : -1) * (400 + Math.random() * 500) * speedScale,
            vy: (200 + Math.random() * 300) * speedScale,
            life: 0,
            maxLife: 0.5 + Math.random() * 0.5,
            size: 1.5 + Math.random() * 1.5,
          });
          lastShootingStar = timestamp;
        }
      }

      shootingStarsRef.current = shootingStarsRef.current.filter(s => {
        s.life += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        const progress = s.life / s.maxLife;
        const alpha = progress < 0.1 ? progress * 10 : Math.max(0, 1 - ((progress - 0.1) / 0.9));
        if (alpha <= 0) return false;

        // Trail
        const trailLen = 80;
        const tx = s.x - s.vx * dt * trailLen;
        const ty = s.y - s.vy * dt * trailLen;
        const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
        grad.addColorStop(0.3, `rgba(200, 220, 255, ${alpha * 0.4})`);
        grad.addColorStop(1, 'rgba(200, 220, 255, 0)');

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.size;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Head glow
        const gr = 6;
        const headGlow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, gr);
        headGlow.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        headGlow.addColorStop(0.5, `rgba(200, 220, 255, ${alpha * 0.3})`);
        headGlow.addColorStop(1, 'rgba(200, 220, 255, 0)');
        ctx.fillStyle = headGlow;
        ctx.fillRect(s.x - gr, s.y - gr, gr * 2, gr * 2);

        return s.life < s.maxLife;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ pointerEvents: 'none' }}
    />
  );
}
