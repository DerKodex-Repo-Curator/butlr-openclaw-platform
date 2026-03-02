'use client';

import { useState, useEffect } from 'react';
import { CreditCard, ExternalLink, Receipt, Sparkles, CheckCircle, Loader2, AlertTriangle, Brain, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import StatusBadge from '@/components/dashboard/StatusBadge';
import LoadingSpinner, { SettingsSkeleton as BillingSkeleton } from '@/components/dashboard/LoadingSpinner';

interface SubscriptionData {
  plan: string;
  status: string;
  amount: number;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end?: boolean;
  trial_end?: string;
  payment_method?: {
    type: string;
    last4: string;
    brand: string;
    exp_month: number;
    exp_year: number;
  };
}

interface AddonInfo {
  active: boolean;
  addon_type: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  status: string;
  activated_at?: string;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  pdf_url?: string;
}

const plans = [
  {
    name: 'BYOK',
    price: 1499,
    features: ['Use your ChatGPT Plus or Claude Pro subscription', 'Dedicated Cloud VM', 'Telegram Bot included', 'Full AI Assistant with tools', 'Email & Chat Support'],
  },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [memoryAddon, setMemoryAddon] = useState<AddonInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    setPageLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('butlr_token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Load subscription
      const subResponse = await fetch(`${API_BASE}/billing/subscription`, { headers });
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData);
      } else if (subResponse.status === 404) {
        // No subscription found - user might be on trial or setup not complete
        console.log('No subscription found');
      } else {
        const errorText = await subResponse.text();
        console.error('Subscription fetch error:', subResponse.status, errorText);
        setError(`Failed to load subscription data (${subResponse.status})`);
      }

      // Load invoices
      const invResponse = await fetch(`${API_BASE}/billing/invoices`, { headers });
      if (invResponse.ok) {
        const invData = await invResponse.json();
        setInvoices(invData.invoices || []);
      }

      // Load memory addon status
      try {
        const memRes = await fetch(`${API_BASE}/memory/billing-info`, { headers });
        if (memRes.ok) {
          setMemoryAddon(await memRes.json());
        }
      } catch {}

    } catch (error) {
      console.error('Failed to load billing data:', error);
      setError('Failed to connect to billing service');
    }
    setPageLoading(false);
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('butlr_token');
      const response = await fetch(`${API_BASE}/billing/portal`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank');
        }
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
    setLoading(false);
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of your billing period.')) {
      return;
    }

    setCancelling(true);
    try {
      const token = localStorage.getItem('butlr_token');
      const response = await fetch(`${API_BASE}/billing/cancel`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (response.ok) {
        loadBillingData(); // Reload to show updated status
      } else {
        alert('Failed to cancel subscription. Please try again or contact support.');
      }
    } catch (error) {
      console.error('Failed to cancel:', error);
      alert('Failed to cancel subscription. Please try again.');
    }
    setCancelling(false);
  };

  if (pageLoading) {
    return <BillingSkeleton />;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Billing</h1>
        <p className="text-gray-500 text-sm">Manage your subscription and billing</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}


      {/* Current Plan Card */}
      {subscription && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center">
                <span className="text-lg">🦞</span>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-lg font-semibold text-white">
                    `${subscription.plan.toUpperCase()} Plan`
                  </h2>
                  <StatusBadge status={subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing'} />
                </div>
                <p className="text-gray-500 text-sm">
                  {subscription.amount > 0
                    ? `€${subscription.amount}/month`
                    : 'Free'}
                  {memoryAddon?.active && (
                    <span className="text-gray-600"> + €10 Memory</span>
                  )}
                </p>
                {subscription.cancel_at_period_end && (
                  <p className="text-amber-400 text-sm mt-1">
                    Cancels on {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {subscription.status !== 'trialing' && subscription.plan !== 'trial' && (
                <button
                  onClick={handleManageBilling}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-[#f43f5e] hover:bg-[#e11d48] text-white font-medium transition-colors flex items-center gap-2"
                >
                  {loading ? <LoadingSpinner size="sm" /> : <ExternalLink className="w-4 h-4" />}
                  Manage in Stripe
                </button>
              )}
              {subscription.status === 'active' && !subscription.cancel_at_period_end && subscription.plan !== 'trial' && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
                >
                  {cancelling ? <LoadingSpinner size="sm" /> : 'Cancel'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">
                {'Current Period'}
              </p>
              <p className="text-gray-300 text-sm">
                {subscription?.current_period_start
                  ? `${new Date(subscription.current_period_start).toLocaleDateString()} - ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">
                {'Next Payment'}
              </p>
              <p className="text-gray-300 text-sm">
                {new Date(subscription?.current_period_end).toLocaleDateString()}
              </p>
            </div>
            {subscription.payment_method && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                <p className="text-gray-300 text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  {subscription.payment_method.brand} •••• {subscription.payment_method.last4}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add-ons */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-white mb-3">Add-ons</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Memory Add-on */}
          <div className={`bg-[#0d1117] border rounded-xl p-5 relative ${
            memoryAddon?.active ? 'border-[#8b5cf6]/30' : 'border-gray-800'
          }`}>
            {memoryAddon?.active && (
              <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-[#8b5cf6] text-white text-xs font-medium rounded">
                Active
              </span>
            )}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-[#8b5cf6]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Memory</h3>
                  <p className="text-gray-500 text-xs">Persistent AI memory</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-white font-bold">€10</span>
                <span className="text-gray-500 text-sm">/mo</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              Your butler remembers preferences, people, events — auto-organized by category. Works silently in the background.
            </p>
            {memoryAddon?.active ? (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">
                  Since {memoryAddon.activated_at ? new Date(memoryAddon.activated_at).toLocaleDateString() : '—'}
                </span>
                <Link
                  href="/dashboard/memory"
                  className="text-[#8b5cf6] text-sm hover:underline"
                >
                  Manage →
                </Link>
              </div>
            ) : (
              <Link
                href="/dashboard/memory"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#8b5cf6] hover:bg-[#8b5cf6]/20 transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Activate Memory
              </Link>
            )}
          </div>

          {/* Coming Soon placeholder */}
          <div className="bg-[#0d1117] border border-gray-800 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center">
            <Sparkles className="w-6 h-6 text-gray-700 mb-2" />
            <p className="text-gray-500 text-sm font-medium">More add-ons coming soon</p>
            <p className="text-gray-600 text-xs mt-1">Voice, Multi-Channel, Analytics...</p>
          </div>
        </div>
      </div>

      {/* Plans Comparison */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-white mb-3">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.plan?.toLowerCase() === plan.name.toLowerCase();
            return (
              <div
                key={plan.name}
                className={`bg-[#111827] border rounded-xl p-4 relative ${
                  isCurrentPlan ? 'border-[#f43f5e]/50' : 'border-gray-800'
                }`}
              >
                {isCurrentPlan && (
                  <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-[#f43f5e] text-white text-xs font-medium rounded">
                    Current
                  </span>
                )}

                <h3 className="text-base font-semibold text-white mb-1">{plan.name}</h3>
                <div className="mb-3">
                  <span className="text-2xl font-bold text-white">€{(plan.price / 100).toFixed(2)}</span>
                  <span className="text-gray-500 text-sm">/month</span>
                </div>

                <ul className="space-y-1.5 mb-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-400">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <button className="w-full px-3 py-2 rounded-lg bg-gray-800 text-gray-500 cursor-not-allowed text-sm" disabled>
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={handleManageBilling}
                    className="w-full px-3 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
                  >
                    {plan.price > (subscription?.amount || 0) * 100 ? 'Upgrade' : 'Switch Plan'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-white">Invoice History</h2>
        </div>

        {invoices.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No invoices yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                  <th className="pb-3 font-medium">Invoice</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-800 last:border-0">
                    <td className="py-3">
                      <code className="text-gray-400 text-xs">{invoice.id}</code>
                    </td>
                    <td className="py-3 text-gray-300 text-sm">{new Date(invoice.date).toLocaleDateString()}</td>
                    <td className="py-3 text-gray-300 text-sm">€{(invoice.amount / 100).toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                        invoice.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3">
                      {invoice.pdf_url && (
                        <a
                          href={invoice.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-white text-sm"
                        >
                          Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
