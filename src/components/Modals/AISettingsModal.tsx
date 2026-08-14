import React, { useState, useEffect } from 'react';
import {
  SparklesIcon,
  Shield01Icon,
  Alert02Icon,
  Activity01Icon,
  ViewIcon,
  ViewOffIcon,
  Globe02Icon,
  CpuIcon,
  CheckmarkCircle02Icon,
  Key01Icon,
  Loading03Icon,
} from '@hugeicons/core-free-icons';
import { CanvasTheme, AIProvider } from '../../types';
import { testAIConnection } from '../../services/ai/aiMergeService';
import { encryptApiKey, decryptApiKey } from '../../utils/aiSecurity';
import {
  getTodayAICount,
  getLastNDaysAIUsage,
  DayUsage,
} from '../../utils/aiUsageTracker';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Switch,
  Badge,
  Icon,
} from '../ui';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  enableAIServices: boolean;
  aiProvider: AIProvider;
  encryptedApiKey: string;
  apiKeyIv: string;
  customBaseUrl?: string;
  customModelName?: string;
  onSaveAISettings: (settings: {
    enableAIServices: boolean;
    aiProvider: AIProvider;
    encryptedApiKey: string;
    apiKeyIv: string;
    customBaseUrl?: string;
    customModelName?: string;
  }) => void;
  themeMode?: CanvasTheme;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  enableAIServices,
  aiProvider,
  encryptedApiKey,
  apiKeyIv,
  customBaseUrl,
  customModelName,
  onSaveAISettings,
  themeMode: _themeMode,
}) => {
  const [enabled, setEnabled] = useState(enableAIServices);
  const [provider, setProvider] = useState<AIProvider>(aiProvider || 'gemini');
  const [rawApiKey, setRawApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState(customBaseUrl || '');
  const [modelName, setModelName] = useState(customModelName || 'gemini-2.5-flash');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI Usage & Activity History State
  const [todayCount, setTodayCount] = useState<number>(() => getTodayAICount());
  const [usageHistory, setUsageHistory] = useState<DayUsage[]>(() => getLastNDaysAIUsage(28));

  // Initialize and decrypt API key on mount/open
  useEffect(() => {
    if (isOpen) {
      setEnabled(enableAIServices);
      setProvider(aiProvider || 'gemini');
      setBaseUrl(customBaseUrl || '');
      setModelName(
        customModelName ||
          (aiProvider === 'openai'
            ? 'gpt-4o-mini'
            : aiProvider === 'openrouter'
            ? 'google/gemini-2.5-flash'
            : 'gemini-2.5-flash')
      );
      setTestResult(null);
      setErrorMessage(null);
      setTodayCount(getTodayAICount());
      setUsageHistory(getLastNDaysAIUsage(28));

      if (encryptedApiKey && apiKeyIv) {
        decryptApiKey(encryptedApiKey, apiKeyIv)
          .then((key) => setRawApiKey(key))
          .catch(() => {
            setRawApiKey('');
            setErrorMessage('Could not decrypt stored API key. Please re-enter.');
          });
      } else {
        setRawApiKey('');
      }
    }
  }, [
    isOpen,
    enableAIServices,
    aiProvider,
    encryptedApiKey,
    apiKeyIv,
    customBaseUrl,
    customModelName,
  ]);

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

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-2xl">
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <Icon icon={SparklesIcon} size="md" />
            <span>AI Intelligence Settings</span>
          </span>
        }
        onClose={onClose}
      />

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <DialogBody className="space-y-4 text-xs max-h-[65vh] overflow-y-auto pr-2">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-2.5 rounded-sm flex items-start gap-2 text-xs border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300">
              <Icon icon={Alert02Icon} size="sm" className="shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Security Notice */}
          <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-2.5">
            <Icon
              icon={Shield01Icon}
              size="md"
              className="shrink-0 mt-0.5 text-slate-700 dark:text-slate-300"
            />
            <div>
              <p className="font-semibold text-[11px] uppercase tracking-wider mb-0.5 text-slate-900 dark:text-slate-200">
                Client-Side AES-256-GCM Encrypted
              </p>
              <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-400">
                Your API key is encrypted at rest in local storage and never leaves your desktop
                except to contact the configured inference endpoint.
              </p>
            </div>
          </div>

          {/* Toggle Enable AI */}
          <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <Switch
              label="Enable AI Synthesis & Auto-Tagging"
              description="Unlocks multi-card merging and AI utilities on canvas"
              checked={enabled}
              onChange={() => setEnabled(!enabled)}
            />
          </div>

          {/* AI Usage & Activity Dashboard (28-day Activity Grid) */}
          {enabled && (
            <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Icon icon={Activity01Icon} size="xs" className="shrink-0" />
                  <span className="text-slate-800 dark:text-slate-200">Activity Tracker</span>
                </div>
                <Badge variant="subtle" size="xs">
                  {provider === 'openrouter' ? 'Free Tier Quota' : 'Direct API'}
                </Badge>
              </div>

              {/* Progress Bar & Stat Counter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-400">Requests Today</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {todayCount} {provider === 'openrouter' ? '/ 50 daily' : 'requests'}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full transition-[width] duration-300 rounded-full bg-slate-900 dark:bg-white"
                    style={{
                      width: `${Math.min(100, Math.max(5, (todayCount / 50) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* 28-Day Activity Squares Grid */}
              <div>
                <div className="flex items-center justify-between mb-1 text-[10px] text-slate-500 font-medium">
                  <span>28-Day History</span>
                  <span className="flex items-center gap-1">
                    <span>Less</span>
                    <span className="w-2 h-2 rounded-xs bg-slate-300 dark:bg-slate-700 inline-block border border-slate-400 dark:border-slate-600" />
                    <span className="w-2 h-2 rounded-xs inline-block bg-slate-400 dark:bg-slate-500" />
                    <span className="w-2 h-2 rounded-xs inline-block bg-slate-600 dark:bg-slate-300" />
                    <span className="w-2 h-2 rounded-xs inline-block bg-slate-900 dark:bg-white" />
                    <span>More</span>
                  </span>
                </div>

                <div className="grid grid-cols-14 gap-1">
                  {usageHistory.map((day) => {
                    let bgClass =
                      'bg-slate-200 dark:bg-slate-800 border-slate-300/60 dark:border-slate-700/60';
                    if (day.count > 0 && day.count <= 3) {
                      bgClass =
                        'bg-slate-300 dark:bg-slate-600 border-slate-400 dark:border-slate-500';
                    } else if (day.count > 3 && day.count <= 8) {
                      bgClass =
                        'bg-slate-500 dark:bg-slate-400 border-slate-600 dark:border-slate-300';
                    } else if (day.count > 8) {
                      bgClass = 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white';
                    }

                    return (
                      <div
                        key={day.date}
                        className={`w-full h-3.5 rounded-xs border transition-colors hover:opacity-80 cursor-pointer ${bgClass}`}
                        title={`${day.formattedDate}: ${day.count} request${
                          day.count === 1 ? '' : 's'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <label className="block font-semibold mb-1 text-xs text-slate-700 dark:text-slate-200">
              Inference Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as AIProvider);
                setTestResult(null);
              }}
              className="w-full px-3 py-1.5 rounded-sm border outline-none font-sans transition-colors text-xs bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-slate-500"
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
              <label className="font-semibold text-xs text-slate-700 dark:text-slate-200">
                API Secret Key
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] flex items-center gap-1 hover:underline cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <Icon icon={showKey ? ViewOffIcon : ViewIcon} size="xs" />
                <span>{showKey ? 'Hide' : 'Reveal'}</span>
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
                className="w-full px-3 py-1.5 rounded-sm border outline-none font-mono text-xs transition-colors bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-slate-500"
              />
            </div>
          </div>

          {/* Base URL for Custom / OpenRouter Provider */}
          {(provider === 'openrouter' || provider === 'custom') && (
            <div>
              <label className="block font-semibold mb-1 text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <Icon icon={Globe02Icon} size="xs" className="text-slate-400" />
                <span>Custom Endpoint Base URL</span>
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={
                  provider === 'openrouter'
                    ? 'https://openrouter.ai/api/v1'
                    : 'https://api.deepseek.com'
                }
                className="w-full px-3 py-1.5 rounded-sm border outline-none font-mono text-xs transition-colors bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-slate-500"
              />
            </div>
          )}

          {/* Model Selection for ALL AI Providers */}
          <div>
            <label className="block font-semibold mb-1 text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <Icon icon={CpuIcon} size="xs" className="text-slate-400" />
              <span>Model Architecture</span>
            </label>

            {provider === 'gemini' && (
              <select
                value={
                  [
                    'gemini-2.5-flash',
                    'gemini-2.5-pro',
                    'gemini-2.0-flash-lite',
                    'gemini-1.5-flash',
                  ].includes(modelName)
                    ? modelName
                    : 'custom'
                }
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setModelName(e.target.value);
                  }
                  setTestResult(null);
                }}
                className="w-full px-3 py-1.5 rounded-sm border outline-none font-sans text-xs transition-colors mb-1.5 bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-slate-500"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended - Free Tier)</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro (High Reasoning)</option>
                <option value="gemini-2.0-flash-lite">
                  gemini-2.0-flash-lite (Fast & Lightweight)
                </option>
                <option value="gemini-1.5-flash">gemini-1.5-flash (Legacy Stable)</option>
                <option value="custom">Enter Custom Model Identifier...</option>
              </select>
            )}

            {provider === 'openai' && (
              <select
                value={
                  ['gpt-4o-mini', 'gpt-4o', 'o3-mini'].includes(modelName) ? modelName : 'custom'
                }
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setModelName(e.target.value);
                  }
                  setTestResult(null);
                }}
                className="w-full px-3 py-1.5 rounded-sm border outline-none font-sans text-xs transition-colors mb-1.5 bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-slate-500"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Recommended - Fast & Affordable)</option>
                <option value="gpt-4o">gpt-4o (High Intelligence)</option>
                <option value="o3-mini">o3-mini (Reasoning)</option>
                <option value="custom">Enter Custom Model Identifier...</option>
              </select>
            )}

            {provider === 'openrouter' && (
              <select
                value={
                  [
                    'google/gemini-2.5-flash',
                    'anthropic/claude-3.5-sonnet',
                    'deepseek/deepseek-chat',
                    'meta-llama/llama-3.3-70b-instruct',
                  ].includes(modelName)
                    ? modelName
                    : 'custom'
                }
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setModelName(e.target.value);
                  }
                  setTestResult(null);
                }}
                className="w-full px-3 py-1.5 rounded-sm border outline-none font-sans text-xs transition-colors mb-1.5 bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-slate-500"
              >
                <option value="google/gemini-2.5-flash">
                  google/gemini-2.5-flash (Recommended)
                </option>
                <option value="anthropic/claude-3.5-sonnet">anthropic/claude-3.5-sonnet</option>
                <option value="deepseek/deepseek-chat">deepseek/deepseek-chat</option>
                <option value="meta-llama/llama-3.3-70b-instruct">
                  meta-llama/llama-3.3-70b-instruct
                </option>
                <option value="custom">Enter Custom Model Identifier...</option>
              </select>
            )}

            {/* Input field for custom model name or custom provider */}
            {(provider === 'custom' ||
              ![
                'gemini-2.5-flash',
                'gemini-2.5-pro',
                'gemini-2.0-flash-lite',
                'gemini-1.5-flash',
                'gpt-4o-mini',
                'gpt-4o',
                'o3-mini',
                'google/gemini-2.5-flash',
                'anthropic/claude-3.5-sonnet',
                'deepseek/deepseek-chat',
                'meta-llama/llama-3.3-70b-instruct',
              ].includes(modelName)) && (
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
                className="w-full px-3 py-1.5 rounded-sm border outline-none font-mono text-xs transition-colors bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-slate-500"
              />
            )}
          </div>

          {/* Connection Test Result Feedback */}
          {testResult && (
            <div
              className={`p-2.5 rounded-sm border flex items-center gap-2 text-xs ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
              }`}
            >
              <Icon
                icon={testResult.success ? CheckmarkCircle02Icon : Alert02Icon}
                size="xs"
                className={`shrink-0 ${testResult.success ? 'text-emerald-500' : 'text-rose-500'}`}
              />
              <span>{testResult.message}</span>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <div className="w-full flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              icon={isTesting ? Loading03Icon : Key01Icon}
              onClick={handleTestConnection}
              disabled={isTesting || !rawApiKey.trim()}
              className={isTesting ? '[&>svg]:animate-spin' : ''}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="xs" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="xs">
                Save Settings
              </Button>
            </div>
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
