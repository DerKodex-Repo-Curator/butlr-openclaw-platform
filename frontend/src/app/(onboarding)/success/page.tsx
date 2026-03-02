'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, MessageCircle, LayoutDashboard, Copy, Check, Sparkles, Smartphone, Loader2 } from 'lucide-react';
import ButlerLobster from '@/components/landing/ButlerLobster';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

interface UserData {
  id: number;
  email: string;
  name: string | null;
  bot_username: string | null;
  stripe_customer_id: string | null;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const customerId = searchParams.get('customer_id');
  const botUsername = searchParams.get('bot');

  useEffect(() => {
    async function autoLogin() {
      if (!customerId) {
        setError('Missing customer ID');
        setLoading(false);
        return;
      }

      try {
        const stripeResponse = await fetch(`${API_BASE}/customers/${customerId}`);
        if (stripeResponse.ok) {
          const customerData = await stripeResponse.json();

          if (customerData.stripe_customer_id) {
            const authResponse = await fetch(`${API_BASE}/auth/stripe-login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customer_id: customerData.stripe_customer_id }),
            });

            if (authResponse.ok) {
              const authData = await authResponse.json();
              localStorage.setItem('butlr_token', authData.token);
            }
          }

          setUser({
            id: customerData.id,
            email: customerData.email,
            name: customerData.name,
            bot_username: customerData.telegram_bot_username || botUsername,
            stripe_customer_id: customerData.stripe_customer_id,
          });
        }
      } catch (err) {
        console.error('Auto-login error:', err);
        if (botUsername) {
          setUser({
            id: parseInt(customerId) || 0,
            email: '',
            name: null,
            bot_username: botUsername,
            stripe_customer_id: null,
          });
        } else {
          setError('Failed to load your account');
        }
      }

      setLoading(false);
    }

    autoLogin();
  }, [customerId, botUsername]);

  const copyStripeId = () => {
    if (user?.stripe_customer_id) {
      navigator.clipboard.writeText(user.stripe_customer_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#f43f5e] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="text-[#f43f5e] hover:text-[#fb7185]">Back to Home</Link>
        </div>
      </div>
    );
  }

  const actualBotUsername = user?.bot_username || botUsername;
  const telegramUrl = `https://t.me/${actualBotUsername}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(telegramUrl)}&bgcolor=111827&color=f43f5e`;

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <ButlerLobster size={40} animated={false} />
          <span className="text-2xl font-bold text-white">Butlr</span>
        </Link>

        {/* Success Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#10b981] to-[#f43f5e] flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-2">
            Your Butler is Ready!
            <Sparkles className="inline-block w-6 h-6 ml-2 text-yellow-400" />
          </h1>

          <p className="text-gray-400 mb-6">
            {actualBotUsername ? (
              <>Your personal AI assistant <span className="text-[#f43f5e] font-semibold">@{actualBotUsername}</span> is waiting for you.</>
            ) : (
              <>Your personal AI assistant is set up and ready to help.</>
            )}
          </p>

          {/* QR Code Section */}
          {actualBotUsername && (
            <div className="mb-6">
              {showQR && (
                <div className="bg-white rounded-2xl p-4 inline-block mb-4">
                  <img src={qrCodeUrl} alt="Scan to open in Telegram" className="w-48 h-48 mx-auto" />
                </div>
              )}

              <button
                onClick={() => setShowQR(!showQR)}
                className="flex items-center justify-center gap-2 mx-auto text-sm text-gray-400 hover:text-white transition mb-4"
              >
                {showQR ? 'Hide QR Code' : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    Scan QR code with phone
                  </>
                )}
              </button>

              {/* Main CTA - Open Telegram */}
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#f43f5e] to-[#fb7185] text-white font-semibold text-lg hover:shadow-lg hover:shadow-[#f43f5e]/25 transition"
              >
                <MessageCircle className="w-6 h-6" />
                Open in Telegram
              </a>
            </div>
          )}

          {/* Secondary CTA - Dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-3 w-full py-3 px-6 rounded-xl bg-[#0d1117] border border-gray-800 hover:border-[#f43f5e]/50 text-white font-medium transition"
          >
            <LayoutDashboard className="w-5 h-5" />
            Go to Dashboard
          </Link>

          {/* Login Info */}
          {user?.email && (
            <>
              <div className="border-t border-gray-800 my-6" />
              <div className="text-left bg-[#0d1117] rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-3">Your account:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Email:</span>
                    <span className="text-white font-mono text-xs">{user.email}</span>
                  </div>
                  {user.stripe_customer_id && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Customer ID:</span>
                      <button
                        onClick={copyStripeId}
                        className="flex items-center gap-2 text-white font-mono text-xs hover:text-[#f43f5e] transition"
                      >
                        {user.stripe_customer_id.slice(0, 16)}...
                        {copied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Need help? Just ask your Butler - it knows everything about itself!
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#f43f5e] animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
