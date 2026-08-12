import React from 'react';
import { Sparkles, ExternalLink, X, Globe, Info, BookOpen } from 'lucide-react';
import { ReleaseInfo, dismissUpdateAlert, CURRENT_VERSION } from '../utils/updateChecker';
import { CanvasTheme } from '../types';

interface UpdateAlertBannerProps {
  release: ReleaseInfo;
  themeMode?: CanvasTheme;
  onDismiss: () => void;
  onOpenAbout?: () => void;
}

export const UpdateAlertBanner: React.FC<UpdateAlertBannerProps> = ({
  release,
  themeMode = 'dark',
  onDismiss,
  onOpenAbout,
}) => {
  const isDark = themeMode !== 'light';

  const handleDismiss = () => {
    dismissUpdateAlert(release.version);
    onDismiss();
  };

  const handleViewRelease = () => {
    window.open(release.htmlUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[99999] max-w-sm w-full animate-in slide-in-from-top-4 duration-200 rounded-md shadow-sm border p-4 overflow-hidden transition-opacity select-none font-sans ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
      role="alert"
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between pb-2.5 mb-3 border-b transition-colors ${
          isDark ? 'border-slate-800' : 'border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <h4 className="font-bold text-sm tracking-tight">New Update Available</h4>
        </div>

        <button
          onClick={handleDismiss}
          className={`p-1 rounded-sm transition-colors ${
            isDark
              ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
          }`}
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content Body - Styled 100% Identically to AboutModal Cards */}
      <div className="space-y-2.5 text-xs">
        {/* App Title & Version Badge Box */}
        <div
          className={`p-2.5 rounded-sm border transition-colors ${
            isDark
              ? 'bg-slate-800/60 border-slate-700/60'
              : 'bg-slate-50 border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded-sm ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-800'}`}>
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div>
                <h5 className="font-bold text-xs leading-tight">DiaryNote</h5>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Update {release.tagName} is now ready
                </p>
              </div>
            </div>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm bg-blue-500/10 text-blue-500 border border-blue-500/20">
              {release.tagName}
            </span>
          </div>
        </div>

        {/* Update Highlight Status Box (Matching AboutModal Status Banner) */}
        <div
          className={`p-2.5 rounded-sm border flex items-start gap-2 animate-in fade-in transition-colors ${
            isDark
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[11px] leading-snug">
              Version {release.tagName} released on GitHub (installed v{CURRENT_VERSION})!
            </p>
          </div>
        </div>
      </div>

      {/* Footer Actions (Matching AboutModal Footer Buttons) */}
      <div
        className={`mt-3 pt-2.5 border-t flex items-center justify-between transition-colors ${
          isDark ? 'border-slate-800' : 'border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-2">
          {onOpenAbout && (
            <button
              onClick={onOpenAbout}
              className={`flex items-center gap-1 text-[11px] font-semibold hover:underline ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Info className="w-3 h-3" />
              <span>About</span>
            </button>
          )}

          <button
            onClick={handleDismiss}
            className={`text-[10px] font-medium transition-colors ${
              isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Remind later
          </button>
        </div>

        <button
          onClick={handleViewRelease}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-sm font-semibold text-xs transition-colors cursor-pointer ${
            isDark
              ? 'bg-white text-slate-900 hover:bg-slate-100'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          <span>View Release</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
