import React, { useState, useEffect } from 'react';
import { Sparkles, KeyRound, ShieldCheck, ShieldAlert, X, Eye, EyeOff, Loader2, CheckCircle2, Globe, Cpu } from 'lucide-react';
import { CanvasTheme, AIProvider } from '../../types';
import { encryptApiKey, decryptApiKey } from '../../utils/aiSecurity';
import { testAIConnection } from '../../services/ai/aiMergeService';

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

  const isDark = themeMode !== 'light';

  // Load and decrypt initial key when modal opens
  useEffect(() => {
    if (isOpen) {
      setEnabled(enableAIServices);
      setProvider(aiProvider);
      setBaseUrl(customBaseUrl);
      setModelName(customModelName);
      setTestResult(null);
      setErrorMessage(null);

      if (encryptedApiKey && apiKeyIv) {
        decryptApiKey(encryptedApiKey, apiKeyIv).then((key) => {
          setRawApiKey(key);
        });
      } else {
        setRawApiKey('');
      }
    }
  }, [isOpen, enableAIServices, aiProvider, encryptedApiKey, apiKeyIv, customBaseUrl, customModelName]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div
        className={`w-full max-w-md rounded-md shadow-sm border p-6 transition-all ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-4 mb-5 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <Sparkles className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            <h2 className="font-bold text-base tracking-tight">AI Feature Settings</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className={`mb-4 p-3 rounded-lg flex items-start gap-2.5 text-xs border ${
            isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
          }`}>
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Security Notice */}
          <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
            isDark ? 'bg-slate-800/60 border-slate-700/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <div>
              <p className={`font-semibold text-[11px] uppercase tracking-wider mb-0.5 ${
                isDark ? 'text-slate-200' : 'text-slate-900'
              }`}>
                Local AES-GCM Encrypted
              </p>
              <p className={`leading-relaxed text-[11px] ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Your API key is encrypted client-side using Web Crypto API. It is stored securely on your desktop/device and never sent to external telemetry servers.
              </p>
            </div>
          </div>

          {/* Toggle Enable AI */}
          <div className={`p-3 rounded-lg border flex items-center justify-between ${
            isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <span className={`font-semibold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Enable AI Services & Features
              </span>
              <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Unlocks Note Merging and AI utilities on canvas
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enabled ? (isDark ? 'bg-amber-500' : 'bg-amber-600') : (isDark ? 'bg-slate-700' : 'bg-slate-300')
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Provider Selection */}
          <div>
            <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as AIProvider);
                setTestResult(null);
              }}
              className={`w-full px-3 py-2 rounded-lg border outline-none font-sans transition-colors ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'
              }`}
            >
              <option value="gemini">Google Gemini API (Recommended - Free Tier)</option>
              <option value="openai">OpenAI API (GPT-4o-mini / GPT-4o)</option>
              <option value="openrouter">OpenRouter (Unified API)</option>
              <option value="custom">Custom / OpenAI-Compatible (DeepSeek, Qwen, Ollama)</option>
            </select>
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                API Key
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className={`text-[11px] flex items-center gap-1 hover:underline ${
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
                className={`w-full px-3 py-2 rounded-lg border outline-none font-mono transition-colors ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'
                }`}
              />
            </div>
          </div>

          {/* Custom Base URL & Model Name for OpenRouter / Custom */}
          {(provider === 'openrouter' || provider === 'custom') && (
            <div className="space-y-3 pt-1">
              <div>
                <label className={`block font-semibold mb-1 flex items-center gap-1.5 ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}>
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Custom Base Endpoint URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.deepseek.com'}
                  className={`w-full px-3 py-2 rounded-lg border outline-none font-mono transition-colors ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 flex items-center gap-1.5 ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}>
                  <Cpu className="w-3.5 h-3.5 text-slate-400" />
                  Model Identifier
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder={provider === 'openrouter' ? 'google/gemini-2.0-flash-001' : 'deepseek-chat'}
                  className={`w-full px-3 py-2 rounded-lg border outline-none font-mono transition-colors ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Connection Test Result Feedback */}
          {testResult && (
            <div className={`p-3 rounded-lg border flex items-center gap-2 text-xs ${
              testResult.success
                ? (isDark ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800')
                : (isDark ? 'bg-rose-950/40 border-rose-800/60 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800')
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-between pt-3 gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !rawApiKey.trim()}
              className={`px-3 py-2 rounded-lg border font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                isDark
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              <span>{isTesting ? 'Testing...' : 'Test Key'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${
                  isDark
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
