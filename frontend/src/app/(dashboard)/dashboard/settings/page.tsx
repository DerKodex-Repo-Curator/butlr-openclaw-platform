'use client';

import { useState, useEffect } from 'react';
import { Bell, Key, Save, Check, Lock, AlertTriangle, Bot, Trash2, Plus, Loader2, Settings } from 'lucide-react';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import AIConnectionSettings from "@/components/dashboard/AIConnectionSettings";
import { settings as settingsApi } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic (Claude)', placeholder: 'sk-ant-api03-...', icon: '🤖' },
  { id: 'openai', name: 'OpenAI (GPT)', placeholder: 'sk-...', icon: '🧠' },
  { id: 'google', name: 'Google (Gemini)', placeholder: 'AIza...', icon: 'G' },
];

export default function SettingsPage() {
  const [botName, setBotName] = useState('Alfred');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    email_alerts: true,
    weekly_reports: true,
    billing_reminders: true,
    maintenance_alerts: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // BYOK state
  const [isByok, setIsByok] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [byokLoading, setByokLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [byokSaving, setByokSaving] = useState(false);
  const [byokError, setByokError] = useState('');
  const [byokSuccess, setByokSuccess] = useState('');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const token = localStorage.getItem('butlr_token');
        if (!token) return;

        const payload = JSON.parse(atob(token.split('.')[1]));
        const id = payload.customer_id || payload.sub;
        setCustomerId(id ? parseInt(id) : null);

        const response = await fetch(`${API_BASE}/onboarding/config/${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.bot_name) setBotName(data.bot_name);
        }

        // Load BYOK status
        const byokResponse = await fetch(`${API_BASE}/dashboard/byok/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (byokResponse.ok) {
          const byokData = await byokResponse.json();
          setIsByok(byokData.is_byok);
          setConfiguredProviders(byokData.configured_providers || []);
        }
      } catch (e) {
        console.error('Failed to load config:', e);
      } finally {
        setByokLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!customerId) return;
    setSaving(true);
    setSaveMessage('');

    try {
      const token = localStorage.getItem('butlr_token');

      await fetch(`${API_BASE}/onboarding/config/${customerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ bot_name: botName }),
      });

      await settingsApi.update({ bot_name: botName, notifications });

      setSaved(true);
      setSaveMessage('Settings saved.');
      setTimeout(() => {
        setSaved(false);
        setSaveMessage('');
      }, 4000);
    } catch (e) {
      console.error('Failed to save:', e);
      setSaveMessage('Failed to save settings.');
    }

    setSaving(false);
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordSaving(true);
    try {
      const token = localStorage.getItem('butlr_token');
      const response = await fetch(`${API_BASE}/settings/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          current_password: currentPassword || null,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        setPasswordSuccess('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setHasPassword(true);
        setTimeout(() => setPasswordSuccess(''), 5000);
      } else {
        const data = await response.json();
        setPasswordError(data.detail || 'Failed to update password');
      }
    } catch (e) {
      setPasswordError('Failed to update password');
    }
    setPasswordSaving(false);
  };

  const handleByokSave = async () => {
    if (!apiKeyInput.trim()) {
      setByokError('Please enter an API key');
      return;
    }

    setByokSaving(true);
    setByokError('');
    setByokSuccess('');

    try {
      const token = localStorage.getItem('butlr_token');
      const response = await fetch(`${API_BASE}/dashboard/byok/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: selectedProvider,
          api_key: apiKeyInput,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setByokSuccess(data.message);
        setConfiguredProviders([...configuredProviders.filter(p => p !== selectedProvider), selectedProvider]);
        setApiKeyInput('');
        setShowApiKeyInput(false);
        setTimeout(() => setByokSuccess(''), 5000);
      } else {
        const data = await response.json();
        setByokError(data.detail || 'Failed to save API key');
      }
    } catch (e) {
      setByokError('Failed to save API key');
    }
    setByokSaving(false);
  };

  const handleByokDelete = async (provider: string) => {
    if (!confirm(`Remove ${provider} API key?`)) return;

    try {
      const token = localStorage.getItem('butlr_token');
      const response = await fetch(`${API_BASE}/dashboard/byok/api-key/${provider}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setConfiguredProviders(configuredProviders.filter(p => p !== provider));
        setByokSuccess(`${provider} API key removed`);
        setTimeout(() => setByokSuccess(''), 3000);
      }
    } catch (e) {
      setByokError('Failed to remove API key');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-gray-400" />
            Settings
          </h1>
          <p className="text-gray-500 text-sm">Configure your bot and account</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-[#f43f5e] hover:bg-[#e11d48] text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <LoadingSpinner size="sm" />
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm ${
          saveMessage.includes('Failed')
            ? 'bg-red-500/10 border border-red-500/30 text-red-400'
            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
        }`}>
          {saveMessage.includes('Failed') ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {saveMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* AI Connection */}
          <AIConnectionSettings />

          {/* Bot Configuration */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                <Bot className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Bot Configuration</h2>
                <p className="text-xs text-gray-500">Name and identity</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Bot Name</label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Enter bot name"
                  className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#f43f5e]/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Telegram Username</label>
                <div className="px-4 py-2.5 bg-[#0a0f1a] border border-gray-800 rounded-xl text-gray-500 text-sm">
                  @your_butler_bot
                </div>
              </div>

              <p className="text-[11px] text-gray-600">
                Personality is managed via SoulVault — install any soul from the SoulVault page.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* BYOK API Keys */}
          {isByok && (
            <div className="bg-[#111827] border border-[#f43f5e]/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#f43f5e]/10 flex items-center justify-center">
                  <Key className="w-5 h-5 text-[#f43f5e]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Your API Keys</h2>
                  <p className="text-xs text-gray-500">BYOK Plan — Configure your AI providers</p>
                </div>
              </div>

              {byokError && (
                <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {byokError}
                </div>
              )}

              {byokSuccess && (
                <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  {byokSuccess}
                </div>
              )}

              <div className="space-y-2 mb-4">
                {PROVIDERS.map((provider) => {
                  const isConfigured = configuredProviders.includes(provider.id);
                  return (
                    <div
                      key={provider.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                        isConfigured
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-[#0d1117] border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{provider.icon}</span>
                        <div>
                          <p className="text-sm text-white">{provider.name}</p>
                          <p className="text-[11px] text-gray-500">
                            {isConfigured ? '✓ Configured' : 'Not configured'}
                          </p>
                        </div>
                      </div>
                      {isConfigured ? (
                        <button
                          onClick={() => handleByokDelete(provider.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedProvider(provider.id);
                            setShowApiKeyInput(true);
                            setApiKeyInput('');
                          }}
                          className="px-3 py-1.5 bg-[#f43f5e]/10 hover:bg-[#f43f5e]/20 text-[#f43f5e] rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Key
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {showApiKeyInput && (
                <div className="p-4 bg-[#0d1117] rounded-xl border border-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{PROVIDERS.find(p => p.id === selectedProvider)?.icon}</span>
                    <span className="text-sm font-medium text-white">
                      Add {PROVIDERS.find(p => p.id === selectedProvider)?.name} Key
                    </span>
                  </div>

                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={PROVIDERS.find(p => p.id === selectedProvider)?.placeholder}
                    className="w-full px-3 py-2.5 bg-[#0a0f1a] border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#f43f5e]/50 mb-3 font-mono transition-colors"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleByokSave}
                      disabled={byokSaving}
                      className="px-4 py-2 bg-[#f43f5e] hover:bg-[#e11d48] text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {byokSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save Key
                    </button>
                    <button
                      onClick={() => {
                        setShowApiKeyInput(false);
                        setApiKeyInput('');
                      }}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-600 mt-3">
                    Your API key is securely stored on your VM and never leaves your server.
                  </p>
                </div>
              )}

              {configuredProviders.length === 0 && !showApiKeyInput && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <p className="text-sm text-amber-400">
                    No API keys configured yet. Add at least one to use your butler.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Password */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Password</h2>
                <p className="text-xs text-gray-500">For email/password login</p>
              </div>
            </div>

            {passwordError && (
              <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="If you have one"
                  className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#f43f5e]/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#f43f5e]/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Confirm</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#f43f5e]/50 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={passwordSaving || !newPassword || !confirmPassword}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {passwordSaving ? <LoadingSpinner size="sm" /> : <Lock className="w-3.5 h-3.5" />}
                {hasPassword ? 'Change Password' : 'Set Password'}
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Notifications</h2>
                <p className="text-xs text-gray-500">Email preferences</p>
              </div>
            </div>

            <div className="space-y-1">
              {[
                { key: 'email_alerts', label: 'Email Alerts', description: 'Important account events' },
                { key: 'weekly_reports', label: 'Weekly Reports', description: 'Usage summaries' },
                { key: 'billing_reminders', label: 'Billing Reminders', description: 'Before payments' },
                { key: 'maintenance_alerts', label: 'Maintenance', description: 'Scheduled updates' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[#0d1117] cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-sm text-white">{item.label}</p>
                    <p className="text-[11px] text-gray-500">{item.description}</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notifications[item.key as keyof typeof notifications]}
                      onChange={(e) =>
                        setNotifications({ ...notifications, [item.key]: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-[22px] bg-gray-800 rounded-full peer peer-checked:bg-[#f43f5e] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-[18px]"></div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
