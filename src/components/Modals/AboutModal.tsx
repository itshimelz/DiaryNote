import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Github,
  Globe,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Layers,
  ShieldCheck,
  Info,
} from 'lucide-react';
import {
  CURRENT_VERSION,
  REPO_URL,
  checkForAppUpdates,
  ReleaseInfo,
} from '../../utils/updateChecker';
import { CanvasTheme } from '../../types';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode?: CanvasTheme;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  themeMode = 'dark',
}) => {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<{
    checked: boolean;
    hasUpdate: boolean;
    latestRelease?: ReleaseInfo;
    message?: string;
  }>({ checked: false, hasUpdate: false });

  const isDark = themeMode !== 'light';

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateResult({ checked: false, hasUpdate: false });

    const result = await checkForAppUpdates();
    setCheckingUpdate(false);

    if (result.updateAvailable && result.latestRelease) {
      setUpdateResult({
        checked: true,
        hasUpdate: true,
        latestRelease: result.latestRelease,
        message: `Version ${result.latestRelease.tagName} is available!`,
      });
    } else {
      setUpdateResult({
        checked: true,
        hasUpdate: false,
        message: `You are on the latest version (v${CURRENT_VERSION})!`,
      });
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 transition-all duration-200 animate-in fade-in select-none font-sans ${
        isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-slate-950/40 backdrop-blur-sm'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-md shadow-sm border p-5 overflow-hidden transition-all duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-3 mb-3.5 border-b transition-colors ${
            isDark ? 'border-slate-800' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2">
            <Info className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
            <h2 className="font-bold text-sm tracking-tight">About DiaryNote</h2>
          </div>

          <button
            onClick={onClose}
            className={`p-1 rounded-sm transition-colors ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
            title="Close (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-3 text-xs">
          {/* Main App Title Banner */}
          <div
            className={`p-3 rounded-sm border transition-colors ${
              isDark
                ? 'bg-slate-800/60 border-slate-700/60'
                : 'bg-slate-50 border-slate-200/90'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-sm ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-800'}`}>
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">DiaryNote</h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Canvas Note Taking & Knowledge Graph
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm bg-blue-500/10 text-blue-500 border border-blue-500/20">
                v{CURRENT_VERSION}
              </span>
            </div>
          </div>

          {/* Version & Live Update Checker Card */}
          <div
            className={`p-3 rounded-sm border flex items-center justify-between gap-3 transition-colors ${
              isDark
                ? 'bg-slate-800/60 border-slate-700/60'
                : 'bg-slate-50 border-slate-200/90'
            }`}
          >
            <div>
              <span className={`font-semibold block ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Release Channel
              </span>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                v{CURRENT_VERSION} (Installed)
              </p>
            </div>

            <button
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border font-semibold text-[11px] transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin text-blue-500' : ''}`} />
              <span>{checkingUpdate ? 'Checking...' : 'Check Updates'}</span>
            </button>
          </div>

          {/* Update Check Result Banner */}
          {updateResult.checked && (
            <div
              className={`p-2.5 rounded-sm border flex items-start gap-2 animate-in fade-in transition-colors ${
                updateResult.hasUpdate
                  ? isDark
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                  : isDark
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              {updateResult.hasUpdate ? (
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs">{updateResult.message}</p>
                {updateResult.hasUpdate && updateResult.latestRelease && (
                  <a
                    href={updateResult.latestRelease.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold underline hover:opacity-80"
                  >
                    <span>Download {updateResult.latestRelease.tagName} on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Feature Highlights Overview */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`p-2.5 rounded-sm border transition-colors ${
                isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Infinite Canvas</span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Visual note placement, zoom, and spatial links.
              </p>
            </div>

            <div
              className={`p-2.5 rounded-sm border transition-colors ${
                isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Local Privacy</span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Passcode protection & offline storage.
              </p>
            </div>
          </div>

          {/* Repository & License Details */}
          <div
            className={`p-3 rounded-sm border space-y-2 transition-colors ${
              isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Repository
              </span>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-xs font-semibold text-blue-500 hover:underline"
              >
                <Github className="w-3.5 h-3.5" />
                <span>itshimelz/DiaryNote</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center justify-between">
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                License & Author
              </span>
              <span className={`font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                MIT &copy; itshimelz
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`mt-4 pt-3 border-t flex items-center justify-between transition-colors ${
          isDark ? 'border-slate-800' : 'border-slate-200/80'
        }`}>
          <a
            href={`${REPO_URL}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 text-xs font-semibold hover:underline ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Releases</span>
          </a>

          <button
            onClick={onClose}
            className={`px-3 py-1.5 rounded-sm font-semibold text-xs transition-colors cursor-pointer ${
              isDark
                ? 'bg-white text-slate-900 hover:bg-slate-100'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
