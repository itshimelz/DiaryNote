import React, { useState, useEffect } from 'react';
import {
  SparklesIcon,
  Shield01Icon,
  Alert02Icon,
  Activity01Icon,
  ViewIcon,
  ViewOffIcon,
  Globe02Icon,
  CheckmarkCircle02Icon,
  Key01Icon,
  Loading03Icon,
  RotateLeft01Icon,
  Cancel01Icon,
  CpuIcon,
  CheckmarkBadge01Icon,
} from '@hugeicons/core-free-icons';
import { CanvasTheme, AIProvider, AIProviderProfile, AIModelsCatalog } from '../../types';
import { testAIConnection } from '../../services/ai/aiMergeService';
import { encryptApiKey, decryptApiKey } from '../../utils/aiSecurity';
import {
  getTodayAICount,
  getLastNDaysAIUsage,
  DayUsage,
} from '../../utils/aiUsageTracker';
import {
  getCachedModelsCatalog,
  fetchRemoteModelsCatalog,
  getSuggestedModelsForProvider,
} from '../../services/ai/aiModelsCatalogService';
import { DEFAULT_AI_PROFILES, getProviderProfile } from '../../lib/storage';
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
  aiProviderProfiles?: Record<string, AIProviderProfile>;
  onSaveAISettings: (settings: {
    enableAIServices: boolean;
    aiProvider: AIProvider;
    encryptedApiKey: string;
    apiKeyIv: string;
    customBaseUrl?: string;
    customModelName?: string;
    aiProviderProfiles?: Record<string, AIProviderProfile>;
  }) => void;
  themeMode?: CanvasTheme;
}

const PROVIDER_TABS: { id: AIProvider; label: string }[] = [
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'custom', label: 'Custom / Ollama' },
];

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  enableAIServices,
  aiProvider,
  encryptedApiKey,
  apiKeyIv,
  customBaseUrl,
  customModelName,
  aiProviderProfiles,
  onSaveAISettings,
  themeMode: _themeMode,
}) => {
  const [enabled, setEnabled] = useState(enableAIServices);
  const [activeProvider, setActiveProvider] = useState<AIProvider>(aiProvider || 'gemini');
  const [selectedTab, setSelectedTab] = useState<AIProvider>(aiProvider || 'gemini');

  // Multi-provider profile maps
  const [profiles, setProfiles] = useState<Record<AIProvider, AIProviderProfile>>(() => ({
    gemini: getProviderProfile({ aiProvider, encryptedApiKey, apiKeyIv, customBaseUrl, customModelName, aiProviderProfiles }, 'gemini'),
    openai: getProviderProfile({ aiProvider, encryptedApiKey, apiKeyIv, customBaseUrl, customModelName, aiProviderProfiles }, 'openai'),
    openrouter: getProviderProfile({ aiProvider, encryptedApiKey, apiKeyIv, customBaseUrl, customModelName, aiProviderProfiles }, 'openrouter'),
    custom: getProviderProfile({ aiProvider, encryptedApiKey, apiKeyIv, customBaseUrl, customModelName, aiProviderProfiles }, 'custom'),
  }));

  // Decrypted in-memory raw keys per provider
  const [rawApiKeys, setRawApiKeys] = useState<Record<AIProvider, string>>({
    gemini: '',
    openai: '',
    openrouter: '',
    custom: '',
  });

  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic Catalog state
  const [catalog, setCatalog] = useState<AIModelsCatalog>(() => getCachedModelsCatalog());
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState(false);

  // AI Usage & Activity History State
  const [todayCount, setTodayCount] = useState<number>(() => getTodayAICount());
  const [usageHistory, setUsageHistory] = useState<DayUsage[]>(() => getLastNDaysAIUsage(28));

  // Initialize and decrypt all provider keys on modal open
  useEffect(() => {
    if (!isOpen) return;

    setEnabled(enableAIServices);
    const initialActive = aiProvider || 'gemini';
    setActiveProvider(initialActive);
    setSelectedTab(initialActive);
    setTestResult(null);
    setErrorMessage(null);
    setTodayCount(getTodayAICount());
    setUsageHistory(getLastNDaysAIUsage(28));

    const initialProfiles: Record<AIProvider, AIProviderProfile> = {
      gemini: getProviderProfile({ aiProvider, encryptedApiKey, apiKeyIv, customBaseUrl, customModelName, aiProviderProfiles }, 'gemini'),
      openai: getProviderProfile({ aiProvider, encryptedApiKey, apiKeyIv, customBaseUrl, customModelName, aiProviderProfiles }, 'openai'),
      openrouter: getProviderProfile({ aiProvider, encryptedApiKey, apiKeyIv, customBaseUrl, customModelName, aiProviderProfiles }, 'openrouter'),
      custom: getProviderProfile({ aiProvider, encryptedApiKey, apiKeyIv, customBaseUrl, customModelName, aiProviderProfiles }, 'custom'),
    };
    setProfiles(initialProfiles);

    // Decrypt keys for all providers in parallel
    const providersList: AIProvider[] = ['gemini', 'openai', 'openrouter', 'custom'];
    providersList.forEach(async (p) => {
      const prof = initialProfiles[p];
      if (prof.encryptedApiKey && prof.apiKeyIv) {
        try {
          const dec = await decryptApiKey(prof.encryptedApiKey, prof.apiKeyIv);
          setRawApiKeys((prev) => ({ ...prev, [p]: dec }));
        } catch {
          setRawApiKeys((prev) => ({ ...prev, [p]: '' }));
        }
      } else {
        setRawApiKeys((prev) => ({ ...prev, [p]: '' }));
      }
    });

    // Check remote catalog quietly in background if cache expired
    fetchRemoteModelsCatalog(false).then((cat) => setCatalog(cat));
  }, [
    isOpen,
    enableAIServices,
    aiProvider,
    encryptedApiKey,
    apiKeyIv,
    customBaseUrl,
    customModelName,
    aiProviderProfiles,
  ]);

  // Real-time usage listener
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

  const currentProfile = profiles[selectedTab] || DEFAULT_AI_PROFILES[selectedTab];
  const currentRawKey = rawApiKeys[selectedTab] || '';
  const suggestedModels = getSuggestedModelsForProvider(selectedTab, catalog);

  const handleUpdateCurrentProfile = (updates: Partial<AIProviderProfile>) => {
    setProfiles((prev) => ({
      ...prev,
      [selectedTab]: {
        ...prev[selectedTab],
        ...updates,
      },
    }));
    setTestResult(null);
  };

  const handleRawKeyChange = (value: string) => {
    setRawApiKeys((prev) => ({ ...prev, [selectedTab]: value }));
    setTestResult(null);
  };

  const handleSelectModel = (modelId: string) => {
    handleUpdateCurrentProfile({ activeModel: modelId });
  };

  const handleRemoveHistoryModel = (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = (currentProfile.modelHistory || []).filter((m) => m !== modelId);
    handleUpdateCurrentProfile({ modelHistory: updatedHistory });
  };

  const handleManualRefreshCatalog = async () => {
    setIsRefreshingCatalog(true);
    try {
      const freshCatalog = await fetchRemoteModelsCatalog(true);
      setCatalog(freshCatalog);
    } finally {
      setIsRefreshingCatalog(false);
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    setErrorMessage(null);

    if (selectedTab !== 'custom' && !currentRawKey.trim()) {
      setErrorMessage(`Please enter an API Key for ${PROVIDER_TABS.find((t) => t.id === selectedTab)?.label || selectedTab} to test.`);
      return;
    }

    setIsTesting(true);
    const startTime = performance.now();
    const result = await testAIConnection(
      {
        aiProvider: selectedTab,
        encryptedApiKey: '',
        apiKeyIv: '',
        customBaseUrl: currentProfile.customBaseUrl,
        customModelName: currentProfile.activeModel,
      },
      currentRawKey
    );
    const latency = Math.round(performance.now() - startTime);
    setIsTesting(false);
    setTestResult({ ...result, latencyMs: latency });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate that if enabled, the active provider has credentials or endpoint
    const activeProf = profiles[activeProvider];
    const activeKey = rawApiKeys[activeProvider];

    if (enabled && activeProvider !== 'custom' && !activeKey.trim() && !activeProf.encryptedApiKey) {
      setErrorMessage(`API Key is required for the active provider (${PROVIDER_TABS.find((t) => t.id === activeProvider)?.label}).`);
      return;
    }

    // Encrypt any modified keys across all providers
    const updatedProfiles = { ...profiles };
    for (const p of ['gemini', 'openai', 'openrouter', 'custom'] as AIProvider[]) {
      const raw = rawApiKeys[p];
      let finalEncrypted = profiles[p].encryptedApiKey;
      let finalIv = profiles[p].apiKeyIv;

      if (raw && raw.trim()) {
        const { ciphertext, iv } = await encryptApiKey(raw.trim());
        finalEncrypted = ciphertext;
        finalIv = iv;
      }

      // Add active model to modelHistory if not present
      const model = profiles[p].activeModel?.trim();
      const currentHistory = profiles[p].modelHistory || [];
      const updatedHistory = model && !currentHistory.includes(model)
        ? [model, ...currentHistory].slice(0, 10)
        : currentHistory;

      updatedProfiles[p] = {
        ...profiles[p],
        encryptedApiKey: finalEncrypted,
        apiKeyIv: finalIv,
        modelHistory: updatedHistory,
      };
    }

    const currentActiveProfile = updatedProfiles[activeProvider];

    // ZERO DATA LOSS: Even when enabled is false, all keys and profiles are preserved!
    onSaveAISettings({
      enableAIServices: enabled,
      aiProvider: activeProvider,
      encryptedApiKey: currentActiveProfile.encryptedApiKey,
      apiKeyIv: currentActiveProfile.apiKeyIv,
      customBaseUrl: currentActiveProfile.customBaseUrl,
      customModelName: currentActiveProfile.activeModel,
      aiProviderProfiles: updatedProfiles,
    });

    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-2xl">
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <Icon icon={SparklesIcon} size="md" />
            <span>AI Settings</span>
          </span>
        }
        onClose={onClose}
      />

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <DialogBody className="space-y-4 text-xs max-h-[65vh] overflow-y-auto pr-1">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-2.5 rounded-sm flex items-start gap-2 text-xs border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300">
              <Icon icon={Alert02Icon} size="sm" className="shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Master Enable AI Switch & Privacy Guarantee */}
          <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
            <Switch
              label="Enable AI Services"
              description="Enables note merging and tagging on canvas. Your encrypted keys and models remain saved when disabled."
              checked={enabled}
              onChange={() => setEnabled(!enabled)}
            />
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/60">
              <Icon icon={Shield01Icon} size="xs" className="text-slate-400 dark:text-slate-500 shrink-0" />
              <span>All keys and custom models are encrypted and stored locally on your device.</span>
            </div>
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
                  {activeProvider === 'openrouter' ? 'OpenRouter' : 'Direct API'}
                </Badge>
              </div>

              {/* Progress Bar & Stat Counter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-400">Requests Today</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {todayCount} requests
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

          {/* Provider Tabs Navigation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-xs text-slate-700 dark:text-slate-200">
                Inference Provider
              </label>
              <div className="flex items-center gap-2">
                {activeProvider !== selectedTab && (
                  <button
                    type="button"
                    onClick={() => setActiveProvider(selectedTab)}
                    className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer underline underline-offset-2"
                  >
                    Set as Active
                  </button>
                )}
                <button
                  type="button"
                  title="Check GitHub for latest models"
                  onClick={handleManualRefreshCatalog}
                  disabled={isRefreshingCatalog}
                  className="p-1 rounded-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <Icon
                    icon={RotateLeft01Icon}
                    size="xs"
                    className={isRefreshingCatalog ? 'animate-spin' : ''}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1 p-1 rounded-sm bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              {PROVIDER_TABS.map((tab) => {
                const isTabSelected = selectedTab === tab.id;
                const isActive = activeProvider === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedTab(tab.id);
                      setTestResult(null);
                    }}
                    className={`px-2.5 py-1.5 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isTabSelected
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700/80 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <Icon
                        icon={CheckmarkBadge01Icon}
                        size="xs"
                        className="shrink-0 opacity-80"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Provider Form Fields */}
          <div className="space-y-3.5 p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            {/* API Key Field (Optional for Custom local Ollama) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <Icon icon={Key01Icon} size="xs" className="text-slate-400" />
                  <span>
                    {selectedTab === 'custom' ? 'API Key (Optional for Local Ollama)' : 'API Secret Key'}
                  </span>
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
              <input
                type={showKey ? 'text' : 'password'}
                value={currentRawKey}
                onChange={(e) => handleRawKeyChange(e.target.value)}
                placeholder={
                  selectedTab === 'gemini'
                    ? 'AIzaSy...'
                    : selectedTab === 'openai'
                    ? 'sk-proj-...'
                    : selectedTab === 'openrouter'
                    ? 'sk-or-v1-...'
                    : 'Optional auth token...'
                }
                className="w-full px-3 py-1.5 rounded-sm border outline-none font-mono text-xs transition-colors bg-slate-50/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-500 dark:focus:border-slate-400"
              />
            </div>

            {/* Custom Base URL (For Custom or OpenRouter) */}
            {(selectedTab === 'custom' || selectedTab === 'openrouter') && (
              <div>
                <label className="block font-semibold mb-1 text-xs flex items-center gap-1 text-slate-700 dark:text-slate-200">
                  <Icon icon={Globe02Icon} size="xs" className="text-slate-400" />
                  <span>Custom Endpoint Base URL</span>
                </label>
                <input
                  type="text"
                  value={currentProfile.customBaseUrl || ''}
                  onChange={(e) => handleUpdateCurrentProfile({ customBaseUrl: e.target.value })}
                  placeholder={
                    selectedTab === 'openrouter'
                      ? 'https://openrouter.ai/api/v1'
                      : 'http://localhost:11434/v1 or https://api.deepseek.com/v1'
                  }
                  className="w-full px-3 py-1.5 rounded-sm border outline-none font-mono text-xs transition-colors bg-slate-50/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-500 dark:focus:border-slate-400"
                />
              </div>
            )}

            {/* Active Model Name Input */}
            <div>
              <label className="block font-semibold mb-1 text-xs flex items-center gap-1 text-slate-700 dark:text-slate-200">
                <Icon icon={CpuIcon} size="xs" className="text-slate-400" />
                <span>Active Model Identifier</span>
              </label>
              <input
                type="text"
                value={currentProfile.activeModel}
                onChange={(e) => handleUpdateCurrentProfile({ activeModel: e.target.value })}
                placeholder={
                  suggestedModels.length > 0
                    ? `Enter model identifier (e.g. ${suggestedModels.slice(0, 3).map((m) => m.id).join(', ')})...`
                    : 'Enter model identifier...'
                }
                className="w-full px-3 py-1.5 rounded-sm border outline-none font-mono text-xs transition-colors bg-slate-50/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-500 dark:focus:border-slate-400"
              />

              {/* Suggested Model Chips from GitHub / Bundled Catalog (BORDERLESS & NO SCALE) */}
              {suggestedModels.length > 0 && (
                <div className="mt-2.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1 font-medium">
                    Suggested Models:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedModels.map((sug) => {
                      const isSelected = currentProfile.activeModel === sug.id;
                      return (
                        <button
                          key={sug.id}
                          type="button"
                          onClick={() => handleSelectModel(sug.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                              : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-normal'
                          }`}
                        >
                          <span>{sug.name}</span>
                          {sug.reasoning && (
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded-xs ${
                                isSelected
                                  ? 'bg-slate-800 text-slate-300 dark:bg-slate-200 dark:text-slate-700'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Reasoning
                            </span>
                          )}
                          {sug.recommended && (
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded-xs ${
                                isSelected
                                  ? 'bg-slate-800 text-slate-300 dark:bg-slate-200 dark:text-slate-700'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Fast
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Model History Chips (BORDERLESS & NO SCALE) */}
              {currentProfile.modelHistory && currentProfile.modelHistory.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1 font-medium">
                    Recent History:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentProfile.modelHistory.map((hist) => {
                      const isSelected = currentProfile.activeModel === hist;
                      return (
                        <span
                          key={hist}
                          onClick={() => handleSelectModel(hist)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-mono text-[10px] cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                              : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <span>{hist}</span>
                          <button
                            type="button"
                            title="Remove from history"
                            onClick={(e) => handleRemoveHistoryModel(hist, e)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          >
                            <Icon icon={Cancel01Icon} size="xs" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Connection Test Result Feedback */}
          {testResult && (
            <div
              className={`p-2.5 rounded-sm border flex items-center justify-between text-xs ${
                testResult.success
                  ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  icon={testResult.success ? CheckmarkCircle02Icon : Alert02Icon}
                  size="xs"
                  className={`shrink-0 ${testResult.success ? 'text-slate-700 dark:text-slate-300' : 'text-rose-500'}`}
                />
                <span>{testResult.message}</span>
              </div>
              {testResult.latencyMs !== undefined && (
                <span className="font-mono text-[10px] font-semibold opacity-70">
                  {testResult.latencyMs}ms
                </span>
              )}
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
              disabled={isTesting || (selectedTab !== 'custom' && !currentRawKey.trim())}
              className={isTesting ? '[&>svg]:animate-spin' : ''}
            >
              {isTesting ? 'Testing...' : `Test ${PROVIDER_TABS.find((t) => t.id === selectedTab)?.label}`}
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
