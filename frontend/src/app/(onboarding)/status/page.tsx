'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Loader2, Server, Settings, Sparkles, AlertCircle } from 'lucide-react';
import LiveTerminal from '@/components/onboarding/LiveTerminal';
import ButlerLobster from '@/components/landing/ButlerLobster';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

interface OnboardingStatus {
  status: string;
  step?: string;
  bot_username?: string;
  vm_ip?: string;
  error?: string;
}

const STEPS = [
  { key: 'account', label: 'Creating your account', icon: Settings, description: 'Setting up your personal Butlr workspace...' },
  { key: 'vm', label: 'Provisioning cloud VM', icon: Server, description: 'Spinning up your dedicated server...' },
  { key: 'install', label: 'Installing AI assistant', icon: Sparkles, description: 'Deploying Butlr with all capabilities...' },
  { key: 'configure', label: 'Configuring your Butlr', icon: Sparkles, description: 'Setting up starter kit and preferences...' },
];

function OnboardingStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer_id');
  const token = searchParams.get('token');

  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!customerId || !token) {
      setError('Invalid session. Please start the onboarding process again.');
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/onboarding/status/${customerId}?token=${encodeURIComponent(token)}`);
        if (!response.ok) {
          throw new Error('Failed to get status');
        }
        const data = await response.json();
        setStatus(data);

        if (data.status === 'complete') {
          setTimeout(() => {
            router.push(`/success?customer_id=${customerId}&bot=${data.bot_username || ''}`);
          }, 2000);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2000);

    return () => clearInterval(interval);
  }, [customerId, token, router]);

  const currentStepIndex = STEPS.findIndex(s => s.key === status?.step);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-[#111827] border border-red-500/50 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f43f5e] to-[#fb7185] rounded-xl font-semibold text-white">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (status?.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-[#111827] border border-red-500/50 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-red-400 mb-4">{status.error || 'An error occurred during setup'}</p>
          <a href="mailto:support@butlr.cloud" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f43f5e] to-[#fb7185] rounded-xl font-semibold text-white">
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <ButlerLobster size={40} animated={false} />
          <span className="text-2xl font-bold text-white">Butlr</span>
        </Link>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f43f5e]/10 text-[#fb7185] rounded-full text-sm mb-4">
              <span className="w-2 h-2 bg-[#f43f5e] rounded-full animate-pulse" />
              Setting up your Butlr
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Your AI assistant is being prepared</h1>
            <p className="text-gray-400">This usually takes 2-3 minutes. Grab a coffee!</p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {STEPS.map((step, index) => {
              const isComplete = index < currentStepIndex || status?.status === 'complete';
              const isCurrent = index === currentStepIndex && status?.status !== 'complete';
              const StepIcon = step.icon;

              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-[#f43f5e]/10 border border-[#f43f5e]/30'
                      : isComplete
                      ? 'bg-[#10b981]/10 border border-[#10b981]/30'
                      : 'bg-[#0d1117] border border-gray-800 opacity-50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isComplete ? 'bg-[#10b981]/20' : isCurrent ? 'bg-[#f43f5e]/20' : 'bg-[#0a0f1a]'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="w-5 h-5 text-[#10b981]" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-[#f43f5e] animate-spin" />
                    ) : (
                      <StepIcon className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isComplete ? 'text-[#10b981]' : isCurrent ? 'text-white' : 'text-gray-500'}`}>
                      {step.label}
                    </p>
                    {isCurrent && <p className="text-sm text-gray-400">{step.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Complete State */}
          {status?.status === 'complete' && (
            <div className="mt-8 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#f43f5e] flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Your Butlr is ready!</h2>
              <p className="text-sm text-gray-400">Redirecting to dashboard...</p>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-8">
            <div className="h-2 bg-[#0d1117] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#f43f5e] to-[#10b981] transition-all duration-500"
                style={{
                  width: status?.status === 'complete' ? '100%' : `${((currentStepIndex + 1) / STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Live Terminal */}
          {customerId && (
            <LiveTerminal
              customerId={parseInt(customerId)}
              isActive={status?.status === 'provisioning'}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f43f5e]" />
      </div>
    }>
      <OnboardingStatusContent />
    </Suspense>
  );
}
