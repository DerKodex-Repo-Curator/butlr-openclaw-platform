'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import DashboardBackground from '@/components/dashboard/DashboardBackground';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSpinner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('butlr_token');
    if (!token) {
      router.push('/login');
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[#0a0f1a]">
        <Sidebar />
        <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen relative">
          <div className="p-4 lg:p-8">
            <DashboardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <DashboardBackground />
      <Sidebar />
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen relative">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
