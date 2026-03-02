// Step 4: AI Provider Connection
// Three options: ChatGPT Plus/Pro (OAuth), Claude Pro/Max (setup-token), API Key

'use client';

import { useState } from 'react';
import { Key, ExternalLink, Loader2, CheckCircle2, AlertCircle, Copy, Check, ArrowRight, Lock } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

// OpenAI Logo SVG
const OpenAILogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

// Anthropic Logo SVG
const AnthropicLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.257 0H10.173L16.744 20.48H13.14L11.06 15.14H5.56l-2.08 5.34H0L6.57 3.52zm4.31 8.57L8.31 5.39l-2.57 6.7h5.46z" />
  </svg>
);

type AuthMethod = 'oauth_openai' | 'oauth_anthropic' | 'api_key';

interface Step4Props {
  customerId: number | null;
  onboardingToken: string | null;
  sessionId: string | null;
  onNext: () => void;
  onBack: () => void;
  // For API key mode (existing)
  selectedProvider: string;
  setSelectedProvider: (p: string) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
}

const API_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic (Claude)', placeholder: 'sk-ant-api03-...', recommended: true },
  { id: 'openai', name: 'OpenAI (GPT-4)', placeholder: 'sk-...' },
];

export default function AuthStep({
  customerId,
  onboardingToken,
  sessionId,
  onNext,
  onBack,
  selectedProvider,
  setSelectedProvider,
  apiKey,
  setApiKey,
}: Step4Props) {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('oauth_openai');
  const [isConnecting, setIsConnecting] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [showSetupToken, setShowSetupToken] = useState(false);
  const [anthropicError, setAnthropicError] = useState('');
  const [anthropicSuccess, setAnthropicSuccess] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  // Start OpenAI OAuth flow
  const handleOpenAIConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch(`${API_BASE}/oauth-connect/openai/start${sessionId ? `?session_id=${sessionId}` : ""}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${onboardingToken}`,
        },
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to start OAuth flow');
      }
      
      const data = await res.json();
      // Redirect to OpenAI login
      window.location.href = data.auth_url;
    } catch (err: any) {
      console.error('OAuth start error:', err);
      setIsConnecting(false);
    }
  };

  // Submit Anthropic setup-token
  const handleAnthropicConnect = async () => {
    if (!setupToken.trim()) return;
    setIsConnecting(true);
    setAnthropicError('');
    
    try {
      const res = await fetch(`${API_BASE}/oauth-connect/anthropic/connect`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${onboardingToken}`,
        },
        body: JSON.stringify({ setup_token: setupToken.trim() }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to connect');
      }
      
      setAnthropicSuccess(true);
      setTimeout(() => onNext(), 1500);
    } catch (err: any) {
      setAnthropicError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const copyCommand = () => {
    navigator.clipboard.writeText('claude setup-token');
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Connect your AI</h2>
        <p className="text-gray-400">Choose how to power your assistant</p>
      </div>

      {/* Option 1: ChatGPT Plus/Pro */}
      <button
        onClick={() => setAuthMethod('oauth_openai')}
        className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
          authMethod === 'oauth_openai'
            ? 'border-[#10a37f] bg-[#10a37f]/5'
            : 'border-gray-700/50 bg-[#161b22] hover:border-gray-600'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            authMethod === 'oauth_openai' ? 'bg-[#10a37f]/20' : 'bg-gray-800'
          }`}>
            <OpenAILogo className={`w-6 h-6 ${authMethod === 'oauth_openai' ? 'text-[#10a37f]' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white">ChatGPT Plus / Pro</span>
              <span className="px-2 py-0.5 bg-[#10a37f]/20 text-[#10a37f] text-xs font-bold rounded-full">
                RECOMMENDED
              </span>
            </div>
            <p className="text-sm text-gray-400">
              One-click connection with your OpenAI account. Works with ChatGPT Plus ($20/mo) and Pro ($200/mo).
            </p>
          </div>
          {authMethod === 'oauth_openai' && (
            <div className="w-5 h-5 bg-[#10a37f] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </button>

      {/* OpenAI Connect Button */}
      {authMethod === 'oauth_openai' && (
        <div className="ml-16 space-y-3">
          <button
            onClick={handleOpenAIConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#10a37f] text-white rounded-xl font-semibold text-lg hover:bg-[#0d8c6d] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <OpenAILogo className="w-5 h-5" />
                Connect with OpenAI
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
            <Lock className="w-3 h-3" />
            Secure OAuth — we never see your password
          </div>
        </div>
      )}

      {/* Option 2: Claude Pro/Max */}
      <button
        onClick={() => setAuthMethod('oauth_anthropic')}
        className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
          authMethod === 'oauth_anthropic'
            ? 'border-[#d4a574] bg-[#d4a574]/5'
            : 'border-gray-700/50 bg-[#161b22] hover:border-gray-600'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            authMethod === 'oauth_anthropic' ? 'bg-[#d4a574]/20' : 'bg-gray-800'
          }`}>
            <AnthropicLogo className={`w-6 h-6 ${authMethod === 'oauth_anthropic' ? 'text-[#d4a574]' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white">Claude Pro / Max</span>
            </div>
            <p className="text-sm text-gray-400">
              Connect your Anthropic subscription. Works with Claude Pro ($20/mo) and Max ($100/mo).
            </p>
          </div>
          {authMethod === 'oauth_anthropic' && (
            <div className="w-5 h-5 bg-[#d4a574] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </button>

      {/* Anthropic Connect Flow */}
      {authMethod === 'oauth_anthropic' && (
        <div className="ml-16 space-y-4">
          {anthropicSuccess ? (
            <div className="flex items-center gap-3 p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
              <span className="text-[#10b981] font-medium">Connected! Setting up your bot...</span>
            </div>
          ) : (
            <>
              {/* Step 1: Run command */}
              <div className="bg-[#0d1117] border border-gray-800 rounded-xl p-4">
                <p className="text-sm text-gray-300 mb-3">
                  <span className="font-semibold text-white">Step 1:</span> Run this on your computer:
                </p>
                <div className="flex items-center gap-2 bg-[#161b22] rounded-lg p-3">
                  <code className="text-[#d4a574] font-mono text-sm flex-1">claude setup-token</code>
                  <button
                    onClick={copyCommand}
                    className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  >
                    {copiedCommand ? (
                      <Check className="w-4 h-4 text-[#10b981]" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Requires <a href="https://docs.anthropic.com/en/docs/build-with-claude/claude-code" target="_blank" rel="noopener noreferrer" className="text-[#d4a574] hover:underline">Claude Code CLI</a> installed on your computer.
                </p>
              </div>

              {/* Step 2: Paste token */}
              <div>
                <p className="text-sm text-gray-300 mb-2">
                  <span className="font-semibold text-white">Step 2:</span> Paste the token here:
                </p>
                <div className="relative">
                  <input
                    type={showSetupToken ? 'text' : 'password'}
                    value={setupToken}
                    onChange={(e) => { setSetupToken(e.target.value); setAnthropicError(''); }}
                    placeholder="sk-ant-oat01-..."
                    className="w-full px-4 py-3 bg-[#161b22] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d4a574] font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupToken(!showSetupToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                  >
                    {showSetupToken ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Error */}
              {anthropicError && (
                <div className="flex items-center gap-2 text-[#f43f5e] text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {anthropicError}
                </div>
              )}

              {/* Connect button */}
              <button
                onClick={handleAnthropicConnect}
                disabled={isConnecting || !setupToken.trim()}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#d4a574] text-white rounded-xl font-semibold hover:bg-[#c49464] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <AnthropicLogo className="w-5 h-5" />
                    Connect Claude
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {/* Option 3: API Key (existing) */}
      <button
        onClick={() => setAuthMethod('api_key')}
        className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
          authMethod === 'api_key'
            ? 'border-gray-500 bg-gray-500/5'
            : 'border-gray-700/50 bg-[#161b22] hover:border-gray-600'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            authMethod === 'api_key' ? 'bg-gray-500/20' : 'bg-gray-800'
          }`}>
            <Key className={`w-6 h-6 ${authMethod === 'api_key' ? 'text-gray-300' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white">API Key</span>
            </div>
            <p className="text-sm text-gray-400">
              Paste your own API key from any provider (Anthropic, OpenAI, etc.)
            </p>
          </div>
          {authMethod === 'api_key' && (
            <div className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </button>

      {/* API Key Input (existing flow) */}
      {authMethod === 'api_key' && (
        <div className="ml-16 space-y-4">
          {/* Provider selection */}
          <div className="flex gap-2">
            {API_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                  selectedProvider === provider.id
                    ? 'border-[#f43f5e] bg-[#f43f5e]/10 text-white'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {provider.name}
              </button>
            ))}
          </div>

          {/* API Key input */}
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={API_PROVIDERS.find(p => p.id === selectedProvider)?.placeholder || 'Enter API key...'}
              className="w-full px-4 py-3 bg-[#161b22] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#f43f5e] font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Get key link */}
          <p className="text-xs text-gray-500">
            Get your key from{' '}
            {selectedProvider === 'anthropic' ? (
              <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-[#f43f5e] hover:underline">
                console.anthropic.com
              </a>
            ) : (
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[#f43f5e] hover:underline">
                platform.openai.com
              </a>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
