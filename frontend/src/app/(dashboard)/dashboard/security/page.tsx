'use client';

import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, RefreshCw, Download, CheckCircle, XCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp, Wrench, Bug, Trash2 } from 'lucide-react';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { SettingsSkeleton } from '@/components/dashboard/LoadingSpinner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('butlr_token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

interface CheckDetail {
  name: string;
  status: string;
  message: string;
  fix: string;
  category: string;
}

interface SecurityStatus {
  installed: boolean | null;
  score: number | null;
  grade: string | null;
  checks: { pass: number; warn: number; fail: number };
  details: CheckDetail[];
  message: string;
}

interface SkillFinding {
  skill: string;
  file: string;
  line: number;
  description: string;
  severity: string;
}

interface SkillScanResult {
  success: boolean;
  verdict: string;
  total_findings: number;
  findings: SkillFinding[];
  suspicious_skills: string[];
  raw: string;
}

export default function SecurityPage() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hardening, setHardening] = useState(false);
  const [skillScanning, setSkillScanning] = useState(false);
  const [skillScanResult, setSkillScanResult] = useState<SkillScanResult | null>(null);
  const [uninstalling, setUninstalling] = useState<string | null>(null);
  const [hardenResult, setHardenResult] = useState<{ fixed: string[]; skipped: string[] } | null>(null);
  const [filter, setFilter] = useState<'all' | 'pass' | 'warn' | 'fail'>('all');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/security/status`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        let detail = 'Failed to fetch security status';
        try { const d = await res.json(); detail = d.detail || detail; } catch {}
        setError(detail);
      }
    } catch {
      setError('Could not connect');
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/security/install`, { method: 'POST', headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchStatus();
      } else {
        setError(data.detail || 'Install failed');
      }
    } catch (err: any) {
      setError(err.message || 'Install failed');
    } finally {
      setInstalling(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/security/scan`, { method: 'POST', headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus(prev => prev ? { ...prev, ...data } : data);
      } else {
        setError(data.detail || 'Scan failed');
      }
    } catch (err: any) {
      setError(err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleHarden = async () => {
    if (!confirm('Run auto-hardening? This will apply security fixes to your VM.')) return;
    setHardening(true);
    setError('');
    setHardenResult(null);
    try {
      const res = await fetch(`${API_BASE}/security/harden`, { method: 'POST', headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setHardenResult(data.hardening);
        if (data.scan) setStatus(prev => prev ? { ...prev, ...data.scan } : data.scan);
      } else {
        setError(data.detail || 'Hardening failed');
      }
    } catch (err: any) {
      setError(err.message || 'Hardening failed');
    } finally {
      setHardening(false);
    }
  };

  const handleSkillScan = async () => {
    setSkillScanning(true);
    setError('');
    setSkillScanResult(null);
    try {
      const res = await fetch(`${API_BASE}/security/skill-scan`, { method: 'POST', headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setSkillScanResult(data);
      } else {
        setError(data.detail || 'Skill scan failed');
      }
    } catch (err: any) {
      setError(err.message || 'Skill scan failed');
    } finally {
      setSkillScanning(false);
    }
  };

  const handleUninstallSkill = async (skillName: string) => {
    if (!confirm(`Remove skill "${skillName}" from your VM? This cannot be undone.`)) return;
    setUninstalling(skillName);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/security/uninstall-skill`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ skill_name: skillName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Remove the uninstalled skill from scan results
        setSkillScanResult(prev => {
          if (!prev) return null;
          const newFindings = prev.findings.filter(f => f.skill !== skillName);
          const newSus = prev.suspicious_skills.filter(s => s !== skillName);
          return { ...prev, findings: newFindings, suspicious_skills: newSus, total_findings: newFindings.length };
        });
      } else {
        setError(data.detail || 'Uninstall failed');
      }
    } catch (err: any) {
      setError(err.message || 'Uninstall failed');
    } finally {
      setUninstalling(null);
    }
  };

  const gradeColor = (g: string | null) => {
    if (!g) return 'text-gray-500';
    if (g.startsWith('A')) return 'text-emerald-400';
    if (g === 'B') return 'text-amber-400';
    return 'text-red-400';
  };

  const gradeBg = (g: string | null) => {
    if (!g) return 'bg-gray-500/10 border-gray-700';
    if (g.startsWith('A')) return 'bg-emerald-500/10 border-emerald-500/20';
    if (g === 'B') return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const statusIcon = (s: string) => {
    if (s === 'pass') return <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
    if (s === 'warn') return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
    return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
  };

  const severityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
      medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return styles[severity] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  // Group details by category
  const grouped = (status?.details || []).reduce((acc, d) => {
    const cat = d.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {} as Record<string, CheckDetail[]>);

  const filteredGrouped = Object.entries(grouped).reduce((acc, [cat, checks]) => {
    const filtered = filter === 'all' ? checks : checks.filter(c => c.status === filter);
    if (filtered.length > 0) acc[cat] = filtered;
    return acc;
  }, {} as Record<string, CheckDetail[]>);

  // Group skill findings by skill name
  const findingsBySkill = (skillScanResult?.findings || []).reduce((acc, f) => {
    if (!acc[f.skill]) acc[f.skill] = [];
    acc[f.skill].push(f);
    return acc;
  }, {} as Record<string, SkillFinding[]>);

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" />
            Security
          </h1>
          <p className="text-gray-500 text-sm">ClawShield — automated security hardening for your VM</p>
        </div>
        <a href="https://github.com/lennystepn-hue/clawshield" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-white transition-colors">
          Powered by ClawShield OSS →
        </a>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {/* Not Installed */}
      {status && status.installed === false && (
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Your VM is not hardened</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            ClawShield automatically secures your VM with firewall rules, SSH hardening, and 50+ security checks.
          </p>
          <button onClick={handleInstall} disabled={installing} className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50">
            {installing ? <><Loader2 className="w-5 h-5 animate-spin" /> Installing...</> : <><Download className="w-5 h-5" /> Install & Harden</>}
          </button>
        </div>
      )}

      {/* VM Unreachable */}
      {status && status.installed === null && (
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 text-center">
          <Shield className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">VM Unreachable</h2>
          <p className="text-gray-400 text-sm">{status.message}</p>
          <button onClick={fetchStatus} className="mt-4 text-sm text-[#f43f5e] hover:text-white transition-colors">Retry →</button>
        </div>
      )}

      {/* Installed — Full Dashboard */}
      {status && status.installed === true && (
        <>
          {/* Score + Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            {/* Score Card */}
            <div className={`rounded-2xl border p-6 text-center ${gradeBg(status.grade)}`}>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Security Grade</p>
              <p className={`text-5xl font-bold ${gradeColor(status.grade)}`}>{status.grade || '?'}</p>
              <p className="text-xl font-semibold text-white mt-1">{status.score ?? '?'}/100</p>
            </div>

            {/* Check Counts */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-3">Results</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /><span className="text-sm text-gray-300">Passed</span></div>
                  <span className="text-lg font-bold text-emerald-400">{status.checks.pass}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /><span className="text-sm text-gray-300">Warnings</span></div>
                  <span className="text-lg font-bold text-amber-400">{status.checks.warn}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /><span className="text-sm text-gray-300">Failed</span></div>
                  <span className="text-lg font-bold text-red-400">{status.checks.fail}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 lg:col-span-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-3">Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleScan} disabled={scanning} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#0d1117] border border-gray-700 rounded-xl text-gray-300 text-xs hover:bg-gray-800 transition-colors disabled:opacity-50">
                  {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {scanning ? 'Scanning...' : 'Run Scan'}
                </button>
                <button onClick={handleHarden} disabled={hardening} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
                  {hardening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
                  {hardening ? 'Hardening...' : 'Auto-Harden'}
                </button>
                <button onClick={handleSkillScan} disabled={skillScanning} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#0d1117] border border-gray-700 rounded-xl text-gray-300 text-xs hover:bg-gray-800 transition-colors disabled:opacity-50">
                  {skillScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bug className="w-3.5 h-3.5" />}
                  {skillScanning ? 'Scanning...' : 'Skill Scan'}
                </button>
                <button onClick={handleInstall} disabled={installing} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#0d1117] border border-gray-700 rounded-xl text-gray-300 text-xs hover:bg-gray-800 transition-colors disabled:opacity-50">
                  {installing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {installing ? 'Reinstalling...' : 'Reinstall'}
                </button>
              </div>
            </div>
          </div>

          {/* Harden Result */}
          {hardenResult && (
            <div className="mb-6 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Hardening Complete
              </h3>
              {hardenResult.fixed.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-gray-400 mb-1">Fixed ({hardenResult.fixed.length}):</p>
                  <div className="space-y-0.5">
                    {hardenResult.fixed.map((f, i) => (
                      <p key={i} className="text-xs text-emerald-300 font-mono">{f}</p>
                    ))}
                  </div>
                </div>
              )}
              {hardenResult.skipped.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Skipped ({hardenResult.skipped.length}):</p>
                  <div className="space-y-0.5">
                    {hardenResult.skipped.map((s, i) => (
                      <p key={i} className="text-xs text-gray-500 font-mono">{s}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Skill Scan Results — Structured */}
          {skillScanResult && (
            <div className="mb-6 bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Bug className="w-4 h-4 text-amber-400" /> Skill Scan Results
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{skillScanResult.total_findings} findings</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      skillScanResult.verdict.includes('CLEAN') ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      skillScanResult.verdict.includes('SUSPICIOUS') ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {skillScanResult.verdict}
                    </span>
                  </div>
                </div>
              </div>

              {skillScanResult.findings.length === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">All skills passed security scan</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {Object.entries(findingsBySkill).map(([skillName, findings]) => {
                    const isSus = skillScanResult.suspicious_skills.includes(skillName);
                    const maxSeverity = findings.some(f => f.severity === 'high') ? 'high' : findings.some(f => f.severity === 'medium') ? 'medium' : 'low';
                    return (
                      <div key={skillName} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{skillName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${severityBadge(maxSeverity)}`}>
                              {maxSeverity.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-500">{findings.length} issue{findings.length > 1 ? 's' : ''}</span>
                          </div>
                          {isSus && (
                            <button
                              onClick={() => handleUninstallSkill(skillName)}
                              disabled={uninstalling === skillName}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[11px] font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            >
                              {uninstalling === skillName ? (
                                <><Loader2 className="w-3 h-3 animate-spin" /> Removing...</>
                              ) : (
                                <><Trash2 className="w-3 h-3" /> Uninstall</>
                              )}
                            </button>
                          )}
                        </div>
                        <div className="space-y-1.5 ml-1">
                          {findings.map((finding, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                finding.severity === 'high' ? 'bg-red-400' : finding.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                              }`} />
                              <div className="min-w-0">
                                <span className="text-gray-500 font-mono">{finding.file}:{finding.line}</span>
                                <span className="text-gray-600 mx-1.5">—</span>
                                <span className="text-gray-300">{finding.description}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4">
            {(['all', 'warn', 'fail', 'pass'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f
                    ? f === 'warn' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : f === 'fail' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : f === 'pass' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-[#f43f5e]/20 text-[#fb7185] border border-[#f43f5e]/30'
                    : 'bg-[#111827] text-gray-400 border border-gray-800 hover:border-gray-700'
                }`}
              >
                {f === 'all' ? `All (${status.details?.length || 0})` :
                 f === 'pass' ? `✅ Passed (${status.checks.pass})` :
                 f === 'warn' ? `⚠️ Warnings (${status.checks.warn})` :
                 `❌ Failed (${status.checks.fail})`}
              </button>
            ))}
          </div>

          {/* Check Details by Category */}
          <div className="space-y-3">
            {Object.entries(filteredGrouped).map(([category, checks]) => (
              <div key={category} className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">{category}</span>
                    <span className="text-[10px] text-gray-500">{checks.length} checks</span>
                    <div className="flex gap-1">
                      {checks.filter(c => c.status === 'pass').length > 0 && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] rounded">
                          {checks.filter(c => c.status === 'pass').length} ✓
                        </span>
                      )}
                      {checks.filter(c => c.status === 'warn').length > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] rounded">
                          {checks.filter(c => c.status === 'warn').length} ⚠
                        </span>
                      )}
                      {checks.filter(c => c.status === 'fail').length > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[9px] rounded">
                          {checks.filter(c => c.status === 'fail').length} ✗
                        </span>
                      )}
                    </div>
                  </div>
                  {expandedCategory === category ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </button>

                {expandedCategory === category && (
                  <div className="border-t border-gray-800 divide-y divide-gray-800/50">
                    {checks.map((check, i) => (
                      <div key={i} className="px-4 py-3 hover:bg-gray-800/30 transition-colors">
                        <div className="flex items-start gap-3">
                          {statusIcon(check.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium">{check.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{check.message}</p>
                            {check.fix && (
                              <div className="mt-2 bg-[#0d1117] rounded-lg p-2.5 border border-gray-800">
                                <p className="text-[10px] text-amber-400 font-medium mb-1">💡 Fix:</p>
                                <code className="text-[11px] text-gray-300 font-mono whitespace-pre-wrap break-all">{check.fix}</code>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {Object.keys(filteredGrouped).length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              No checks match the current filter.
            </div>
          )}
        </>
      )}
    </div>
  );
}
