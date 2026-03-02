'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

const OpenAILogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073z" />
  </svg>
);

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const oauthResult = searchParams.get('oauth');

    // If redirected from backend with result
    if (oauthResult === 'success') {
      setStatus('success');
      setTimeout(() => router.push('/dashboard/settings'), 2000);
      return;
    }
    if (oauthResult === 'error') {
      setStatus('error');
      setError(searchParams.get('message') || 'Connection failed');
      return;
    }

    if (errorParam) {
      setStatus('error');
      setError('Authentication was cancelled or failed.');
      return;
    }

    if (code && state) {
      // Redirect to backend for token exchange
      window.location.href = `${API_BASE}/auth/openai/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
      return;
    }

    setStatus('error');
    setError('Missing authorization parameters.');
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[#10a37f]/10 rounded-2xl flex items-center justify-center">
              <OpenAILogo className="w-8 h-8 text-[#10a37f]" />
            </div>
          </div>

          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-[#10a37f] animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Connecting to OpenAI...</h1>
              <p className="text-gray-400">Setting up your ChatGPT connection.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-[#10b981] mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Connected! 🎉</h1>
              <p className="text-gray-400 mb-6">Your ChatGPT subscription is linked.</p>
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#10a37f] text-white rounded-xl font-medium hover:bg-[#0d8c6d] transition-colors"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-[#f43f5e] mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Connection Failed</h1>
              <p className="text-gray-400 mb-6">{error}</p>
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Back to Settings
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OpenAICallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#10a37f] animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
