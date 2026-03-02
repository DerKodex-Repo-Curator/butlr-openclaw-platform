'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Check, Loader2, Key, AlertCircle, Bot, ExternalLink, Copy, CheckCircle2, Search } from 'lucide-react';
import ButlerLobster from '@/components/landing/ButlerLobster';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';
const SOULVAULT_API = `${API_BASE}/souls/catalog`;

interface SoulItem {
  id: number;
  name: string;
  emoji: string;
  description: string;
  category_id: number;
}

interface SoulCategory {
  id: number;
  name: string;
}

function dicebearUrl(name: string, size = 48) {
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(name)}&size=${size}&backgroundColor=1a1a2e`;
}

const API_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic (Claude)', placeholder: 'sk-ant-api03-...', recommended: true },
  { id: 'openai', name: 'OpenAI (GPT-4)', placeholder: 'sk-...' },
];

function OnboardingSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [step, setStep] = useState(1);
  const [botName, setBotName] = useState('');
  // SoulVault state
  const [souls, setSouls] = useState<SoulItem[]>([]);
  const [categories, setCategories] = useState<SoulCategory[]>([]);
  const [selectedSoul, setSelectedSoul] = useState<SoulItem | null>(null);
  const [soulCategory, setSoulCategory] = useState<number | null>(null);
  const [soulSearch, setSoulSearch] = useState('');
  const [soulsLoading, setSoulsLoading] = useState(false);
  // Legacy compat
  const personality = selectedSoul?.name?.toLowerCase().replace(/\s+/g, '-') || 'friendly';
  const customPersonality = '';
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [onboardingToken, setOnboardingToken] = useState<string | null>(null);
  const [error, setError] = useState('');

  // BYOK specific state
  const [planTier, setPlanTier] = useState<string>('byok');
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Auth method state
  const [authMethod, setAuthMethod] = useState<'oauth_openai' | 'oauth_anthropic' | 'api_key'>('oauth_openai');
  const [setupToken, setSetupToken] = useState('');
  const [isOAuthConnecting, setIsOAuthConnecting] = useState(false);
  const [showCodePaste, setShowCodePaste] = useState(false);
  const [pastedUrl, setPastedUrl] = useState('');
  const [isExchanging, setIsExchanging] = useState(false);

  // Bot selection state
  const [useOwnBot, setUseOwnBot] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [showBotToken, setShowBotToken] = useState(false);
  const [validatedBotUsername, setValidatedBotUsername] = useState('');
  const [assignedBotUsername, setAssignedBotUsername] = useState('');
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [poolAvailable, setPoolAvailable] = useState<number | null>(null);
  const [copiedCommand, setCopiedCommand] = useState(false);

  // Provisioning state (step 4)
  const [provisioningStatus, setProvisioningStatus] = useState<string>('pending');
  const [provisioningStep, setProvisioningStep] = useState<string>('');
  const [provisioningError, setProvisioningError] = useState<string>('');
  const [terminalLogs, setTerminalLogs] = useState<Array<{level: string; message: string; step: string}>>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [vmReady, setVmReady] = useState(false);
  const provisioningPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // VM auth status polling (step 5)
  const [vmAuthComplete, setVmAuthComplete] = useState(false);
  const [vmAuthProvider, setVmAuthProvider] = useState<string>('');
  const authPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-install selected soul after auth completes
  useEffect(() => {
    if (!vmAuthComplete || !selectedSoul || !customerId) return;
    const installSoul = async () => {
      try {
        const token = localStorage.getItem('butlr_token');
        await fetch(`${API_BASE}/souls/install`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify({ soul_id: selectedSoul?.id }),
        });
      } catch (e) {
        console.error('Soul install failed (non-blocking):', e);
      }
    };
    installSoul();
  }, [vmAuthComplete, selectedSoul, customerId]);

  // Steps: 1=Name, 2=Soul (SoulVault), 3=Bot Selection, 4=Confirm+Provision, 5=Connect AI (after VM ready)
  const totalSteps = 5;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (provisioningPollRef.current) clearInterval(provisioningPollRef.current);
      if (wsRef.current) { try { wsRef.current.close(); } catch {} }
      if (authPollRef.current) clearInterval(authPollRef.current);
    };
  }, []);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  useEffect(() => {
    const initSession = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setIsInitializing(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/onboarding/verify-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Failed to verify session');
        }

        const data = await response.json();
        setCustomerId(data.customer_id);
        setOnboardingToken(data.onboarding_token);
        setPlanTier(data.plan_tier || 'byok');
        setIsInitializing(false);

        // Check pool availability
        try {
          const poolRes = await fetch(`${API_BASE}/onboarding/pool-status`);
          if (poolRes.ok) {
            const poolData = await poolRes.json();
            setPoolAvailable(poolData.available);
            // Auto-select own bot if pool is empty
            if (poolData.available === 0) {
              setUseOwnBot(true);
            }
          }
        } catch {
          // Ignore pool check errors
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setIsInitializing(false);
      }
    };

    initSession();
  }, [sessionId]);

  // Load SoulVault catalog
  useEffect(() => {
    const loadSouls = async () => {
      setSoulsLoading(true);
      try {
        const [soulsRes, catsRes] = await Promise.all([
          fetch(`${SOULVAULT_API}?limit=100`),
          fetch(`${API_BASE}/souls/categories`),
        ]);
        if (soulsRes.ok) {
          const data = await soulsRes.json();
          setSouls(data.souls || []);
        }
        if (catsRes.ok) {
          const data = await catsRes.json();
          setCategories(data || []);
        }
      } catch (e) {
        console.error('Failed to load SoulVault:', e);
      } finally {
        setSoulsLoading(false);
      }
    };
    loadSouls();
  }, []);

  const filteredSouls = souls.filter((s) => {
    if (soulCategory && s.category_id !== soulCategory) return false;
    if (soulSearch) {
      const q = soulSearch.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    }
    return true;
  });

  const validateBotToken = async () => {
    if (!botToken.trim()) {
      setError('Please enter your bot token');
      return false;
    }

    setIsValidatingToken(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/onboarding/validate-bot-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: botToken.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid token');
      }

      setValidatedBotUsername(data.bot_username);
      setIsValidatingToken(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate token');
      setIsValidatingToken(false);
      return false;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const startProvisioningPolling = useCallback(() => {
    if (!customerId || !onboardingToken) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/onboarding/status/${customerId}?token=${encodeURIComponent(onboardingToken)}`
        );
        if (!res.ok) return;
        const data = await res.json();

        setProvisioningStatus(data.status);
        setProvisioningStep(data.step || '');

        if (data.status === 'complete') {
          if (provisioningPollRef.current) {
            clearInterval(provisioningPollRef.current);
            provisioningPollRef.current = null;
          }
          // Close terminal WebSocket
          if (wsRef.current) { try { wsRef.current.close(); } catch {} }
          // Capture assigned bot username if returned
          if (data.bot_username) setAssignedBotUsername(data.bot_username);
          // Skip "complete" screen — go directly to step 5
          setVmReady(true);
          setStep(5);
        } else if (data.status === 'error') {
          setProvisioningError(data.error || 'Provisioning failed');
          if (provisioningPollRef.current) {
            clearInterval(provisioningPollRef.current);
            provisioningPollRef.current = null;
          }
        }
      } catch {
        // Ignore transient fetch errors
      }
    };

    // Poll immediately, then every 3 seconds
    poll();
    provisioningPollRef.current = setInterval(poll, 3000);
  }, [customerId, onboardingToken]);

  const handleNext = async () => {
    if (step === 1 && !botName.trim()) {
      setError('Please give your butler a name');
      return;
    }

    if (step === 2 && !selectedSoul) {
      setError('Please select a soul for your butler');
      return;
    }

    // Bot selection step validation
    if (step === 3) {
      if (useOwnBot) {
        const valid = await validateBotToken();
        if (!valid) return;
      }
    }

    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    // Don't allow going back from step 5 (provisioning is done)
    if (step === 5) return;
    // Don't allow going back from step 4 if provisioning has started
    if (step === 4 && provisioningStatus !== 'pending' && provisioningStatus !== '') return;
    setStep(step - 1);
  };

  const handleRetry = async () => {
    if (!customerId || !onboardingToken) return;
    setProvisioningError('');
    setProvisioningStatus('pending');
    setTerminalLogs([]);
    try {
      const res = await fetch(`${API_BASE}/onboarding/retry-provisioning/${customerId}?token=${encodeURIComponent(onboardingToken)}`, {
        method: 'POST',
      });
      if (res.ok) {
        startProvisioningPolling();
      } else {
        const data = await res.json();
        setProvisioningError(data.detail || 'Retry failed');
        setProvisioningStatus('error');
      }
    } catch {
      setProvisioningError('Network error. Please try again.');
      setProvisioningStatus('error');
    }
  };

  const handleSubmit = async () => {
    // handleSubmit is now called at step 4 (confirm) to trigger provisioning
    if (!customerId || !onboardingToken) {
      setError('Session expired. Please start over.');
      return;
    }

    // Soul selection is already validated in handleNext

    setIsLoading(true);
    setError('');

    try {
      // If using own bot, save it first
      if (useOwnBot && validatedBotUsername) {
        const ownBotResponse = await fetch(`${API_BASE}/onboarding/use-own-bot/${customerId}?token=${encodeURIComponent(onboardingToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: botToken.trim(),
            bot_username: validatedBotUsername,
          }),
        });

        if (!ownBotResponse.ok) {
          const data = await ownBotResponse.json();
          throw new Error(data.detail || 'Failed to save bot configuration');
        }
      }

      // Save config (no API key — that happens after VM is ready)
      const configResponse = await fetch(`${API_BASE}/onboarding/config/${customerId}?token=${encodeURIComponent(onboardingToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_name: botName,
          personality: selectedSoul?.name || 'friendly',
          custom_personality: null,
          soul_id: selectedSoul?.id || null,
        }),
      });

      if (!configResponse.ok) {
        throw new Error('Failed to save configuration');
      }

      // Start provisioning
      const provisionResponse = await fetch(`${API_BASE}/onboarding/start-provisioning/${customerId}?token=${encodeURIComponent(onboardingToken)}`, {
        method: 'POST',
      });

      if (!provisionResponse.ok) {
        throw new Error('Failed to start provisioning');
      }

      // Start polling for provisioning status
      setProvisioningStatus('provisioning');
      setTerminalLogs([]);
      startProvisioningPolling();

      // Connect WebSocket for live terminal logs
      try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/api/ws/onboarding/${customerId}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'log') {
              setTerminalLogs(prev => [...prev, { level: data.level || 'info', message: data.message, step: data.step || '' }]);
            }
          } catch {}
        };
        ws.onerror = () => {}; // Terminal is enhancement, not critical
        ws.onclose = () => {};
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  // VM auth handlers for step 5

  const startAuthStatusPolling = useCallback(() => {
    if (!customerId || !onboardingToken) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/onboarding/vm-auth-status/${customerId}?token=${encodeURIComponent(onboardingToken)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.authenticated) {
          setVmAuthComplete(true);
          setVmAuthProvider(data.provider || '');
          if (authPollRef.current) {
            clearInterval(authPollRef.current);
            authPollRef.current = null;
          }
        }
      } catch {
        // Ignore transient errors
      }
    };

    authPollRef.current = setInterval(poll, 3000);
  }, [customerId, onboardingToken]);

  const handleVmOpenAIConnect = async () => {
    if (!customerId || !onboardingToken) return;
    setIsOAuthConnecting(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/onboarding/vm-auth/${customerId}?token=${encodeURIComponent(onboardingToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'openai-codex' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to start OpenAI auth on VM');
      }

      const data = await res.json();
      if (data.auth_url) {
        window.open(data.auth_url, '_blank');
        setShowCodePaste(true);
        startAuthStatusPolling();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start OpenAI connection');
    } finally {
      setIsOAuthConnecting(false);
    }
  };

  const handleCodeExchange = async () => {
    if (!customerId || !onboardingToken || !pastedUrl.trim()) return;
    setIsExchanging(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/onboarding/vm-auth-exchange/${customerId}?token=${encodeURIComponent(onboardingToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_url: pastedUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Token exchange failed');
      }
      setVmAuthComplete(true);
      setVmAuthProvider('openai-codex');
    } catch (err: any) {
      setError(err.message || 'Failed to exchange code');
    } finally {
      setIsExchanging(false);
    }
  };

    const handleVmAnthropicConnect = async () => {
    if (!customerId || !onboardingToken || !setupToken.trim()) return;
    setIsOAuthConnecting(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/onboarding/vm-auth/${customerId}?token=${encodeURIComponent(onboardingToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'anthropic-setup-token', token: setupToken.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to connect Anthropic');
      }

      setVmAuthComplete(true);
      setVmAuthProvider('anthropic');
    } catch (err: any) {
      setError(err.message || 'Failed to connect Anthropic');
    } finally {
      setIsOAuthConnecting(false);
    }
  };

  const handleVmApiKeyConnect = async () => {
    if (!customerId || !onboardingToken || !apiKey.trim()) return;
    setIsOAuthConnecting(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/onboarding/vm-auth/${customerId}?token=${encodeURIComponent(onboardingToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'api-key', provider: selectedProvider, api_key: apiKey.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to save API key');
      }

      setVmAuthComplete(true);
      setVmAuthProvider(selectedProvider);
    } catch (err: any) {
      setError(err.message || 'Failed to save API key');
    } finally {
      setIsOAuthConnecting(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#f43f5e] mx-auto mb-4" />
          <p className="text-gray-400">Setting up your account...</p>
        </div>
      </div>
    );
  }

  if (error && !customerId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-[#111827] border border-red-500/50 rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f43f5e] to-[#fb7185] rounded-xl font-semibold text-white">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const getStepContent = () => {
    // Step 1: Name


    if (step === 1) {
      return (
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#f43f5e]/20 flex items-center justify-center">
              <span className="text-2xl">🦞</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Name your Butler</h1>
              <p className="text-gray-400">Give your AI assistant a name</p>
            </div>
          </div>

          <input
            type="text"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            placeholder="e.g., Jarvis, Alfred, Max..."
            className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-[#f43f5e] transition-colors"
            autoFocus
          />

          <p className="text-sm text-gray-500 mt-3">
            This is how your assistant will introduce itself
          </p>
        </div>
      );
    }

    // Step 2: Soul (SoulVault)
    if (step === 2) {
      return (
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-[#f43f5e]/20 flex items-center justify-center">
              <img src={dicebearUrl('soulvault', 28)} alt="" className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Choose a Soul</h1>
              <p className="text-gray-400">Pick a personality from SoulVault for {botName || 'your butler'}</p>
            </div>
          </div>

          {/* Search + Categories */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={soulSearch}
                onChange={(e) => setSoulSearch(e.target.value)}
                placeholder="Search 978 souls..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#f43f5e]/50 transition-colors"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setSoulCategory(null)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  !soulCategory ? 'bg-[#f43f5e]/20 text-[#fb7185] border border-[#f43f5e]/30' : 'bg-[#0d1117] text-gray-400 border border-gray-800 hover:border-gray-700'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSoulCategory(soulCategory === cat.id ? null : cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    soulCategory === cat.id ? 'bg-[#f43f5e]/20 text-[#fb7185] border border-[#f43f5e]/30' : 'bg-[#0d1117] text-gray-400 border border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Souls Grid */}
          {soulsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[350px] overflow-y-auto pr-1">
              {filteredSouls.slice(0, 50).map((soul) => (
                <button
                  key={soul.id}
                  onClick={() => setSelectedSoul(soul)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    selectedSoul?.id === soul.id
                      ? 'border-[#f43f5e] bg-[#f43f5e]/10'
                      : 'border-gray-800 hover:border-[#f43f5e]/50'
                  }`}
                >
                  <img
                    src={dicebearUrl(soul.name, 40)}
                    alt=""
                    className="w-10 h-10 rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm text-white truncate">{soul.name}</span>
                      {selectedSoul?.id === soul.id && <Check className="w-3.5 h-3.5 text-[#f43f5e] flex-shrink-0" />}
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-1">{soul.description}</p>
                  </div>
                </button>
              ))}
              {filteredSouls.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-500 text-sm">
                  No souls found. Try a different search or category.
                </div>
              )}
            </div>
          )}

          {/* Selected Soul Preview */}
          {selectedSoul && (
            <div className="mt-4 p-3 bg-[#0d1117] rounded-xl border border-[#f43f5e]/20">
              <div className="flex items-center gap-3">
                <img src={dicebearUrl(selectedSoul.name, 36)} alt="" className="w-9 h-9 rounded-lg" />
                <div>
                  <p className="text-sm font-medium text-white">{selectedSoul.name}</p>
                  <p className="text-[11px] text-gray-500">{selectedSoul.description}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Step 3: Bot Selection
    if (step === 3) {
      return (
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Telegram Bot</h1>
              <p className="text-gray-400">How do you want to connect to Telegram?</p>
            </div>
          </div>

          {/* Option 1: Use Pool Bot */}
          <button
            onClick={() => { if (poolAvailable !== 0) { setUseOwnBot(false); setError(''); } }}
            disabled={poolAvailable === 0}
            className={`w-full p-4 rounded-xl border text-left transition-all mb-3 ${
              poolAvailable === 0
                ? 'border-gray-800 opacity-50 cursor-not-allowed'
                : !useOwnBot
                  ? 'border-[#f43f5e] bg-[#f43f5e]/10'
                  : 'border-gray-800 hover:border-[#f43f5e]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <span className="font-semibold text-white">Use a Butlr Bot</span>
                <span className="text-xs px-2 py-0.5 bg-[#10b981]/20 text-[#10b981] rounded-full">Recommended</span>
              </div>
              {!useOwnBot && <Check className="w-5 h-5 text-[#f43f5e]" />}
            </div>
            <p className="text-sm text-gray-400">
              We assign you a ready-to-use Telegram bot instantly. No setup needed.
            </p>
            {poolAvailable !== null && (
              <p className="text-xs text-gray-500 mt-2">
                {poolAvailable > 0 ? `${poolAvailable} bots available` : 'Pool currently empty - please create your own'}
              </p>
            )}
          </button>

          {/* Option 2: Use Own Bot */}
          <button
            onClick={() => { setUseOwnBot(true); setError(''); }}
            className={`w-full p-4 rounded-xl border text-left transition-all ${
              useOwnBot
                ? 'border-[#f43f5e] bg-[#f43f5e]/10'
                : 'border-gray-800 hover:border-[#f43f5e]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <span className="font-semibold text-white">Create Your Own Bot</span>
              </div>
              {useOwnBot && <Check className="w-5 h-5 text-[#f43f5e]" />}
            </div>
            <p className="text-sm text-gray-400">
              Create a custom bot with your own username via Telegram's BotFather.
            </p>
          </button>

          {/* Own Bot Instructions */}
          {useOwnBot && (
            <div className="mt-6 animate-fade-in">
              <div className="bg-blue-500/5 border border-blue-500/30 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
                  <span>📱</span> How to create your Telegram bot
                </h3>
                <ol className="text-sm text-gray-300 space-y-3">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <p>Open Telegram and search for <strong className="text-white">@BotFather</strong></p>
                      <a
                        href="https://t.me/BotFather"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:underline mt-1"
                      >
                        Open BotFather <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <p>Send the command:</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-[#0d1117] px-3 py-1 rounded text-[#f43f5e] font-mono">/newbot</code>
                        <button
                          onClick={() => copyToClipboard('/newbot')}
                          className="text-gray-500 hover:text-white transition-colors"
                        >
                          {copiedCommand ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">3</span>
                    <p>Follow the prompts to set a <strong className="text-white">name</strong> and <strong className="text-white">username</strong> for your bot</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">4</span>
                    <p>BotFather will give you an <strong className="text-white">API token</strong> - copy and paste it below</p>
                  </li>
                </ol>
              </div>

              {/* Token Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Bot Token from BotFather</label>
                <div className="relative">
                  <input
                    type={showBotToken ? 'text' : 'password'}
                    value={botToken}
                    onChange={(e) => { setBotToken(e.target.value); setValidatedBotUsername(''); }}
                    placeholder="123456789:ABCdefGHI..."
                    className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#f43f5e] transition-colors font-mono text-sm pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBotToken(!showBotToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-sm"
                  >
                    {showBotToken ? 'Hide' : 'Show'}
                  </button>
                </div>
                {validatedBotUsername && (
                  <p className="text-sm text-green-400 mt-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Valid! Your bot: @{validatedBotUsername}
                  </p>
                )}
                {isValidatingToken && (
                  <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validating token...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Step 4: Confirm + Provisioning
    if (step === 4) {
      const hasStartedProvisioning = provisioningStatus !== 'pending' && provisioningStatus !== '';

      if (hasStartedProvisioning) {
        // Show provisioning progress
        const stepLabels: Record<string, string> = {
          account: 'Setting up account...',
          vm: 'Creating cloud VM...',
          install: 'Installing AI runtime...',
          configure: 'Configuring bot...',
          complete: 'Complete!',
        };

        return (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f43f5e] to-[#fb7185] flex items-center justify-center mx-auto mb-4">
                {provisioningStatus === 'error' ? (
                  <AlertCircle className="w-8 h-8 text-white" />
                ) : (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {provisioningStatus === 'error' ? 'Setup Failed' : `Setting up ${botName}...`}
              </h1>
              <p className="text-gray-400 text-sm">
                {provisioningStatus === 'error' ? provisioningError : 'This takes about 2-3 minutes. Watch the live progress below.'}
              </p>
              {provisioningStatus === 'error' && (
                <button
                  onClick={handleRetry}
                  className="mt-4 px-6 py-2.5 bg-[#f43f5e] hover:bg-[#e11d48] text-white font-semibold rounded-lg transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>

            {/* Live Terminal */}
            {provisioningStatus !== 'error' && (
              <div className="bg-[#0d1117] border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-gray-800">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#f43f5e]" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs text-gray-500 font-mono ml-2">butlr — provisioning</span>
                </div>
                <div
                  ref={terminalRef}
                  className="p-4 h-[280px] overflow-y-auto font-mono text-sm space-y-1 scroll-smooth"
                >
                  {terminalLogs.length === 0 && (
                    <p className="text-gray-600">Connecting to server...</p>
                  )}
                  {terminalLogs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-gray-600 select-none flex-shrink-0">$</span>
                      <span className={
                        log.level === 'error' ? 'text-red-400' :
                        log.level === 'success' ? 'text-[#10b981]' :
                        log.level === 'warn' ? 'text-yellow-400' :
                        'text-gray-300'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <span className="text-gray-600 select-none">$</span>
                    <span className="w-2 h-4 bg-[#f43f5e] animate-pulse inline-block" />
                  </div>
                </div>
              </div>
            )}

            {/* Progress indicator */}
            {provisioningStatus !== 'error' && (
              <div className="flex items-center justify-center gap-4 mt-4">
                {['account', 'vm', 'install', 'configure'].map((s) => {
                  const steps = ['account', 'vm', 'install', 'configure'];
                  const currentIdx = steps.indexOf(provisioningStep);
                  const stepIdx = steps.indexOf(s);
                  const isDone = stepIdx < currentIdx;
                  const isCurrent = s === provisioningStep;
                  const labels: Record<string, string> = { account: 'Account', vm: 'VM', install: 'Install', configure: 'Configure' };
                  return (
                    <div key={s} className="flex items-center gap-1.5">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-[#f43f5e] animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-700" />
                      )}
                      <span className={`text-xs ${isDone ? 'text-[#10b981]' : isCurrent ? 'text-white' : 'text-gray-600'}`}>
                        {labels[s]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {provisioningStatus === 'error' && (
              <button
                onClick={() => {
                  setProvisioningStatus('pending');
                  setProvisioningError('');
                  setTerminalLogs([]);
                  setIsLoading(false);
                }}
                className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-[#f43f5e] to-[#fb7185] rounded-xl font-semibold text-white"
              >
                Try Again
              </button>
            )}
          </div>
        );
      }

      // Show confirm screen (before provisioning starts)
      return (
        <div className="animate-fade-in text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#f43f5e]/20 to-[#fb7185]/10 flex items-center justify-center mx-auto mb-6">
            <img src={dicebearUrl(selectedSoul?.name || botName, 56)} alt="" className="w-14 h-14 rounded-xl" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Meet {botName}</h1>
          <p className="text-gray-400 mb-6">Your AI assistant is ready to be created</p>

          <div className="bg-[#0d1117] rounded-xl p-4 text-left mb-6">
            <div className="flex items-center gap-3 mb-3">
              <img src={dicebearUrl(selectedSoul?.name || botName, 40)} alt="" className="w-10 h-10 rounded-lg" />
              <div>
                <p className="font-semibold text-white">{botName}</p>
                <p className="text-sm text-gray-400">{selectedSoul?.name || 'Default'} Soul</p>
              </div>
            </div>
            {selectedSoul && (
              <p className="text-xs text-gray-500 mb-4">{selectedSoul.description}</p>
            )}

            {/* Bot Info */}
            <div className="pt-3 border-t border-gray-800">
              <div className="flex items-center gap-2 text-sm">
                <Bot className="w-4 h-4 text-blue-400" />
                <span className="text-gray-400">Telegram Bot:</span>
                <span className="text-white">
                  {useOwnBot ? `@${validatedBotUsername}` : 'Butlr Pool Bot'}
                </span>
                <Check className="w-4 h-4 text-[#10b981] ml-auto" />
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500">This will take 2-3 minutes. You'll connect your AI provider next.</p>
        </div>
      );
    }

    // Step 5: Connect AI (only after VM is ready)
    if (step === 5) {
      const OpenAILogo = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073z" />
        </svg>
      );
      const AnthropicLogo = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.257 0H10.173L16.744 20.48H13.14L11.06 15.14H5.56l-2.08 5.34H0L6.57 3.52zm4.31 8.57L8.31 5.39l-2.57 6.7h5.46z" />
        </svg>
      );

      // Show success if auth is complete
      if (vmAuthComplete) {
        // Determine bot username for Telegram deeplink
        const tgBotUsername = useOwnBot ? validatedBotUsername : assignedBotUsername;

        return (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#34d399] flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">🎉 {botName} is Ready!</h1>
            <p className="text-gray-400 mb-8">
              AI connected via {vmAuthProvider === 'openai-codex' ? 'ChatGPT' : vmAuthProvider === 'anthropic' ? 'Claude' : vmAuthProvider}. Your butler is live and waiting for you.
            </p>

            {/* Send First Message CTA */}
            {tgBotUsername && (
              <a
                href={`https://t.me/${tgBotUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#2AABEE] rounded-xl font-semibold text-white text-lg hover:bg-[#229ED9] transition-colors mb-4 w-full"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Send your first message!
              </a>
            )}

            {/* Suggested first messages */}
            <div className="bg-[#0d1117] rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Try saying:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-gray-600">→</span> &quot;Hey {botName}, what can you do?&quot;
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-gray-600">→</span> &quot;Search the web for latest AI news&quot;
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-gray-600">→</span> &quot;Set a reminder for tomorrow at 9am&quot;
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 bg-[#111827] border border-gray-700 rounded-xl font-medium text-gray-300 hover:text-white hover:border-gray-500 transition-colors w-full"
            >
              Go to Dashboard →
            </button>
          </div>
        );
      }

      return (
        <div className="animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Connect your AI</h1>
            <p className="text-gray-400">Your VM is ready. Now choose how to power your assistant.</p>
          </div>

          <div className="space-y-4">
            {/* Option 1: ChatGPT Plus/Pro */}
            <button onClick={() => setAuthMethod('oauth_openai')}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${authMethod === 'oauth_openai' ? 'border-[#10a37f] bg-[#10a37f]/5' : 'border-gray-700/50 bg-[#161b22] hover:border-gray-600'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${authMethod === 'oauth_openai' ? 'bg-[#10a37f]/20' : 'bg-gray-800'}`}>
                  <OpenAILogo className={`w-6 h-6 ${authMethod === 'oauth_openai' ? 'text-[#10a37f]' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">ChatGPT Plus / Pro</span>
                    <span className="px-2 py-0.5 bg-[#10a37f]/20 text-[#10a37f] text-xs font-bold rounded-full">RECOMMENDED</span>
                  </div>
                  <p className="text-sm text-gray-400">One-click connection. Works with Plus ($20/mo) and Pro ($200/mo).</p>
                </div>
              </div>
            </button>

            {authMethod === 'oauth_openai' && (
              <div className="ml-16 space-y-3">
                {!showCodePaste ? (
                  <div className="space-y-3">
                    <div className="bg-[#10a37f]/10 border border-[#10a37f]/30 rounded-xl p-4">
                      <p className="text-sm text-white font-semibold mb-2">How it works:</p>
                      <ol className="text-sm text-gray-300 space-y-2">
                        <li className="flex gap-2"><span className="text-[#10a37f] font-bold">1.</span> Click the button below to open OpenAI login</li>
                        <li className="flex gap-2"><span className="text-[#10a37f] font-bold">2.</span> Log in with your ChatGPT account</li>
                        <li className="flex gap-2"><span className="text-[#10a37f] font-bold">3.</span> After login, you{"'"}ll see a page that <strong className="text-white">can{"'"}t load</strong> — that{"'"}s normal!</li>
                        <li className="flex gap-2"><span className="text-[#10a37f] font-bold">4.</span> <strong className="text-white">Copy the entire URL</strong> from the address bar and paste it back here</li>
                      </ol>
                    </div>
                    <button onClick={handleVmOpenAIConnect} disabled={isOAuthConnecting}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#10a37f] text-white rounded-xl font-semibold text-lg hover:bg-[#0d8c6d] disabled:opacity-50 transition-all">
                      {isOAuthConnecting ? (<><Loader2 className="w-5 h-5 animate-spin" /> Connecting...</>) : (<><OpenAILogo className="w-5 h-5" /> Continue to OpenAI <ArrowRight className="w-5 h-5" /></>)}
                    </button>
                  </div>
                ) : (
                  <div className="animate-fade-in space-y-3">
                    <div className="bg-[#10a37f]/10 border border-[#10a37f]/30 rounded-xl p-4">
                      <p className="text-sm text-white font-semibold mb-2">Almost there! 🎉</p>
                      <p className="text-sm text-gray-300">Paste the URL from the page that couldn{"'"}t load:</p>
                    </div>
                    <input
                      type="text"
                      value={pastedUrl}
                      onChange={(e) => setPastedUrl(e.target.value)}
                      placeholder="http://localhost:1455/auth/callback?code=..."
                      className="w-full px-4 py-3 bg-[#161b22] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#10a37f] font-mono text-sm"
                    />
                    <button onClick={handleCodeExchange} disabled={isExchanging || !pastedUrl.trim()}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#10a37f] text-white rounded-xl font-semibold hover:bg-[#0d8c6d] disabled:opacity-50 transition-all">
                      {isExchanging ? (<><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>) : (<><Check className="w-5 h-5" /> Complete Connection</>)}
                    </button>
                    <button onClick={() => { setShowCodePaste(false); setPastedUrl(''); }}
                      className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors">
                      Start over
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Option 2: Claude Pro/Max */}
            <button onClick={() => setAuthMethod('oauth_anthropic')}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${authMethod === 'oauth_anthropic' ? 'border-[#d4a574] bg-[#d4a574]/5' : 'border-gray-700/50 bg-[#161b22] hover:border-gray-600'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${authMethod === 'oauth_anthropic' ? 'bg-[#d4a574]/20' : 'bg-gray-800'}`}>
                  <AnthropicLogo className={`w-6 h-6 ${authMethod === 'oauth_anthropic' ? 'text-[#d4a574]' : 'text-gray-400'}`} />
                </div>
                <div>
                  <span className="font-semibold text-white">Claude Pro / Max</span>
                  <p className="text-sm text-gray-400">Connect your Anthropic subscription. Pro ($20/mo) and Max ($100/mo).</p>
                </div>
              </div>
            </button>

            {authMethod === 'oauth_anthropic' && (
              <div className="ml-16 space-y-3">
                <div className="bg-[#0d1117] border border-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-300 mb-2"><span className="font-semibold text-white">Step 1:</span> Run on your computer:</p>
                  <div className="flex items-center gap-2 bg-[#161b22] rounded-lg p-3">
                    <code className="text-[#d4a574] font-mono text-sm flex-1">claude setup-token</code>
                    <button onClick={() => {navigator.clipboard.writeText('claude setup-token'); setCopiedCommand(true); setTimeout(() => setCopiedCommand(false), 2000);}} className="p-1.5 hover:bg-gray-700 rounded">
                      {copiedCommand ? <CheckCircle2 className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-300 mb-2"><span className="font-semibold text-white">Step 2:</span> Paste token:</p>
                  <input type="password" value={setupToken} onChange={(e) => setSetupToken(e.target.value)} placeholder="sk-ant-oat01-..."
                    className="w-full px-4 py-3 bg-[#161b22] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d4a574] font-mono text-sm" />
                </div>
                <button onClick={handleVmAnthropicConnect} disabled={isOAuthConnecting || !setupToken.trim()}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#d4a574] text-white rounded-xl font-semibold hover:bg-[#c49464] disabled:opacity-50 transition-all">
                  {isOAuthConnecting ? (<><Loader2 className="w-5 h-5 animate-spin" /> Connecting...</>) : (<><AnthropicLogo className="w-5 h-5" /> Connect Claude</>)}
                </button>
              </div>
            )}

            {/* Option 3: API Key */}
            <button onClick={() => setAuthMethod('api_key')}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${authMethod === 'api_key' ? 'border-gray-500 bg-gray-500/5' : 'border-gray-700/50 bg-[#161b22] hover:border-gray-600'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${authMethod === 'api_key' ? 'bg-gray-500/20' : 'bg-gray-800'}`}>
                  <Key className={`w-6 h-6 ${authMethod === 'api_key' ? 'text-gray-300' : 'text-gray-500'}`} />
                </div>
                <div>
                  <span className="font-semibold text-white">API Key</span>
                  <p className="text-sm text-gray-400">Paste your own API key from any provider.</p>
                </div>
              </div>
            </button>

            {authMethod === 'api_key' && (
              <div className="ml-16 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {API_PROVIDERS.map((provider) => (
                    <button key={provider.id} onClick={() => setSelectedProvider(provider.id)}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${selectedProvider === provider.id ? 'border-[#f43f5e] bg-[#f43f5e]/10 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                      {provider.name}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input type={showApiKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                    placeholder={API_PROVIDERS.find(p => p.id === selectedProvider)?.placeholder}
                    className="w-full px-4 py-3 bg-[#161b22] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#f43f5e] font-mono text-sm" />
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs">
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Get key from{' '}
                  {selectedProvider === 'anthropic' ? (
                    <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-[#f43f5e] hover:underline">console.anthropic.com</a>
                  ) : (
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[#f43f5e] hover:underline">platform.openai.com</a>
                  )}
                </p>
                <button onClick={handleVmApiKeyConnect} disabled={isOAuthConnecting || !apiKey.trim()}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#f43f5e] to-[#fb7185] text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
                  {isOAuthConnecting ? (<><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>) : (<><Key className="w-5 h-5" /> Save API Key</>)}
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Determine if the "Create" button should show at step 4 (confirm, before provisioning)
  const showCreateButton = step === 4 && (provisioningStatus === 'pending' || provisioningStatus === '');
  // Hide nav buttons during provisioning progress or on step 5
  const showNavButtons = step < 4 || showCreateButton;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <ButlerLobster size={40} animated={false} />
          <span className="text-2xl font-bold text-white">Butlr</span>
        </Link>

        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? 'bg-[#f43f5e] w-8' : s < step ? 'bg-[#f43f5e] w-2' : 'bg-gray-700 w-2'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-sm">
            <Key className="w-3.5 h-3.5" />
            BYOK Plan
          </span>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8">
          {getStepContent()}

          {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}

          {showNavButtons && (
            <div className="flex justify-between mt-8">
              {step > 1 ? (
                <button onClick={handleBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={isValidatingToken}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f43f5e] to-[#fb7185] rounded-xl font-semibold text-white disabled:opacity-50"
                >
                  {isValidatingToken ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : showCreateButton ? (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f43f5e] to-[#fb7185] rounded-xl font-semibold text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create {botName}
                      🦞
                    </>
                  )}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f43f5e]" />
      </div>
    }>
      <OnboardingSetupContent />
    </Suspense>
  );
}
