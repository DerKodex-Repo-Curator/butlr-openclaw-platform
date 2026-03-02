'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  BookOpen,
  Menu,
  X,
  Package,
  Shield,
  Brain,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { auth } from '@/lib/api';
const navItems: Array<{ href: string; label: string; icon: any; avatar?: string }> = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/usage', label: 'Usage Stats', icon: BarChart3 },
  { href: '/dashboard/skills', label: 'Skills', icon: Package },
  { href: '/dashboard/memory', label: 'Memory', icon: Brain },
  { href: '/dashboard/souls', label: 'SoulVault', icon: null, avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=SoulVault-Logo&size=20&backgroundColor=f43f5e' },
  { href: '/dashboard/security', label: 'Security', icon: Shield },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/support', label: 'Support', icon: HelpCircle },
];
// ─── Sidebar Nebula Background ──────────────────────────────
function SidebarNebula() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement?.getBoundingClientRect();
      w = rect?.width || 256;
      h = rect?.height || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    // Stars — very few, tiny
    const stars = Array.from({ length: 40 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 0.8 + 0.2,
      opacity: Math.random() * 0.25 + 0.05,
      speed: Math.random() * 1.5 + 0.5,
      phase: Math.random() * Math.PI * 2,
    }));
    // Nebulae — vertical, teal/emerald/rose accents
    const nebulae = [
      { x: 0.3, y: 0.15, r: 180, color: '20, 184, 166', opacity: 0.035, speed: 0.12, phase: 0 },      // teal
      { x: 0.7, y: 0.45, r: 200, color: '244, 63, 94', opacity: 0.025, speed: 0.1, phase: 1.5 },       // rose
      { x: 0.4, y: 0.7, r: 160, color: '99, 102, 241', opacity: 0.03, speed: 0.15, phase: 3 },          // indigo
      { x: 0.6, y: 0.9, r: 140, color: '16, 185, 129', opacity: 0.02, speed: 0.08, phase: 4.5 },        // emerald
      { x: 0.2, y: 0.5, r: 120, color: '139, 92, 246', opacity: 0.02, speed: 0.18, phase: 2 },          // violet
    ];
    const animate = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      // Base fill
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, w, h);
      // Nebulae
      for (const n of nebulae) {
        const pulse = 1 + Math.sin(t * 0.001 * n.speed + n.phase) * 0.3;
        const drift = t * 0.00002;
        const nx = (n.x + Math.sin(drift * 80 + n.phase) * 0.04) * w;
        const ny = (n.y + Math.cos(drift * 60 + n.phase) * 0.02) * h;
        const r = n.r * (w / 256) * pulse;
        const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
        grad.addColorStop(0, `rgba(${n.color}, ${n.opacity * 1.8})`);
        grad.addColorStop(0.5, `rgba(${n.color}, ${n.opacity * 0.6})`);
        grad.addColorStop(1, `rgba(${n.color}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(nx - r, ny - r, r * 2, r * 2);
      }
      // Stars
      for (const s of stars) {
        const twinkle = 0.4 + Math.sin(t * 0.001 * s.speed + s.phase) * 0.6;
        const alpha = s.opacity * twinkle;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
// ─── Main Sidebar ───────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleLogout = () => {
    auth.logout();
    window.location.href = '/login';
  };
  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="relative z-10 p-6 border-b border-white/[0.06] flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="text-2xl">🦞</span>
          <span className="text-xl font-bold text-white">Butlr</span>
        </Link>
      </div>
      {/* Navigation */}
      <nav className="relative z-10 flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-[#f43f5e]/15 text-[#fb7185] shadow-[inset_0_0_20px_rgba(244,63,94,0.05)]'
                  : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              {item.avatar ? (
                <img src={item.avatar} alt="" className="w-5 h-5 rounded" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {/* Logout */}
      <div className="relative z-10 p-4 border-t border-white/[0.06] space-y-1">
        <Link
          href="/dashboard/changelog"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:bg-white/[0.04] hover:text-white transition-all w-full"
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-sm font-medium">Changelog</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </>
  );
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/[0.06] h-screen fixed left-0 top-0 overflow-hidden z-20">
        <SidebarNebula />
        <NavContent />
      </aside>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0d1117]/90 backdrop-blur-xl border-b border-white/[0.06] z-40 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="text-xl">🦞</span>
          <span className="text-lg font-bold text-white">Butlr</span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-gray-400 hover:text-white"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>
      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/* Mobile Menu */}
      <aside
        className={`lg:hidden fixed top-0 left-0 w-64 h-screen z-50 transform transition-transform duration-300 flex flex-col overflow-hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarNebula />
        <NavContent />
      </aside>
    </>
  );
}
