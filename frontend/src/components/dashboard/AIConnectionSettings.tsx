'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, RefreshCw, Unplug, ArrowRight, Zap, ChevronDown, Cpu } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('butlr_token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

const OpenAILogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

const AnthropicLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.257 0H10.173L16.744 20.48H13.14L11.06 15.14H5.56l-2.08 5.34H0L6.57 3.52zm4.31 8.57L8.31 5.39l-2.57 6.7h5.46z" />
  </svg>
);

interface AvailableModel {
  id: string;
  name: string;
  description: string;
}

interface VMStatus {
  connected: boolean;
  method: string | null;
  provider: string | null;
  label: string;
  description: string;
  model: string | null;
  available_models: AvailableModel[];
  has_vm: boolean;
  vm_ip?: string;
  error?: string;
}

export default function AIConnectionSettings() {
  const [status, setStatus] = useState<VMStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [changingModel, setChangingModel] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // OAuth flow state
  const [showCodePaste, setShowCodePaste] = useState(false);
  const [authMethod, setAuthMethod] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState('');
  const [pastedUrl, setPastedUrl] = useState('');
  const [isExchanging, setIsExchanging] = useState(false);
  const [exchangeError, setExchangeError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') === 'success') {
      showSuccessFlash('AI provider connected! 🎉');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, []);

  const showSuccessFlash = (msg: string) => {
    setShowSuccess(true);
    setSuccessMsg(msg);
    setTimeout(() => setShowSuccess(false), 5000);
  };

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/oauth-connect/vm-status`, { headers: getAuthHeaders() });
      if (res.ok) setStatus(await res.json());
    } catch (err) {
      console.error('Failed to fetch VM status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your AI provider? Your bot will stop working until you reconnect.')) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`${API_BASE}/oauth-connect/disconnect`, { method: 'POST', headers: getAuthHeaders() });
      if (res.ok) await fetchStatus();
    } catch (err) {
      console.error('Disconnect failed:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleModelChange = async (modelId: string) => {
    setChangingModel(true);
    try {
      const res = await fetch(`${API_BASE}/oauth-connect/change-model`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ model: modelId }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowModelSelect(false);
        showSuccessFlash(`Model changed to ${modelId.split('/')[1]}`);
        await fetchStatus();
      } else {
        const data = await res.json().catch(() => ({}));
        setExchangeError(data.detail || 'Failed to change model');
      }
    } catch (err: any) {
      setExchangeError(err.message || 'Failed to change model');
    } finally {
      setChangingModel(false);
    }
  };

  const startOpenAIOAuth = async () => {
    try {
      setExchangeError('');
      const res = await fetch(`${API_BASE}/onboarding/vm-auth/me`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ method: 'openai-codex' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.auth_url) {
          window.open(data.auth_url, '_blank');
          setShowCodePaste(true);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setExchangeError(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail) || 'Failed to start auth');
      }
    } catch (err: any) {
      setExchangeError(err?.message || 'Failed to start OpenAI connection');
    }
  };

  const handleCodeExchange = async () => {
    if (!pastedUrl.trim()) return;
    setIsExchanging(true);
    setExchangeError('');
    try {
      const res = await fetch(`${API_BASE}/onboarding/vm-auth-exchange/me`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ callback_url: pastedUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Token exchange failed');
      }
      setShowCodePaste(false);
      setPastedUrl('');
      showSuccessFlash('OpenAI connected! 🎉');
      await fetchStatus();
    } catch (err: any) {
      setExchangeError(err.message || 'Exchange failed');
    } finally {
      setIsExchanging(false);
    }
  };

  const handleAnthropicConnect = async () => {
    if (!setupToken.trim()) return;
    setIsExchanging(true);
    setExchangeError('');
    try {
      const res = await fetch(`${API_BASE}/onboarding/vm-auth/me`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ method: 'anthropic-setup-token', token: setupToken.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Failed to connect Claude');
      }
      setAuthMethod(null);
      setSetupToken('');
      showSuccessFlash('Claude connected! 🎉');
      await fetchStatus();
    } catch (err: any) {
      setExchangeError(err.message || 'Connection failed');
    } finally {
      setIsExchanging(false);
    }
  };

  const getProviderIcon = (provider: string | null) => {
    if (provider?.includes('openai') || provider?.includes('codex'))
      return <OpenAILogo className="w-5 h-5 text-[#10a37f]" />;
    if (provider?.includes('anthropic'))
      return <AnthropicLogo className="w-5 h-5 text-[#d4a574]" />;
    return <Zap className="w-5 h-5 text-gray-400" />;
  };

  const getProviderColor = (provider: string | null) => {
    if (provider?.includes('openai') || provider?.includes('codex')) return '#10a37f';
    if (provider?.includes('anthropic')) return '#d4a574';
    return '#6b7280';
  };

  const getMethodLabel = (method: string | null) => {
    if (method === 'oauth_openai') return 'OAuth (ChatGPT Plus)';
    if (method === 'setup_token_anthropic') return 'Setup Token';
    if (method === 'oauth_anthropic') return 'OAuth (Claude)';
    if (method === 'api_key') return 'API Key';
    return 'Unknown';
  };

  if (loading) {
    return (
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          <span className="text-sm text-gray-400">Checking VM connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {exchangeError && (
        <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {exchangeError}
        </div>
      )}

      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${getProviderColor(status?.provider || null)}15` }}>
            {getProviderIcon(status?.provider || null)}
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">AI Connection</h2>
            <p className="text-xs text-gray-500">
              {status?.connected ? status.description : 'Connect your AI subscription'}
            </p>
          </div>
          {status?.connected && (
            <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold rounded-full tracking-wider">
              CONNECTED
            </span>
          )}
        </div>

        {status?.connected ? (
          /* ── Connected State ── */
          <div className="space-y-4">
            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0d1117] rounded-xl p-3.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Provider</span>
                <div className="flex items-center gap-2">
                  {getProviderIcon(status.provider)}
                  <span className="text-sm text-white font-medium">{status.label}</span>
                </div>
              </div>
              <div className="bg-[#0d1117] rounded-xl p-3.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Auth Method</span>
                <span className="text-sm text-white">{getMethodLabel(status.method)}</span>
              </div>
            </div>

            {/* Model Selector */}
            <div className="bg-[#0d1117] rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Active Model</span>
                  <span className="text-sm text-white font-mono">{status.model}</span>
                </div>
                <button
                  onClick={() => setShowModelSelect(!showModelSelect)}
                  disabled={changingModel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                  {changingModel ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Cpu className="w-3 h-3" />
                  )}
                  Change
                  <ChevronDown className={`w-3 h-3 transition-transform ${showModelSelect ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showModelSelect && status.available_models && (
                <div className="mt-3 space-y-1.5 border-t border-gray-800 pt-3">
                  {status.available_models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      disabled={changingModel || model.id === status.model}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all ${
                        model.id === status.model
                          ? 'bg-[#f43f5e]/10 border border-[#f43f5e]/30'
                          : 'hover:bg-gray-800 border border-transparent'
                      } disabled:opacity-50`}
                    >
                      <div>
                        <span className={`text-sm font-medium ${model.id === status.model ? 'text-[#fb7185]' : 'text-white'}`}>
                          {model.name}
                        </span>
                        <span className="text-[11px] text-gray-500 ml-2">{model.description}</span>
                      </div>
                      {model.id === status.model && (
                        <span className="text-[9px] text-[#f43f5e] font-bold">ACTIVE</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={fetchStatus}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#0d1117] border border-gray-800 text-gray-400 rounded-xl hover:bg-gray-800 hover:text-white transition-colors text-xs"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#0d1117] border border-red-900/30 text-red-400/70 rounded-xl hover:bg-red-950/20 hover:text-red-400 transition-colors text-xs disabled:opacity-50"
              >
                {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unplug className="w-3 h-3" />}
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          /* ── Not Connected ── */
          <div className="space-y-4">
            {status?.error ? (
              <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <XCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white">VM unreachable</p>
                  <p className="text-[11px] text-gray-500">{status.error}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-[#f43f5e]/5 border border-[#f43f5e]/20 rounded-xl">
                <XCircle className="w-4 h-4 text-[#f43f5e] flex-shrink-0" />
                <div>
                  <p className="text-sm text-white">No AI provider connected</p>
                  <p className="text-[11px] text-gray-500">Connect your ChatGPT or Claude subscription</p>
                </div>
              </div>
            )}

            {/* Connect Buttons */}
            {!showCodePaste && authMethod !== 'anthropic' && (
              <>
                <div className="bg-[#10a37f]/5 border border-[#10a37f]/15 rounded-xl p-3.5">
                  <p className="text-xs text-white font-semibold mb-1.5">How it works:</p>
                  <ol className="text-[11px] text-gray-400 space-y-1">
                    <li><span className="text-[#10a37f] font-bold">1.</span> Click below → OpenAI login opens</li>
                    <li><span className="text-[#10a37f] font-bold">2.</span> Log in with ChatGPT</li>
                    <li><span className="text-[#10a37f] font-bold">3.</span> Page won{"'"}t load — <strong className="text-white">copy the URL</strong></li>
                    <li><span className="text-[#10a37f] font-bold">4.</span> Paste it back here</li>
                  </ol>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={startOpenAIOAuth}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-[#10a37f] text-white rounded-xl text-sm font-medium hover:bg-[#0d8c6d] transition-colors"
                  >
                    <OpenAILogo className="w-4 h-4" />
                    OpenAI
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => { setAuthMethod('anthropic'); setShowCodePaste(false); }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a2e] border border-[#d4a574]/40 text-[#d4a574] rounded-xl text-sm font-medium hover:bg-[#d4a574]/10 transition-colors"
                  >
                    <AnthropicLogo className="w-4 h-4" />
                    Claude
                  </button>
                </div>
              </>
            )}

            {/* OpenAI Code Paste */}
            {showCodePaste && (
              <div className="space-y-3">
                <div className="bg-[#10a37f]/5 border border-[#10a37f]/20 rounded-xl p-3.5">
                  <p className="text-xs text-white font-semibold mb-1">Almost there! 🎉</p>
                  <p className="text-[11px] text-gray-400">Copy the URL from the page that couldn{"'"}t load and paste it below.</p>
                </div>
                <input
                  type="text" value={pastedUrl} onChange={(e) => setPastedUrl(e.target.value)}
                  placeholder="http://localhost:1455/auth/callback?code=..."
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#10a37f]/50 font-mono text-xs transition-colors"
                />
                <div className="flex gap-2">
                  <button onClick={handleCodeExchange} disabled={isExchanging || !pastedUrl.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#10a37f] text-white rounded-xl text-sm font-medium hover:bg-[#0d8c6d] disabled:opacity-50 transition-colors">
                    {isExchanging ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {isExchanging ? 'Verifying...' : 'Complete'}
                  </button>
                  <button onClick={() => { setShowCodePaste(false); setPastedUrl(''); setExchangeError(''); }}
                    className="px-3 py-2.5 text-gray-500 hover:text-white transition-colors text-xs">Cancel</button>
                </div>
              </div>
            )}

            {/* Anthropic Setup Token */}
            {authMethod === 'anthropic' && !showCodePaste && (
              <div className="space-y-3">
                <div className="bg-[#d4a574]/5 border border-[#d4a574]/20 rounded-xl p-3.5">
                  <p className="text-xs text-white font-semibold mb-1">Connect Claude Pro/Max</p>
                  <p className="text-[11px] text-gray-400 mb-2">Run this on your computer:</p>
                  <code className="block bg-[#0d1117] rounded-lg p-2 text-[#d4a574] font-mono text-xs">claude setup-token</code>
                </div>
                <input
                  type="password" value={setupToken} onChange={(e) => setSetupToken(e.target.value)}
                  placeholder="sk-ant-oat01-..."
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#d4a574]/50 font-mono text-xs transition-colors"
                />
                <div className="flex gap-2">
                  <button onClick={handleAnthropicConnect} disabled={isExchanging || !setupToken.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#d4a574] text-white rounded-xl text-sm font-medium hover:bg-[#c49464] disabled:opacity-50 transition-colors">
                    {isExchanging ? 'Connecting...' : 'Connect Claude'}
                  </button>
                  <button onClick={() => { setAuthMethod(null); setSetupToken(''); setExchangeError(''); }}
                    className="px-3 py-2.5 text-gray-500 hover:text-white transition-colors text-xs">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
