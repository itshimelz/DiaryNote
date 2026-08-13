import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  X,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Globe,
  Cpu,
  Activity,
} from 'lucide-react';
import { CanvasTheme, AIProvider } from '../../types';
import { encryptApiKey, decryptApiKey } from '../../utils/aiSecurity';
import { testAIConnection } from '../../services/ai/aiMergeService';
import { getTodayAICount, getLastNDaysAIUsage, DayUsage } from '../../utils/aiUsageTracker';

interface AISettingsModalProps {
  isOpen: boolean;
  themeMode?: CanvasTheme;
  enableAIServices?: boolean;
  aiProvider?: AIProvider;
  encryptedApiKey?: string;
  apiKeyIv?: string;
  customBaseUrl?: string;
  customModelName?: string;
  onClose: () => void;
  onSaveAISettings: (settings: {
    enableAIServices: boolean;
    aiProvider: AIProvider;
    encryptedApiKey: string;
    apiKeyIv: string;
    customBaseUrl?: string;
    customModelName?: string;
  }) => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  themeMode = 'dark',
  enableAIServices = false,
  aiProvider = 'gemini',
  encryptedApiKey = '',
  apiKeyIv = '',
  customBaseUrl = '',
  customModelName = '',
  onClose,
  onSaveAISettings,
}) => {
  const [enabled, setEnabled] = useState(enableAIServices);
  const [provider, setProvider] = useState<AIProvider>(aiProvider);
  const [rawApiKey, setRawApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState(customBaseUrl);
  const [modelName, setModelName] = useState(customModelName);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [todayCount, setTodayCount] = useState(0);
  const [usageHistory, setUsageHistory] = useState<DayUsage[]>([]);

  const isDark = themeMode !== 'light';

  // Handle ESC key dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load and decrypt initial key when modal opens
  useEffect(() => {
    if (isOpen) {
      setEnabled(enableAIServices);
      setProvider(aiProvider);
      setBaseUrl(customBaseUrl);
      setModelName(customModelName);
      setTestResult(null);
      setErrorMessage(null);
      setTodayCount(getTodayAICount());
      setUsageHistory(getLastNDaysAIUsage(28));

      if (encryptedApiKey && apiKeyIv) {
        decryptApiKey(encryptedApiKey, apiKeyIv).then((key) => {
          setRawApiKey(key);
        });
      } else {
        setRawApiKey('');
      }
    }
  }, [isOpen, enableAIServices, aiProvider, encryptedApiKey, apiKeyIv, customBaseUrl, customModelName]);

  // Listen for real-time usage updates when AI requests complete
  useEffect(() => {
    if (!isOpen) return;
    const handleUsageUpdate = () => {
      setTodayCount(getTodayAICount());
      setUsageHistory(getLastNDaysAIUsage(28));
    };
    window.addEventListener('diarynote_ai_usage_updated', handleUsageUpdate);
    return () => window.removeEventListener('diarynote_ai_usage_updated', handleUsageUpdate);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestResult(null);
    setErrorMessage(null);

    if (!rawApiKey.trim()) {
      setErrorMessage('Please enter an API Key to test connection.');
      return;
    }

    setIsTesting(true);
    const result = await testAIConnection(
      {
        aiProvider: provider,
        encryptedApiKey: '',
        apiKeyIv: '',
        customBaseUrl: baseUrl,
        customModelName: modelName,
      },
      rawApiKey
    );
    setIsTesting(false);
    setTestResult(result);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let finalEncryptedKey = encryptedApiKey;
    let finalIv = apiKeyIv;

    if (rawApiKey.trim()) {
      const { ciphertext, iv } = await encryptApiKey(rawApiKey.trim());
      finalEncryptedKey = ciphertext;
      finalIv = iv;
    } else if (enabled) {
      setErrorMessage('API Key is required when AI Services are enabled.');
      return;
    }

    onSaveAISettings({
      enableAIServices: enabled,
      aiProvider: provider,
      encryptedApiKey: finalEncryptedKey,
      apiKeyIv: finalIv,
      customBaseUrl: baseUrl,
      customModelName: modelName,
    });
    onClose();
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 animate-in fade-in select-none font-sans ${
        isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-slate-950/40 backdrop-blur-sm'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg max-h-[85vh] rounded-md shadow-sm border p-5 flex flex-col gap-3.5 transition-opacity duration-200 overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-3 border-b shrink-0 transition-colors ${
            isDark ? 'border-slate-800' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
            <div>
              <h2 className="font-bold text-sm tracking-tight leading-none">AI Intelligence Settings</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-3 text-xs pr-1">
          {/* Error Alert */}
          {errorMessage && (
            <div
              className={`p-2.5 rounded-sm flex items-start gap-2 text-xs border ${
                isDark ? 'bg-rose-950/40 border-rose-800/60 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Security Notice */}
          <div
            className={`p-3 rounded-sm border flex items-start gap-2.5 ${
              isDark ? 'bg-slate-800/40 border-slate-700/50 text-slate-300' : 'bg-slate-50 border-slate-200/90 text-slate-700'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
            <div>
              <p className={`font-semibold text-[11px] uppercase tracking-wider mb-0.5 ${
                isDark ? 'text-slate-200' : 'text-slate-900'
              }`}>
                Client-Side AES-256-GCM Encrypted
              </p>
              <p className={`leading-relaxed text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Your API key is encrypted at rest in local storage and never leaves your desktop except to contact the configured inference endpoint.
              </p>
            </div>
          </div>

          {/* Toggle Enable AI */}
          <div
            className={`p-3 rounded-sm border flex items-center justify-between transition-colors ${
              isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
            }`}
          >
            <div>
              <span className={`font-semibold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Enable AI Synthesis & Auto-Tagging
              </span>
              <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Unlocks multi-card merging and AI utilities on canvas
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enabled ? (isDark ? 'bg-white' : 'bg-slate-900') : (isDark ? 'bg-slate-700' : 'bg-slate-300')
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                  enabled ? (isDark ? 'bg-slate-900 translate-x-4' : 'bg-white translate-x-4') : 'bg-white translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* AI Usage & Activity Dashboard (28-day Activity Grid) */}
          {enabled && (
            <div
              className={`p-3 rounded-sm border flex flex-col gap-2.5 ${
                isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>Activity Tracker</span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm border ${
                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  {provider === 'openrouter' ? 'Free Tier Quota' : 'Direct API'}
                </span>
              </div>

              {/* Progress Bar & Stat Counter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Requests Today</span>
                  <span className="font-bold">
                    {todayCount} {provider === 'openrouter' ? '/ 50 daily' : 'requests'}
                  </span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div
                    className={`h-full transition-[width] duration-300 rounded-full ${isDark ? 'bg-white' : 'bg-slate-900'}`}
                    style={{ width: `${Math.min(100, Math.max(5, (todayCount / 50) * 100))}%` }}
                  />
                </div>
              </div>

              {/* 28-Day Activity Squares Grid */}
              <div>
                <div className="flex items-center justify-between mb-1 text-[10px] text-slate-500 font-medium">
                  <span>28-Day History</span>
                  <span className="flex items-center gap-1">
                    <span>Less</span>
                    <span className="w-2 h-2 rounded-xs bg-slate-700 inline-block border border-slate-600" />
                    <span className={`w-2 h-2 rounded-xs inline-block ${isDark ? 'bg-slate-500' : 'bg-slate-400'}`} />
                    <span className={`w-2 h-2 rounded-xs inline-block ${isDark ? 'bg-slate-300' : 'bg-slate-600'}`} />
                    <span className={`w-2 h-2 rounded-xs inline-block ${isDark ? 'bg-white' : 'bg-slate-900'}`} />
                    <span>More</span>
                  </span>
                </div>

                <div className="grid grid-cols-14 gap-1">
                  {usageHistory.map((day) => {
                    let bgClass = isDark ? 'bg-slate-800 border-slate-700/60' : 'bg-slate-200 border-slate-300/60';
                    if (day.count > 0 && day.count <= 3) {
                      bgClass = isDark ? 'bg-slate-600 border-slate-500' : 'bg-slate-300 border-slate-400';
                    } else if (day.count > 3 && day.count <= 8) {
                      bgClass = isDark ? 'bg-slate-400 border-slate-300' : 'bg-slate-500 border-slate-600';
                    } else if (day.count > 8) {
                      bgClass = isDark ? 'bg-white border-white' : 'bg-slate-900 border-slate-900';
                    }

                    return (
                      <div
                        key={day.date}
                        className={`w-full h-3.5 rounded-xs border transition-colors hover:opacity-80 cursor-pointer ${bgClass}`}
                        title={`${day.formattedDate}: ${day.count} request${day.count === 1 ? '' : 's'}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <label className={`block font-semibold mb-1 text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              Inference Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as AIProvider);
                setTestResult(null);
              }}
              className={`w-full px-3 py-1.5 rounded-sm border outline-none font-sans transition-colors text-xs ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700 text-white focus:border-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500'
              }`}
            >
              <option value="gemini">Google Gemini API (Recommended - Free Tier)</option>
              <option value="openai">OpenAI API (GPT-4o-mini / GPT-4o)</option>
              <option value="openrouter">OpenRouter (Unified API Gateway)</option>
              <option value="custom">Custom / OpenAI-Compatible (DeepSeek, Qwen, Ollama)</option>
            </select>
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`font-semibold text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                API Secret Key
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className={`text-[11px] flex items-center gap-1 hover:underline cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showKey ? 'Hide' : 'Reveal'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={rawApiKey}
                onChange={(e) => {
                  setRawApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                className={`w-full px-3 py-1.5 rounded-sm border outline-none font-mono text-xs transition-colors ${
                  isDark
                    ? 'bg-slate-800/80 border-slate-700 text-white focus:border-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500'
                }`}
              />
            </div>
          </div>

          {/* Base URL for Custom / OpenRouter Provider */}
          {(provider === 'openrouter' || provider === 'custom') && (
            <div>
              <label className={`block font-semibold mb-1 text-xs flex items-center gap-1.5 ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}>
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                Custom Endpoint Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.deepseek.com'}
                className={`w-full px-3 py-1.5 rounded-sm border outline-none font-mono text-xs transition-colors ${
                  isDark
                    ? 'bg-slate-800/80 border-slate-700 text-white focus:border-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500'
                }`}
              />
            </div>
          )}

          {/* Model Selection for ALL AI Providers */}
          <div>
            <label className={`block font-semibold mb-1 text-xs flex items-center gap-1.5 ${
              isDark ? 'text-slate-200' : 'text-slate-700'
            }`}>
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              Model Architecture
            </label>

            {provider === 'gemini' && (
              <select
                value={['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'].includes(modelName) ? modelName : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setModelName(e.target.value);
                  }
                  setTestResult(null);
                }}
                className={`w-full px-3 py-1.5 rounded-sm border outline-none font-sans text-xs transition-colors mb-1.5 ${
                  isDark
                    ? 'bg-slate-800/80 border-slate-700 text-white focus:border-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500'
                }`}
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended - Free Tier)</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro (High Reasoning)</option>
                <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite (Fast & Lightweight)</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash (Legacy Stable)</option>
                <option value="custom">Enter Custom Model Identifier...</option>
              </select>
            )}

            {provider === 'openai' && (
              <select
                value={['gpt-4o-mini', 'gpt-4o', 'o3-mini'].includes(modelName) ? modelName : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setModelName(e.target.value);
                  }
                  setTestResult(null);
                }}
                className={`w-full px-3 py-1.5 rounded-sm border outline-none font-sans text-xs transition-colors mb-1.5 ${
                  isDark
                    ? 'bg-slate-800/80 border-slate-700 text-white focus:border-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500'
                }`}
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Recommended - Fast & Affordable)</option>
                <option value="gpt-4o">gpt-4o (High Intelligence)</option>
                <option value="o3-mini">o3-mini (Reasoning)</option>
                <option value="custom">Enter Custom Model Identifier...</option>
              </select>
            )}

            {provider === 'openrouter' && (
              <select
                value={['google/gemini-2.5-flash', 'anthropic/claude-3.5-sonnet', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct'].includes(modelName) ? modelName : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setModelName(e.target.value);
                  }
                  setTestResult(null);
                }}
                className={`w-full px-3 py-1.5 rounded-sm border outline-none font-sans text-xs transition-colors mb-1.5 ${
                  isDark
                    ? 'bg-slate-800/80 border-slate-700 text-white focus:border-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500'
                }`}
              >
                <option value="google/gemini-2.5-flash">google/gemini-2.5-flash (Recommended)</option>
                <option value="anthropic/claude-3.5-sonnet">anthropic/claude-3.5-sonnet</option>
                <option value="deepseek/deepseek-chat">deepseek/deepseek-chat</option>
                <option value="meta-llama/llama-3.3-70b-instruct">meta-llama/llama-3.3-70b-instruct</option>
                <option value="custom">Enter Custom Model Identifier...</option>
              </select>
            )}

            {/* Input field for custom model name or custom provider */}
            {(provider === 'custom' || !['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gpt-4o-mini', 'gpt-4o', 'o3-mini', 'google/gemini-2.5-flash', 'anthropic/claude-3.5-sonnet', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct'].includes(modelName)) && (
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder={
                  provider === 'gemini'
                    ? 'gemini-2.5-flash'
                    : provider === 'openai'
                    ? 'gpt-4o-mini'
                    : provider === 'openrouter'
                    ? 'google/gemini-2.5-flash'
                    : 'deepseek-chat'
                }
                className={`w-full px-3 py-1.5 rounded-sm border outline-none font-mono text-xs transition-colors ${
                  isDark
                    ? 'bg-slate-800/80 border-slate-700 text-white focus:border-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-slate-500'
                }`}
              />
            )}
          </div>

          {/* Connection Test Result Feedback */}
          {testResult && (
            <div
              className={`p-2.5 rounded-sm border flex items-center gap-2 text-xs ${
                testResult.success
                  ? isDark ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : isDark ? 'bg-rose-950/40 border-rose-800/60 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div
            className={`flex items-center justify-between pt-3 border-t transition-colors ${
              isDark ? 'border-slate-800' : 'border-slate-200/80'
            }`}
          >
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !rawApiKey.trim()}
              className={`px-3 py-1.5 rounded-sm border font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isDark
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                  : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
              }`}
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-3.5 py-1.5 rounded-sm border font-semibold text-xs transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                    : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-3.5 py-1.5 rounded-sm font-semibold text-xs transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-white text-slate-900 hover:bg-slate-100'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
